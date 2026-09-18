import { clickable, label, visible } from './dom.js';
import { RULES, CATEGORIES, CANDIDATES } from './annoyance-rules.js';

const CONSENT = /\bcookies?\b|\bconsent\b|\btracking technologies\b/i;
const PROTECTED = /\b(checkout|shopping cart|your cart|payment|billing|card number|password|passcode|verification code|two.factor|captcha|unsaved (work|changes)|delete (your |my )?account|log in|sign in|register|create (an |your )?account|verify your email|subscription (expired|expires|cancelled|canceled)|renewal failed|account suspended)\b/i;
const CLOSE = /^(close|dismiss|minimi[sz]e|collapse)( (this|the))?( (banner|popup|pop-up|dialog|modal|offer|promotion|newsletter|subscription prompt|chat|messenger|video|player|survey|window))?$|^hide (this |the )?(banner|popup|pop-up|offer|chat)$|^[×✕✖]$/;
const DECLINE = /^(no[, ]+thanks|no[, ]+thank you|not now|maybe later|continue without (subscribing|signing up)|skip (this |the )?(offer|signup|sign-up|survey))$/;
const CONTROLS = 'button, [role="button"], a[href]';
const elements = (root, selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
function panelVisible(container) {
  return visible(container) || (getComputedStyle(container).display === 'contents' && [...container.querySelectorAll(CONTROLS)].some(visible));
}
function protectedForm(container) {
  return [...container.querySelectorAll('input,iframe')].some(element => visible(element) && (
    element.matches('input[type="password"],input[type="file"],input[autocomplete^="cc-"],input[autocomplete="one-time-code"]') ||
    /password|passcode|card.?number|credit.?card|cvv|cvc|checkout|payment|captcha|stripe\.com|paypal\.com/i.test(
      `${element.getAttribute('name') || ''} ${element.id} ${element.getAttribute('title') || ''} ${element.getAttribute('src') || ''}`
    )
  ));
}
function overlay(container) {
  if (container.matches('dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"]')) return true;
  let element = container;
  for (let depth = 0; element && depth < 3; depth++, element = element.parentElement) {
    if (element.matches('body,main,article,header,footer,nav')) break;
    if (['fixed', 'sticky'].includes(getComputedStyle(element).position)) return true;
  }
  return false;
}
function classify(container, rule) {
  if (!container.isConnected || !panelVisible(container) || container.matches('html,body,main,article,header,footer,nav,button,a,input,label,span,p')) return '';
  const text = (container.innerText || container.textContent || '').trim();
  if (text.length > 10000 || CONSENT.test(text) || PROTECTED.test(text) || protectedForm(container)) return '';
  if ([...container.querySelectorAll('video,audio')].some(media => !media.paused || media.currentTime > 0)) return '';
  if (rule) return (!rule.required || container.querySelector(rule.required)) && rule.context.test(text) ? rule.category : '';
  if (!overlay(container)) return '';
  if (container.matches('.jw-flag-floating,[class*="floating-video" i],[id*="floating-video" i]') && container.querySelector('video')) return 'video';
  const category = CATEGORIES.find(([,pattern]) => pattern.test(text))?.[0] || '';
  // A restored conversation or composer is useful even without a click on this page.
  if (category === 'chat' && container.querySelector('[role="log"],textarea,[contenteditable],input:not([type="hidden"]),[aria-live="polite"], [aria-live="assertive"]')) return '';
  return category;
}
function actionKind(button) {
  if (!clickable(button) || button.hasAttribute('formaction') || button.hasAttribute('download')) return '';
  if (button.closest('a[href],label,summary')) return '';
  if (button.closest('form') && !button.matches('button[type="button"]')) return '';
  const enclosingButton = button.parentElement?.closest('button');
  if (enclosingButton?.form && enclosingButton.type !== 'button') return '';
  if (button.matches('button') && button.form && button.type !== 'button') return '';
  const text = label(button);
  if (CLOSE.test(text)) {
    if (/^(collapse|minimi[sz]e|hide)/.test(text)) return button.getAttribute('aria-expanded') === 'false' ? '' : 'collapsed';
    return 'dismissed';
  }
  return DECLINE.test(text) ? 'dismissed' : '';
}
function fingerprint(container, category, rule) {
  if (rule) return rule.id;
  const title = container.querySelector('h1,h2,h3,[role="heading"]');
  return `generic:${category}:${(title ? label(title) : container.getAttribute('aria-label') || container.id || category).replace(/\d+/g,'#').slice(0,100)}`;
}

export class Promotions {
  constructor(interactions) {
    this.interactions = interactions; this.hidden = new Map(); this.reset();
  }
  reset() {
    this.restore(); this.attempts = new Map(); this.categories = new Map(); this.done = new Set(); this.total = 0;
  }
  restore() {
    for (const [element, previous] of this.hidden) {
      if (element.style.getPropertyValue('display') === 'none' && element.style.getPropertyPriority('display') === 'important') {
        if (previous.value) element.style.setProperty('display', previous.value, previous.priority);
        else element.style.removeProperty('display');
      }
      this.done?.delete(previous.key);
      this.attempts?.delete(previous.key);
      if (this.categories) this.categories.set(previous.category, Math.max(0,(this.categories.get(previous.category)||0)-1));
      this.total = Math.max(0,(this.total||0)-1);
    }
    this.hidden.clear();
  }
  available(key, category) {
    const state = this.attempts.get(key);
    return !this.done.has(key) && this.total < 12 && (this.categories.get(category) || 0) < 4 &&
      (!state || (state.count < 2 && (state.verified || Date.now() - state.at > 4000)));
  }
  find(searchRoots) {
    for (const element of this.hidden.keys()) if (!element.isConnected) this.hidden.delete(element);
    const candidates = new Map();
    const rules = RULES.filter(rule => !rule.hosts || rule.hosts.includes(location.hostname));
    for (const root of searchRoots) {
      for (const rule of rules) {
        const ancestor = root.closest?.(rule.container);
        if (ancestor) candidates.set(ancestor, rule);
        for (const container of elements(root, rule.container)) candidates.set(container, rule);
      }
      let inspected = 0;
      for (const container of elements(root, CANDIDATES)) {
        if (++inspected > 100) break;
        if (!candidates.has(container)) candidates.set(container, null);
      }
    }
    for (const [container, rule] of candidates) {
      if (!rule && [...candidates].some(([known, matched]) => matched && (known.contains(container) || container.contains(known)))) continue;
      if (rule?.id === 'guardian-support' && container.hasAttribute('data-island-status') && container.getAttribute('data-island-status') !== 'hydrated') continue;
      const category = classify(container, rule);
      if (!category) continue;
      const key = fingerprint(container, category, rule);
      if (!this.interactions.permits(container, key, category) || !this.available(key, category)) continue;
      const controls = [...container.querySelectorAll(CONTROLS)];
      if (rule?.control) {
        const button = [...container.querySelectorAll(rule.control)].find(control => rule.controlLabel.test(label(control)) && actionKind(control) === rule.action);
        if (button) return {button, container, category, key, rule, action: rule.action};
        continue;
      }
      for (const pattern of [CLOSE, DECLINE]) {
        const button = controls.find(control => pattern.test(label(control)) && actionKind(control));
        if (button) return {button, container, category, key, rule, action: actionKind(button)};
      }
      // Cosmetic fallback is restricted to a known app banner, never a generic modal.
      if (rule?.hide && ['fixed', 'sticky'].includes(getComputedStyle(container).position) &&
          container.querySelector('a[href*="apps.apple.com/"],a[href*="play.google.com/store/apps/"]')) {
        return {container, category, key, rule, action: 'hidden'};
      }
    }
    return null;
  }
  eligible(choice) {
    const {container, category, rule, button, action, key} = choice;
    return classify(container, rule) === category && this.interactions.permits(container, key, category) && this.available(key, category) &&
      (action === 'hidden' ? rule?.hide && ['fixed','sticky'].includes(getComputedStyle(container).position) :
        container.contains(button) && actionKind(button) === action && (!rule?.controlLabel || rule.controlLabel.test(label(button))));
  }
  act(choice) {
    if (!this.eligible(choice)) return false;
    const {container, key, category, action, button} = choice;
    const state = this.attempts.get(key);
    this.attempts.set(key, {count: (state?.count || 0) + 1, at: Date.now()});
    this.categories.set(category, (this.categories.get(category) || 0) + 1); this.total++;
    if (action === 'hidden') {
      this.hidden.set(container, {key, category, value: container.style.getPropertyValue('display'), priority: container.style.getPropertyPriority('display')});
      container.style.setProperty('display', 'none', 'important');
    } else {
      choice.expandBefore = new Set([...container.querySelectorAll(CONTROLS)].filter(control => clickable(control) && /^expand\b/.test(label(control))));
      button.click();
    }
    return true;
  }
  finished(choice, searchRoots) {
    const {button, container, action, key, category, rule} = choice;
    if (action === 'hidden') return !panelVisible(container);
    if (rule?.successLabel && container.isConnected) {
      return [...container.querySelectorAll(rule.control)].some(control => clickable(control) && rule.successLabel.test(label(control)));
    }
    if (action === 'collapsed' && container.isConnected &&
        (button.getAttribute('aria-expanded') === 'false' || [...container.querySelectorAll(CONTROLS)].some(control => !choice.expandBefore.has(control) && clickable(control) && /^expand( (this|the))?( banner|popup|pop-up|chat)?$/.test(label(control))))) return true;
    if (container.isConnected && panelVisible(container)) return false;
    for (const root of searchRoots) {
      for (const next of elements(root, rule?.container || CANDIDATES)) {
        if (classify(next, rule) === category && fingerprint(next, category, rule) === key) return false;
      }
    }
    return true;
  }
  succeeded(choice) {
    const state = this.attempts.get(choice.key);
    if (state) state.verified = true;
    if (choice.rule) this.done.add(choice.key);
  }
}

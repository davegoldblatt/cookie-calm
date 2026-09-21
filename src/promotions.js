import { clickable, label, visible, roots, structuralContainers } from './dom.js';
import { RULES, CATEGORIES, CANDIDATES } from './annoyance-rules.js';
import { isRegistrationPrompt, REGISTRATION_INTENT, REQUIRED_AUTH } from './registration-prompts.js';
import { PROMOTION_CONTROLS, CLOSE, DECLINE, ADBLOCK_REQUEST } from './promotion-controls.js';

const CONSENT = /\bcookies?\b|\bconsent\b|\btracking technologies\b/i;
const PROTECTED = /\b(checkout|shopping cart|your cart|payment|billing|card number|password|passcode|verification code|two.factor|captcha|unsaved (work|changes)|delete (your |my )?account|verify your email|subscription (expired|expires|cancelled|canceled)|renewal failed|account suspended)\b/i;
const CONTROLS = PROMOTION_CONTROLS;
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
function promptText(container, visibleOnly=false) {
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
  let text='',node,count=0;
  while((node=walker.nextNode()) && count++<300 && text.length<10000) {
    if(visibleOnly && !visible(node.parentElement))continue;
    if(!node.parentElement?.closest('a,button,[role="button"],nav,[role="navigation"],[role="menu"],aside,header,footer,script,style'))text+=' '+node.textContent;
  }
  return text;
}
function adblockAuthRequest(container) {
  const shortSignIn=/^(sign[ -]?in|log[ -]?in|register)$/i;
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
    acceptNode(node) {
      if(node instanceof Element) {
        // Only the incidental short control is exempt. Keep longer instructions,
        // landmarks and hidden text in the veto, regardless of their position.
        if(node.matches('a,button,[role="button"]') && shortSignIn.test(label(node)) &&
            shortSignIn.test((node.textContent || '').trim()))return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let text='',node,count=0;
  while((node=walker.nextNode())) {
    // Exhaustion blocks authorization rather than silently dropping late text.
    if(++count>1000 || text.length>6000)return true;
    text+=' '+node.textContent;
  }
  return REGISTRATION_INTENT.test(text.replace(/\s+/g,' '));
}
function classify(container, rule, structural=false) {
  if (!container.isConnected || !panelVisible(container) || container.matches('html,body,main,article,header,footer,nav,button,a,input,label,span,p')) return '';
  const text = (container.innerText || container.textContent || '').trim();
  if (text.length > 10000 || CONSENT.test(text) || PROTECTED.test(text) || protectedForm(container)) return '';
  if(structural && container.closest('nav,[role="navigation"],[role="menu"],aside'))return '';
  const evidence=structural?promptText(container):text;
  // An optional ad-support request can include a secondary Sign in control.
  // Require independent request text and refuse actual forms or authentication.
  const requestText=!rule && ADBLOCK_REQUEST.test(text)?promptText(container,true):'';
  const adblockRequest=!rule && ADBLOCK_REQUEST.test(requestText);
  const optionalAdblock=adblockRequest && text.length<3000 &&
    !adblockAuthRequest(container) && !REQUIRED_AUTH.test(container.textContent || '') &&
    !container.closest('form') && !container.querySelector('form,input,textarea,select,[contenteditable],iframe');
  if (adblockRequest && !optionalAdblock) return '';
  const registration = !rule && isRegistrationPrompt(container, evidence, overlay(container));
  if (REGISTRATION_INTENT.test(text) && !registration && !optionalAdblock) return '';
  if ([...container.querySelectorAll('video,audio')].some(media => !media.paused || media.currentTime > 0)) return '';
  if (rule) return (!rule.required || container.querySelector(rule.required)) && rule.context.test(text) ? rule.category : '';
  if (registration) return 'registration';
  if (!overlay(container)) return '';
  if (optionalAdblock) return 'adblock';
  if (container.matches('.jw-flag-floating,[class*="floating-video" i],[id*="floating-video" i]') && container.querySelector('video')) return 'video';
  const category = CATEGORIES.find(([,pattern]) => pattern.test(evidence))?.[0] || '';
  if (['registration','adblock'].includes(category)) return ''; // Independent invitation/request evidence is mandatory.
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
function adblockControl(container, control) {
  // A nested dialog or section owns its controls. Its dismissal cannot serve as
  // the outer request's dismissal without independent request evidence there.
  const boundary=control.closest('dialog,[role="dialog"],[role="alertdialog"],[aria-modal="true"],section,article,aside,nav,form');
  return !boundary || !container.contains(boundary) || boundary===container || ADBLOCK_REQUEST.test(promptText(boundary,true));
}
function adblockChoice(container) {
  const safe=[...container.querySelectorAll(CONTROLS)].filter(control=>adblockControl(container,control) && actionKind(control));
  const declines=safe.filter(control=>DECLINE.test(label(control)));
  const choices=declines.length?declines:safe.filter(control=>CLOSE.test(label(control)));
  return choices.length===1?choices[0]:null;
}
function fingerprint(container, category, rule) {
  if (rule) return rule.id;
  const title = container.querySelector('h1,h2,h3,[role="heading"]');
  return `generic:${category}:${(title ? label(title) : container.getAttribute('aria-label') || container.id || category).replace(/\d+/g,'#').slice(0,100)}`;
}

export class Promotions {
  constructor(interactions) {
    this.interactions = interactions; this.hidden = new Map(); this.structural=new WeakSet(); this.reset();
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
      for(const container of structuralContainers(root)) {
        if(!candidates.has(container) && !this.interactions.openedByUser(container)) {
          candidates.set(container,null);this.structural.add(container);
        }
      }
    }
    for (const [container, rule] of candidates) {
      if (!rule && [...candidates].some(([known, matched]) => matched && (known.contains(container) || container.contains(known)))) continue;
      if (rule?.id === 'guardian-support' && container.hasAttribute('data-island-status') && container.getAttribute('data-island-status') !== 'hydrated') continue;
      const category = classify(container, rule, this.structural.has(container));
      if (!category) continue;
      const key = fingerprint(container, category, rule);
      if (!this.interactions.permits(container, key, category) || !this.available(key, category)) continue;
      const controls = [...container.querySelectorAll(CONTROLS)];
      if (rule?.control) {
        const button = [...container.querySelectorAll(rule.control)].find(control => rule.controlLabel.test(label(control)) && actionKind(control) === rule.action);
        if (button) return {button, container, category, key, rule, action: rule.action};
        continue;
      }
      if (category==='adblock') {
        // Prefer the explicit refusal to an unrelated Close. Ambiguity stops.
        const button=adblockChoice(container);
        if(button)return {button,container,category,key,rule,action:actionKind(button)};
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
    return classify(container, rule, this.structural.has(container)) === category && this.interactions.permits(container, key, category) && this.available(key, category) &&
      (category!=='adblock' || adblockChoice(container)===button) &&
      (action === 'hidden' ? rule?.hide && ['fixed','sticky'].includes(getComputedStyle(container).position) :
        container.contains(button) && actionKind(button) === action && (!rule?.controlLabel || rule.controlLabel.test(label(button))));
  }
  act(choice) {
    if (choice.action!=='hidden' || !this.eligible(choice)) return false;
    const {container, key, category} = choice;
    const state = this.attempts.get(key);
    this.attempts.set(key, {count: (state?.count || 0) + 1, at: Date.now()});
    this.categories.set(category, (this.categories.get(category) || 0) + 1); this.total++;
    this.hidden.set(container, {key, category, value: container.style.getPropertyValue('display'), priority: container.style.getPropertyPriority('display')});
    container.style.setProperty('display', 'none', 'important');
    return true;
  }
  prompt(choice) {
    let activated=false;
    return {
      id:'promotion', category:choice.category,
      observe:()=>{
        if (activated) return {stage:this.finished(choice,roots())?'absent':'pending'};
        if (!this.eligible(choice)) return {stage:'blocked'};
        return {stage:'dismiss',root:choice.container,dismiss:{element:choice.button,target:choice.button}};
      },
      activated:()=>{
        const {key,category,container}=choice;
        const state=this.attempts.get(key);
        this.attempts.set(key,{count:(state?.count||0)+1,at:Date.now()});
        this.categories.set(category,(this.categories.get(category)||0)+1);this.total++;
        choice.expandBefore=new Set([...container.querySelectorAll(CONTROLS)].filter(control=>clickable(control)&&/^expand\b/.test(label(control))));
        activated=true;
      }
    };
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
      for (const next of new Set([...elements(root, rule?.container || CANDIDATES),...(!rule?structuralContainers(root):[])])) {
        if (classify(next, rule, this.structural.has(container)) === category && fingerprint(next, category, rule) === key) return false;
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

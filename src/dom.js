import { PROMOTION_CONTROLS, CLOSE, DECLINE } from './promotion-controls.js';

export function visible(element) {
  if (!element?.isConnected || element.closest('[inert], [aria-hidden="true"]')) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' &&
    element.getClientRects().length > 0 && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
}

export function label(element) {
  const root=element.getRootNode();
  const labelled=(element.getAttribute('aria-labelledby') || '').trim().split(/\s+/).slice(0,8)
    .map(id=>root.getElementById?.(id)?.textContent || '').join(' ').trim();
  return (element.getAttribute('aria-label') || labelled || element.innerText || element.value || element.getAttribute('title') || element.textContent || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!»]+$/, '').trim();
}

export const REJECT = /^(reject( (all|optional|non-essential|additional))?( cookies)?|decline( all)?( cookies)?|deny( all)?( cookies)?|refuse( all)?( cookies)?|do not accept|continue without accepting|use (only )?(necessary|essential) cookies|only (necessary|essential)( cookies)?|accept (only )?(necessary|essential)( cookies)?|necessary( cookies)? only|essential( cookies)? only|tout refuser|refuser( tout)?|continuer sans accepter|alle ablehnen|ablehnen|nur notwendige( cookies)?|rechazar( todas| todo)?|solo necesarias|rifiuta( tutti)?|alle weigeren|weigeren|rejeitar( todos)?|afvis alle|avvisa alla|hylkaa kaikki|odrzuc wszystkie)$/;
export const ACCEPT = /^(accept( all)?( cookies)?|allow( all)?( cookies)?|agree( to all)?|i agree|got it|ok(ay)?|tout accepter|accepter( tout)?|alle akzeptieren|akzeptieren|aceptar( todas| todo)?|accetta( tutti)?|alles accepteren|aceitar( todos)?)$/;
const ACCEPT_ALL = /^(accept all|allow all|agree to all|tout accepter|accepter tout|alle akzeptieren|aceptar tod[oa]s?|accetta tutti|alles accepteren|aceitar todos)( cookies)?$/;

export function grantsAll(element) {
  return ACCEPT_ALL.test(label(element)) || element.matches([
    '#onetrust-accept-btn-handler', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#didomi-notice-agree-button', '[data-testid="uc-accept-all-button"]',
    '#accept-recommended-btn-handler', '.cmplz-accept'
  ].join(','));
}

export function clickable(element) {
  if (!visible(element) || element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
  // Rule actions can click custom switches and labels. Navigation to an unrelated page is never a fallback.
  if (element.matches('a[href]')) {
    const href = element.getAttribute('href').trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) return false;
  }
  return true;
}

// Bounded discovery around controls. Classification and action authorization are
// separate; a fixed container or a Close label alone never permits dismissal.
export function structuralContainers(root) {
  const found=new Set();
  const selector=PROMOTION_CONTROLS;
  const controls=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)].slice(0,160);
  for(const control of controls) {
    if(!CLOSE.test(label(control)) && !DECLINE.test(label(control)))continue;
    if(!visible(control))continue;
    for(let node=control.parentElement,depth=0;node && depth<10;node=node.parentElement,depth++) {
      if(node.matches('html,body,main,article,nav,header,footer'))break;
      if(node.matches('dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"]') ||
          ['fixed','sticky'].includes(getComputedStyle(node).position)) {found.add(node);break;}
    }
    if(found.size>=40)break;
  }
  return [...found];
}

const CANDIDATES = [
  '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]',
  '[id*="cookie" i]', '[class*="cookie" i]', '[id*="consent" i]', '[class*="consent" i]',
  '[id*="gdpr" i]', '[class*="gdpr" i]'
].join(',');
const COOKIE_CONTEXT = /\bcookies?\b|\btracking technologies\b|\btracking consent\b|\bdatenschutz\b|\bconfidentialite\b|\bdataskydd\b/;

let cachedRoots;
export function invalidateRoots() { cachedRoots = null; }
export function discoverRoots(nodes) {
  if (!cachedRoots) return;
  const visit = root => {
    const inspect = node => {
      if (!(node instanceof HTMLElement)) return;
      const shadow = node.shadowRoot || chrome.dom?.openOrClosedShadowRoot?.(node);
      if (shadow && cachedRoots.length < 60 && !cachedRoots.includes(shadow)) { cachedRoots.push(shadow); visit(shadow); }
    };
    inspect(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) inspect(node);
  };
  for (const node of nodes) if (node instanceof Element && node.isConnected) visit(node);
}
export function roots() {
  if (cachedRoots) return cachedRoots.filter(root => root === document || root.host.isConnected);
  const result = [document];
  // Traverse open roots and Chromium's extension-only closed-root accessor.
  for (let index = 0; index < result.length && index < 60; index++) {
    const walker = document.createTreeWalker(result[index], NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const shadow = node.shadowRoot || (node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node));
      if (shadow) result.push(shadow);
    }
  }
  cachedRoots = result;
  return result;
}

export function banners(searchRoots) {
  const found = new Set();
  for (const root of searchRoots) {
    for (const element of root.querySelectorAll(CANDIDATES)) {
      if (found.size >= 60) break;
      if (element.matches('html, body, button, a, input, label, span, p') || !visible(element)) continue;
      const text = label(element);
      if (text.length > 16000 || !COOKIE_CONTEXT.test(text)) continue;
      // A cookie article, policy page, checkout form, or account dialog is not a banner.
      if (element.querySelector('input[type="password"], input[type="email"], input[autocomplete="cc-number"]')) continue;
      const positioned = ['fixed', 'sticky'].includes(getComputedStyle(element).position);
      const dialog = element.matches('[role="dialog"], [role="alertdialog"], [aria-modal="true"]');
      const named = /cookie[-_ ]?(banner|notice|dialog|consent)|consent[-_ ]?(banner|notice|dialog)|onetrust|cybot|didomi/i.test(element.id + ' ' + element.className);
      if (!positioned && !dialog && !named) continue;
      if (element.querySelector('button, [role="button"], input[type="button"], input[type="submit"], a')) found.add(element);
    }
  }
  return [...found];
}

export function findChoice(containers, kind, skipped = new WeakSet()) {
  const pattern = kind === 'reject' ? REJECT : kind === 'acknowledge' ? /^hide (this |cookie )?message$/ : ACCEPT;
  for (const container of containers) {
    if (kind === 'acknowledge' && !/\b(rejected|saved|set your cookie preferences)\b/i.test(container.innerText)) continue;
    for (const button of container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a')) {
      if (!skipped.has(button) && clickable(button) && pattern.test(label(button))) return { button, container };
    }
  }
  return null;
}

import {clickable, label, visible, ACCEPT_CONTROLS} from './dom.js';
import {TEASER_CLOSE} from './promotion-controls.js';

const OFFER = /^(?:(?:get |save )?\d{1,2}% off|save \d{1,2}%|(?:get )?[$£€]\d{1,3} off|special offer|exclusive offer|discount|coupon|promo code)$/;
const normalize = text => text.toLowerCase().replace(/\s+/g,' ').trim();

// Obstruction evidence is weaker than action permission. Changed instructions
// or a new position cannot turn a replacement teaser into verified absence.
export function teaserSurface(container) {
  if (!['fixed','sticky'].includes(getComputedStyle(container).position)) return false;
  return [...container.querySelectorAll('button')].slice(0,80).some(button=>TEASER_CLOSE.test(label(button)));
}

// A teaser is an opener plus a separate native dismissal. Control text can
// establish its purpose only under this complete, bounded component contract.
// It does not authorize opening the offer, filling its form, or hiding it.
export function offerTeaser(container) {
  if (!['fixed','sticky'].includes(getComputedStyle(container).position) ||
      container.closest('form,button,a,[role="button"],nav,aside,[role="navigation"],[role="menu"]') ||
      container.querySelector('form,input,textarea,select,iframe,[contenteditable],video,audio,a[href],main,article,nav,aside,script,style')) return null;
  const nodes=[container,...container.querySelectorAll('*')];
  if (nodes.length>80 || typeof chrome.dom?.openOrClosedShadowRoot!=='function') return null;
  if (nodes.some(node=>node instanceof HTMLElement && chrome.dom.openOrClosedShadowRoot(node))) return null;
  if (nodes.some(node=>node.matches(ACCEPT_CONTROLS))) return null;
  if (nodes.some(node=>['alt','aria-description','aria-describedby','aria-details','aria-labelledby']
    .some(name=>Boolean(node.getAttribute(name)?.trim())))) return null;
  if (nodes.some(node=>node.hasAttribute('aria-checked') || node.hasAttribute('aria-selected') ||
      node.hasAttribute('role') && !['button','none','presentation','img'].includes(node.getAttribute('role')))) return null;
  if (nodes.some(node=>['::before','::after'].some(pseudo=>
    !['none','normal','""',"''"].includes(getComputedStyle(node,pseudo).content)))) return null;
  const rect=container.getBoundingClientRect();
  // Use the visible, transformed footprint: side tabs often rotate 90 degrees.
  if (!rect.width || !rect.height || rect.width>innerWidth*.8 || rect.height>innerHeight*.8 ||
      rect.width*rect.height>innerWidth*innerHeight*.2) return null;
  const controls=nodes.filter(node=>node.matches('button,[role="button"],a,[tabindex]'));
  const shown=controls.filter(visible);
  if (shown.length!==2 || controls.some(node=>!shown.includes(node))) return null;
  const close=shown.find(node=>node.matches('button') && TEASER_CLOSE.test(label(node)));
  const opener=shown.find(node=>node!==close);
  if (!close || !opener || !opener.matches('button,[role="button"]') ||
      close.contains(opener) || opener.contains(close) ||
      shown.some(node=>!clickable(node) || node.form || node.hasAttribute('formaction') || node.hasAttribute('download'))) return null;
  if (!/^(close teaser|[×✕✖])?$/.test(normalize(close.textContent || ''))) return null;
  if ([close,...close.querySelectorAll('*')].some(node=>['aria-label','title'].some(name=>
      node.hasAttribute(name) && !TEASER_CLOSE.test(normalize(node.getAttribute(name)))))) return null;
  const offer=normalize(opener.textContent || '');
  if (!OFFER.test(offer) || label(opener)!==offer) return null;
  // Hidden instructions count too. Exempt only the reviewed dismissal subtree,
  // not arbitrary headers/controls as generic promptText intentionally does.
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
  let node,text='';
  while ((node=walker.nextNode())) {
    if (!close.contains(node)) text+=' '+node.textContent;
    if (text.length>300) return null;
  }
  if (normalize(text)!==offer) return null;
  if (nodes.some(node=>node!==close && !close.contains(node) &&
      ['aria-label','title'].some(name=>node.hasAttribute(name) && normalize(node.getAttribute(name))!==offer))) return null;
  return {close,opener};
}

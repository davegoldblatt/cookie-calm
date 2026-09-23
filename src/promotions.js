import { clickable, label, visible, roots, structuralContainers, grantsAll, ACCEPT_CONTROLS, CONSENT_SURFACES } from './dom.js';
import {isSurveyPrompt, answeredSurvey, SURVEY_INTENT} from './survey-prompts.js';
import {PromptCompletion} from './prompt-completion.js';
import {CosmeticHides} from './presentation.js';
import { RULES, CATEGORIES, CANDIDATES } from './annoyance-rules.js';
import { isRegistrationPrompt, REGISTRATION_INTENT, REQUIRED_AUTH } from './registration-prompts.js';
import { PROMOTION_CONTROLS, CLOSE, DECLINE, ADBLOCK_REQUEST, TEASER_CLOSE } from './promotion-controls.js';
import {offerTeaser,teaserSurface} from './teaser-prompts.js';

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
function promptText(container, visibleOnly=false, exclusions='a,button,[role="button"],nav,[role="navigation"],[role="menu"],aside,header,footer,script,style') {
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
  let text='',node,count=0;
  while((node=walker.nextNode()) && count++<300 && text.length<10000) {
    if(visibleOnly && !visible(node.parentElement))continue;
    if(!node.parentElement?.closest(exclusions))text+=' '+node.textContent;
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
  if (text.length > 10000 || PROTECTED.test(text) || protectedForm(container)) return '';
  if (rule?.reviewedNotice) return rule.reviewedNotice(container) ? rule.category : '';
  if (container.closest(CONSENT_SURFACES) || container.querySelector(`${CONSENT_SURFACES},${ACCEPT_CONTROLS},.onetrust-close-btn-handler`)) return '';
  if (CONSENT.test(text)) return '';
  if(structural && (container.closest('nav,[role="navigation"],[role="menu"],aside') ||
    container.querySelector('main,article,nav,[role="navigation"]')))return '';
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
  const surveyText=SURVEY_INTENT.test(text.replace(/\s+/g,' '))?promptText(container,true,'a,button,[role="button"],nav,[role="navigation"],[role="menu"],aside,footer,script,style').replace(/\s+/g,' '):'';
  if (SURVEY_INTENT.test(surveyText) && answeredSurvey(container)) return '';
  if (rule?.reviewedDismissal) return rule.reviewedDismissal(container) ? rule.category : '';
  if (rule) return (!rule.required || container.querySelector(rule.required)) && rule.context?.test(text) ? rule.category : '';
  if (registration) return 'registration';
  if (!overlay(container)) return '';
  if (optionalAdblock) return 'adblock';
  if (container.matches('.jw-flag-floating,[class*="floating-video" i],[id*="floating-video" i]') && container.querySelector('video')) return 'video';
  if (isSurveyPrompt(container,surveyText)) return 'survey';
  if (offerTeaser(container)) return 'offer';
  const category = CATEGORIES.find(([,pattern]) => pattern.test(evidence))?.[0] || '';
  if (['registration','adblock','survey'].includes(category)) return ''; // Independent invitation/request evidence is mandatory.
  // A restored conversation or composer is useful even without a click on this page.
  if (category === 'chat' && container.querySelector('[role="log"],textarea,[contenteditable],input:not([type="hidden"]),[aria-live="polite"], [aria-live="assertive"]')) return '';
  return category;
}
function actionKind(button, rule, teaser=false) {
  if (!clickable(button) || button.hasAttribute('formaction') || button.hasAttribute('download')) return '';
  if (grantsAll(button) || button.closest(ACCEPT_CONTROLS) || button.querySelector(ACCEPT_CONTROLS)) return '';
  if (button.closest('a[href],label,summary')) return '';
  if (button.closest('form') && !button.matches('button[type="button"]')) return '';
  const enclosingButton = button.parentElement?.closest('button');
  if (enclosingButton?.form && enclosingButton.type !== 'button') return '';
  if (button.matches('button') && button.form && button.type !== 'button') return '';
  const text = label(button);
  if (teaser && TEASER_CLOSE.test(text)) return 'dismissed';
  if ((rule?.reviewedNotice || rule?.reviewedDismissal) && rule.controlLabel.test(text)) return 'dismissed';
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
function ownsSurface(surface, button) {
  let panel=button.parentElement;
  while(panel && panel!==surface && !ADBLOCK_REQUEST.test(promptText(panel,true)))panel=panel.parentElement;
  if(!panel)return false;
  const walker=document.createTreeWalker(surface,NodeFilter.SHOW_TEXT);
  let node,other='',count=0;
  while((node=walker.nextNode())) {
    if(++count>1000)return false;
    if(!panel.contains(node) && visible(node.parentElement))other+=' '+node.textContent;
  }
  // Branding can sit under a panel. A toast, chat or second invitation cannot.
  other=other.replace(/\s+/g,' ').trim();
  if(other && !/^powered by(?: [\w .-]{1,60})?$/i.test(other))return false;
  return ![...surface.querySelectorAll('section,aside,[role="dialog"],[role="alertdialog"]')]
    .some(node=>node!==panel && !node.contains(panel) && visible(node) && !ADBLOCK_REQUEST.test(promptText(node,true)));
}
function fingerprint(container, category, rule) {
  if (rule) return rule.id;
  const teaser=category==='offer' && offerTeaser(container);
  if (teaser) return `teaser:offer:${label(teaser.opener)}`;
  const title = container.querySelector('h1,h2,h3,[role="heading"]');
  return `generic:${category}:${(title ? label(title) : container.getAttribute('aria-label') || container.id || category).replace(/\d+/g,'#').slice(0,100)}`;
}

function appHideEligible(container,rule) {
  if(!rule?.hide || !container.matches(rule.container) || !['fixed','sticky'].includes(getComputedStyle(container).position) ||
      container.querySelector('form,input,textarea,select,iframe,[contenteditable],video,audio'))return false;
  return [...container.querySelectorAll('a[href]')].some(link=>{
    if(!visible(link))return false;
    try {
      const url=new URL(link.href);
      return url.protocol==='https:' && !url.username && !url.password && !url.port &&
        (url.hostname==='apps.apple.com' && /\/id\d+\/?$/.test(url.pathname) ||
         url.hostname==='play.google.com' && url.pathname.startsWith('/store/apps/'));
    } catch {return false;}
  });
}
const structural = (container,rule) => !rule && !container.matches(CANDIDATES);

export class Promotions {
  constructor(interactions) {
    this.interactions = interactions; this.hidden = new CosmeticHides(); this.reset();
  }
  reset() {
    this.restore(); this.attempts = new Map(); this.categories = new Map(); this.done = new Set(); this.total = 0;this.verified=new WeakSet();
  }
  restore() {
    this.presentation?.release();
    this.hidden.release();
  }
  available(key, category,container) {
    const state = this.attempts.get(key);
    return !this.done.has(key) && this.total < 12 && (this.categories.get(category) || 0) < 4 &&
      (!state || (state.count < 2 && (this.verified.has(container) || Date.now() - state.at > 4000)));
  }
  find(searchRoots) {
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
          candidates.set(container,null);
        }
      }
    }
    const knownContainers=[...candidates].filter(([,rule])=>rule).map(([container])=>container);
    for (const [container, rule] of candidates) {
      if (!rule && knownContainers.some(known => known.contains(container) || container.contains(known))) continue;
      if (rule?.id === 'guardian-support' && container.hasAttribute('data-island-status') && container.getAttribute('data-island-status') !== 'hydrated') continue;
      const category = classify(container, rule, structural(container,rule));
      if (!category) continue;
      const teaser=!rule && category==='offer' && offerTeaser(container);
      if (teaser && this.interactions.openedByUser(container)) continue;
      const key = fingerprint(container, category, rule);
      if (!this.interactions.permits(container, key, category) || !this.available(key, category,container) ||
          ((rule?.reviewedNotice || rule?.reviewedDismissal) && this.attempts.has(key))) continue;
      const controls = [...container.querySelectorAll(CONTROLS)];
      if (teaser) {
        if (actionKind(teaser.close,null,true)) return {button:teaser.close,container,category,key,rule,action:'dismissed',teaser:true};
        continue;
      }
      if (rule?.control) {
        const button = [...container.querySelectorAll(rule.control)].find(control => rule.controlLabel.test(label(control)) && actionKind(control, rule) === rule.action);
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
      if (appHideEligible(container,rule)) {
        return {container, category, key, rule, action: 'hidden'};
      }
    }
    return null;
  }
  eligible(choice) {
    const {container, category, rule, button, action, key} = choice;
    return !((rule?.reviewedNotice || rule?.reviewedDismissal) && this.attempts.has(key)) && (!rule || container.matches(rule.container)) &&
      !((choice.teaser || structural(container,rule)) && this.interactions.openedByUser(container)) &&
      classify(container, rule, structural(container,rule)) === category && this.interactions.permits(container, key, category) && this.available(key, category,container) &&
      (category!=='adblock' || adblockChoice(container)===button) &&
      (action === 'hidden' ? appHideEligible(container,rule) :
        container.contains(button) && (!choice.teaser || offerTeaser(container)?.close===button) &&
        actionKind(button, rule,choice.teaser) === action && (!rule?.controlLabel || rule.controlLabel.test(label(button))));
  }
  act(choice) {
    if (choice.action!=='hidden' || !this.eligible(choice)) return false;
    const {container, key, category} = choice;
    const state = this.attempts.get(key);
    this.attempts.set(key, {count: (state?.count || 0) + 1, at: Date.now()});
    this.categories.set(category, (this.categories.get(category) || 0) + 1); this.total++;
    this.startCompletion(choice);
    return this.hidden.hide(container);
  }
  startCompletion(choice) {
    choice.completion?.dispose();
    const equivalent=node=>choice.teaser ? teaserSurface(node) : choice.rule ? node.matches(choice.rule.container) :
      node.matches(CANDIDATES) && fingerprint(node,choice.category,null)===choice.key;
    const existing=[];let inspected=0,exhausted=false;
    for(const root of roots()) {
      const candidates=[...root.querySelectorAll(choice.rule?.container || CANDIDATES),...(choice.teaser?structuralContainers(root):[])];
      for(const node of candidates) {
        if(++inspected>2500){exhausted=true;break;}
        if(equivalent(node) && (!choice.teaser || offerTeaser(node)))existing.push(node);
      }
      if(exhausted)break;
    }
    choice.completion=new PromptCompletion(choice.container,equivalent,existing);
    choice.completion.exhausted=exhausted;
  }
  prompt(choice) {
    let activated=false;
    const originalText=choice.container.textContent;
    return {
      id:'promotion', category:choice.category,
      dispose:()=>choice.completion?.dispose(),
      recovery:()=>{
        // Stronger effects need fresh purpose, intent and scope evidence. An X
        // alone doesn't establish that a broken request is optional.
        const {container,button,category,key,rule}=choice;
        if(!activated || category!=='adblock' || rule || choice.action!=='dismissed' ||
          container.textContent!==originalText || !DECLINE.test(label(button)) ||
          classify(container,null,structural(container,null))!==category || adblockChoice(container)!==button ||
          !this.interactions.permits(container,key,category))return null;
        for(let surface=container,depth=0;surface && depth<3;surface=surface.parentElement,depth++) {
          if(surface.matches('html,body,main,article,nav,header,footer'))break;
          if(getComputedStyle(surface).position!=='fixed')continue;
          // Do not take over a shared portal that contains another text-bearing
          // component. Text-free backdrop wrappers can belong to this surface.
          if(classify(surface,null,true)!==category || adblockChoice(surface)!==button || !ownsSurface(surface,button))return null;
          return this.presentation?.describe(surface);
        }
        return null;
      },
      recovered:()=>{this.done.add(choice.key);},
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
        this.startCompletion(choice);
        choice.expandBefore=new Set([...container.querySelectorAll(CONTROLS)].filter(control=>clickable(control)&&/^expand\b/.test(label(control))));
        activated=true;
      }
    };
  }
  finished(choice, searchRoots) {
    const {button, container, action, key, category, rule} = choice;
    if (action === 'hidden') return choice.completion?.settled(!panelVisible(container)) || false;
    if (rule?.successLabel && container.isConnected) {
      return [...container.querySelectorAll(rule.control)].some(control => clickable(control) && rule.successLabel.test(label(control)));
    }
    if (action === 'collapsed' && container.isConnected &&
        (button.getAttribute('aria-expanded') === 'false' || [...container.querySelectorAll(CONTROLS)].some(control => !choice.expandBefore.has(control) && clickable(control) && /^expand( (this|the))?( banner|popup|pop-up|chat)?$/.test(label(control))))) return true;
    return choice.completion?.settled(!(container.isConnected && panelVisible(container))) || false;
  }
  succeeded(choice) {
    this.verified.add(choice.container);
    if (choice.rule && choice.action!=='hidden') this.done.add(choice.key);
  }
}

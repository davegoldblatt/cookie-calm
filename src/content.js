import { RuleEngine } from './rule-engine.js';
import { roots, invalidateRoots, discoverRoots, banners, findChoice, visible } from './dom.js';
import { isEnabled } from './settings.js';
import { assessPage, invalidateAssessment } from './page-guard.js';
import { Promotions } from './promotions.js';
import { Interactions } from './interactions.js';
import { CANDIDATES } from './annoyance-rules.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let engine, settings, enabled = false, promotionAllowed = false, generation = 0, reportedError = false, invalidated = false;
let timer, interval, inFlight, dirty = false, fallbacks = [], configQueue = Promise.resolve();
let clicked = new WeakSet(), lastUrl = location.href, lastScan = 0;
const interactions = new Interactions();
const promotions = new Promotions(interactions);
const RELEVANT = `${CANDIDATES},[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i]`;
let changedScopes = new Set(), fullScan = true;
const observer = new MutationObserver(records => {
  if (!contextAlive()) return;
  try { processMutations(records); } catch (error) { reportError(error); }
});
function processMutations(records) {
  invalidateAssessment();
  const rootCount = roots().length;
  let relevant = false;
  const added = new Set(), targets = new Set(), attributes = new Set();
  for (const record of records) {
    const element = record.target instanceof Element ? record.target : record.target.parentElement;
    if (element) targets.add(element);
    if (record.type === 'attributes' && element) attributes.add(element);
    if (record.type === 'childList') for (const node of record.addedNodes) {
      if (node instanceof Element && node.isConnected) added.add(node);
    }
  }
  // A single render can report each descendant separately. Visit each inserted
  // subtree once rather than repeatedly walking overlapping ancestor trees.
  for (const node of added) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (added.has(parent)) { added.delete(node); break; }
    }
  }
  discoverRoots(added);
  // Capture causality at mutation time, even while a consent flow owns the
  // scanner or the tab is hidden. Delayed hydration must not erase user intent.
  for (const node of added) interactions.noteChange(node);
  for (const element of targets) {
    const container = element?.closest(CANDIDATES);
    if (container) { interactions.noteChange(container); changedScopes.add(container); relevant = true; }
  }
  for (const node of added) {
    if (node.matches(RELEVANT) || node.querySelector(RELEVANT) || node.shadowRoot) {
      changedScopes.add(node); relevant = true;
    }
  }
  for (const element of attributes) {
    if (element.matches(`html,body,${RELEVANT}`) || element.querySelector(RELEVANT)) {
      if (!element.matches('html,body')) interactions.noteChange(element);
      changedScopes.add(element); relevant = true;
    }
  }
  // Listen to newly discovered roots immediately, including closed roots.
  for (const root of roots()) observe(root);
  if (roots().length !== rootCount) { relevant=true; fullScan=true; }
  if (changedScopes.size > 60) { changedScopes.clear(); fullScan = true; }
  if (relevant) schedule();
}

function stopInvalidatedContext() {
  if (invalidated) return;
  invalidated = true; enabled = false; generation++;
  engine?.cancel(); observer.disconnect(); interactions.disconnect();
  clearTimeout(timer); clearInterval(interval); fallbacks.forEach(clearTimeout);
  timer = null; fallbacks = []; dirty = false; changedScopes.clear();
  promotions.restore();
}
function contextAlive() {
  if (invalidated) return false;
  try { if (chrome.runtime?.id) return true; } catch { /* Extension was unloaded. */ }
  stopInvalidatedContext();
  return false;
}
function reportError(error) {
  if (/extension context invalidated/i.test(error?.message || '') || !contextAlive()) {
    stopInvalidatedContext(); return;
  }
  if (!reportedError) {
    reportedError = true;
    console.warn('Cookie Calm could not process a page element:', error?.message || String(error));
  }
}
function observe(root) {
  interactions.observe(root);
  observer.observe(root, {subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['class','style','hidden','aria-hidden','aria-expanded','aria-label','role','open','src','title','type','autocomplete','name','data-island-status']});
}

async function send(request) {
  if (!contextAlive()) return null;
  try {
    const result = await chrome.runtime.sendMessage(request);
    return contextAlive() ? result : null;
  } catch (error) {
    if (/extension context invalidated/i.test(error?.message || '') || !contextAlive()) stopInvalidatedContext();
    return null;
  }
}

async function guard() {
  const result = await send({ type: 'guard', local: assessment() });
  return result && typeof result.stopAll === 'boolean' ? result : { stopAll: true, stopAccept: true, reason: 'The page could not be checked.' };
}
function assessment() {
  if (!contextAlive()) return {stopAll:true, stopAccept:true, reason:'Extension updated; refresh this page.'};
  return {...assessPage(), deferPromotions: interactions.recent(), protectedPromotions: [...interactions.categories]};
}

async function beforeClick() {
  if (location.href !== lastUrl) throw new Error('Navigation interrupted an automatic action');
  const state = await guard();
  if (location.href !== lastUrl) throw new Error('Navigation interrupted an automatic action');
  if (state.stopAll) {
    await send({ type: 'status', status: 'blocked', reason: state.reason });
    throw new Error('Automatic clicks blocked on this page');
  }
}

function schedule(delay = 200) {
  if (!contextAlive() || !enabled || document.hidden) return;
  if (inFlight) { dirty = true; return; }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    inFlight = scan().catch(reportError).finally(() => {
      inFlight = null;
      if (dirty) { dirty = false; schedule(); }
    });
  }, Math.max(delay, 500 - (Date.now() - lastScan)));
}

async function scan() {
  if (!contextAlive() || !enabled || document.hidden || !document.body) return;
  const revision = generation;
  const scanUrl = location.href;
  lastScan = Date.now();
  const pageGuard = await guard();
  if (!enabled || generation !== revision || location.href !== scanUrl) return;
  if (pageGuard.stopAll) {
    await send({ type: 'status', status: 'blocked', reason: pageGuard.reason });
    return;
  }
  if (lastUrl !== location.href) {
    const previous = new URL(lastUrl), next = new URL(location.href);
    lastUrl = location.href;
    if (previous.pathname !== next.pathname || previous.search !== next.search) {
      engine.reset(); clicked = new WeakSet();
    }
    // Promotion budgets, user intent, and reopened panels belong to the document,
    // including hash changes, replaceState, and client-side route transitions.
    invalidateRoots();
    fullScan = true;
  }
  const searchRoots = roots();
  for (const root of searchRoots) observe(root);
  const promotionRoots = fullScan ? searchRoots : [...new Set([...changedScopes].filter(node=>node.isConnected).concat(searchRoots.slice(1)))];
  changedScopes.clear(); fullScan = false;
  const promotion = promotionAllowed && !pageGuard.stopPromotions && promotions.find(promotionRoots);
  if (promotion) {
    const decision = await guard();
    if (!enabled || generation !== revision || location.href !== scanUrl) return;
    if (decision.stopAll) { await send({type:'status',status:'blocked',reason:decision.reason}); return; }
    if (decision.protectedPromotions?.includes(promotion.category)) interactions.protect(promotion.container, promotion.key);
    else if (decision.deferPromotions) fallbacks.push(setTimeout(() => {fullScan=true; schedule();},1500));
    else if (decision.stopPromotions) { /* Protected page context: no promotional action. */ }
    else if (promotions.act(promotion)) {
      // Arm retry before verification so navigation cannot strand an attempt.
      fallbacks.push(setTimeout(() => {fullScan=true; schedule();}, 4300));
      let finished = false;
      for (let attempt=0; attempt<10; attempt++) {
        await sleep(200);
        if (!enabled || generation !== revision || location.href !== scanUrl) return;
        if (promotions.finished(promotion, roots())) { finished = true; break; }
      }
      if (finished) {
        promotions.succeeded(promotion);
        await send({ type: 'promotion-dismissed', action: promotion.action, category: promotion.category });
      }
      dirty = true; fullScan = true;
    }
  }
  if (interactions.recent()) fallbacks.push(setTimeout(() => {fullScan=true; schedule();},1500));
  const containers = banners(searchRoots);
  const reject = findChoice(containers, 'reject', clicked) || findChoice(containers, 'acknowledge', clicked);
  if (reject) {
    const decision = await guard();
    if (!enabled || generation !== revision || location.href !== scanUrl || decision.stopAll || !visible(reject.button)) return;
    clicked.add(reject.button);
    reject.button.click();
    await sleep(650);
    if (generation !== revision || location.href !== scanUrl) return;
    if (!visible(reject.container)) {
      await send({ type: 'status', status: 'dismissed', provider: 'Recognized reject button' });
      return;
    }
  }

  // Yield between provider flows so a chain of consent utilities cannot hold
  // the promotion pass for four consecutive 18-second provider deadlines.
  for (let step = 0; step < 1; step++) {
    if (!enabled || generation !== revision || location.href !== scanUrl) return;
    const result = await engine.runNext();
    if (!result) break;
    if (generation !== revision || location.href !== scanUrl) return;
    if (result.dismissed) {
      await send({ type: 'status', status: 'dismissed', provider: result.name });
      return;
    }
    dirty = true; fullScan = true;
  }

  const remaining = banners(roots());
  // A separate pass makes acceptance an explicit opt-in after rejection rules finish.
  if (settings.mode === 'dismiss') {
    const accept = findChoice(remaining, 'accept', clicked);
    if (accept && enabled && generation === revision) {
      const acceptanceGuard = await guard();
      if (!enabled || generation !== revision || location.href !== scanUrl) return;
      if (acceptanceGuard.stopAll || acceptanceGuard.stopAccept) {
        await send({ type: 'status', status: 'blocked', reason: acceptanceGuard.reason });
        return;
      }
      clicked.add(accept.button);
      accept.button.click();
      await sleep(650);
      if (generation !== revision || location.href !== scanUrl) return;
      if (!visible(accept.container)) {
        await send({ type: 'status', status: 'dismissed', accepted: true, provider: 'Acceptance fallback' });
        return;
      }
    }
  }
  if (remaining.length) await send({ type: 'status', status: 'needs-help' });
}

function configure() {
  if (!contextAlive()) return;
  const revision = ++generation;
  enabled = false;
  engine?.cancel();
  observer.disconnect();
  clearTimeout(timer);
  clearInterval(interval);
  fallbacks.forEach(clearTimeout);
  fallbacks = [];
  timer = null;
  configQueue = configQueue.then(async () => {
    await inFlight;
    if (!contextAlive() || revision !== generation) return;
    const data = await send({ type: 'bootstrap' });
    if (revision !== generation) return;
    if (!data?.settings) { promotions.restore(); return; }
    settings = data.settings;
    enabled = isEnabled(settings, data.host);
    if (!enabled) { promotions.restore(); return; }
    if (!data.rules) { enabled = false; promotions.restore(); return; }
    promotionAllowed = data.promotionAllowed === true;
    fullScan = true;
    invalidateRoots(); invalidateAssessment();
    engine = new RuleEngine(data.rules, data.host);
    engine.beforeClick = beforeClick;
    clicked = new WeakSet();
    // Keep action budgets and user interactions across setting changes.
    // This interval only compares the address; unchanged pages do no DOM work.
    interval = setInterval(() => { if (contextAlive() && location.href !== lastUrl) schedule(0); }, 1000);
    fallbacks = [500, 1500, 5000, 15000, 45000].map(delay => setTimeout(() => {
      invalidateRoots(); invalidateAssessment(); fullScan=true; schedule(0);
    }, delay));
    await send({ type: 'status', status: 'watching' });
    for (const root of roots()) observe(root);
    schedule(50);
  }).catch(() => { enabled = false; });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) configure();
});
chrome.runtime.onMessage.addListener((request, sender, reply) => {
  if (request?.type === 'assess-page') {
    try { reply(assessment()); }
    catch { reply({ stopAll: true, stopAccept: true, reason: 'The page could not be checked.' }); }
  }
});
document.addEventListener('DOMContentLoaded', () => { invalidateRoots(); invalidateAssessment(); fullScan=true; schedule(0); });
window.addEventListener('load', () => { invalidateAssessment(); fullScan=true; schedule(0); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { invalidateAssessment(); fullScan=true; schedule(50); } });
window.addEventListener('pageshow', event => { if (event.persisted) configure(); });
window.addEventListener('pagehide', () => {
  enabled = false;
  engine?.cancel();
  observer.disconnect();
  clearInterval(interval);
  clearTimeout(timer);
  fallbacks.forEach(clearTimeout);
  timer = null;
});
if (document.contentType === 'text/html') configure();

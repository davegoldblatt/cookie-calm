import { RuleEngine } from './rule-engine.js';
import { roots, banners, findChoice, visible } from './dom.js';
import { isEnabled } from './settings.js';
import { assessPage } from './page-guard.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let engine, settings, enabled = false, generation = 0, reportedError = false;
let timer, interval, inFlight, configQueue = Promise.resolve();
let clicked = new WeakSet(), lastUrl = location.href, lastScan = 0;
const observer = new MutationObserver(() => schedule());

async function send(request) {
  try { return await chrome.runtime.sendMessage(request); } catch { return null; }
}

async function guard() {
  const result = await send({ type: 'guard', local: assessPage() });
  return result && typeof result.stopAll === 'boolean' ? result : { stopAll: true, stopAccept: true, reason: 'The page could not be checked.' };
}

async function beforeClick() {
  const state = await guard();
  if (state.stopAll) {
    await send({ type: 'status', status: 'blocked', reason: state.reason });
    throw new Error('Automatic clicks blocked on this page');
  }
}

function schedule(delay = 200) {
  if (!enabled || timer || document.hidden || inFlight) return;
  timer = setTimeout(() => {
    timer = null;
    inFlight = scan().catch(error => {
      if (!reportedError) {
        reportedError = true;
        console.warn('Cookie Calm could not process a page element:', error.message);
      }
    }).finally(() => { inFlight = null; });
  }, Math.max(delay, 1000 - (Date.now() - lastScan)));
}

async function scan() {
  if (!enabled || document.hidden) return;
  const revision = generation;
  lastScan = Date.now();
  const pageGuard = await guard();
  if (!enabled || generation !== revision) return;
  if (pageGuard.stopAll) {
    await send({ type: 'status', status: 'blocked', reason: pageGuard.reason });
    return;
  }
  if (lastUrl !== location.href) {
    lastUrl = location.href;
    engine.reset();
    clicked = new WeakSet();
  }
  const searchRoots = roots();
  observer.disconnect();
  for (const root of searchRoots) {
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open'] });
  }
  const containers = banners(searchRoots);
  const reject = findChoice(containers, 'reject', clicked) || findChoice(containers, 'acknowledge', clicked);
  if (reject) {
    clicked.add(reject.button);
    reject.button.click();
    await sleep(650);
    if (generation !== revision) return;
    if (!visible(reject.container)) {
      await send({ type: 'status', status: 'dismissed', provider: 'Recognized reject button' });
      return;
    }
  }

  // Utility rules can open a preference panel handled by a second rule.
  let result;
  for (let step = 0; step < 4; step++) {
    if (!enabled || generation !== revision) return;
    result = await engine.runNext();
    if (!result) break;
    if (generation !== revision) return;
    if (result.dismissed) {
      await send({ type: 'status', status: 'dismissed', provider: result.name });
      return;
    }
  }

  const remaining = banners(roots());
  // A separate pass makes acceptance an explicit opt-in after rejection rules finish.
  if (settings.mode === 'dismiss') {
    const accept = findChoice(remaining, 'accept', clicked);
    if (accept && enabled && generation === revision) {
      const acceptanceGuard = await guard();
      if (!enabled || generation !== revision) return;
      if (acceptanceGuard.stopAll || acceptanceGuard.stopAccept) {
        await send({ type: 'status', status: 'blocked', reason: acceptanceGuard.reason });
        return;
      }
      clicked.add(accept.button);
      accept.button.click();
      await sleep(650);
      if (generation !== revision) return;
      if (!visible(accept.container)) {
        await send({ type: 'status', status: 'dismissed', accepted: true, provider: 'Acceptance fallback' });
        return;
      }
    }
  }
  if (remaining.length) await send({ type: 'status', status: 'needs-help' });
}

function configure() {
  const revision = ++generation;
  enabled = false;
  engine?.cancel();
  observer.disconnect();
  clearTimeout(timer);
  clearInterval(interval);
  timer = null;
  configQueue = configQueue.then(async () => {
    await inFlight;
    if (revision !== generation) return;
    const data = await send({ type: 'bootstrap' });
    if (revision !== generation || !data?.rules) return;
    settings = data.settings;
    enabled = isEnabled(settings, data.host);
    if (!enabled) return;
    engine = new RuleEngine(data.rules, data.host);
    engine.beforeClick = beforeClick;
    clicked = new WeakSet();
    interval = setInterval(() => schedule(), 4000);
    await send({ type: 'status', status: 'watching' });
    schedule(50);
  }).catch(() => { enabled = false; });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) configure();
});
chrome.runtime.onMessage.addListener((request, sender, reply) => {
  if (request?.type === 'assess-page') {
    try { reply(assessPage()); }
    catch { reply({ stopAll: true, stopAccept: true, reason: 'The page could not be checked.' }); }
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(50); });
window.addEventListener('pageshow', event => { if (event.persisted) configure(); });
window.addEventListener('pagehide', () => {
  enabled = false;
  engine?.cancel();
  observer.disconnect();
  clearInterval(interval);
  clearTimeout(timer);
  timer = null;
});
if (document.contentType === 'text/html') configure();

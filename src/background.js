import { getSettings, hostname, isEnabled } from './settings.js';
import { addressGuard } from './page-guard.js';
import { presentationCSS } from './presentation.js';

const rules = fetch(chrome.runtime.getURL('rules.json')).then(response => {
  if (!response.ok) throw new Error('Bundled rules could not load');
  return response.json();
});
let queue = Promise.resolve();

async function message(request, sender) {
  if(request?.type==='presentation-css') {
    // Only fixed CSS, for the requesting top-level document. Never accept CSS,
    // selectors, URLs or tab IDs supplied by a page/content message.
    if(sender.frameId!==0 || !sender.tab?.id || !sender.documentId ||
      !/^https?:/.test(sender.url || '') || !/^[a-f0-9-]{36}$/.test(request.token || '') ||
      !isEnabled(await getSettings(),hostname(sender.tab.url)))return {ok:false};
    try {
      await chrome.scripting.insertCSS({target:{tabId:sender.tab.id,documentIds:[sender.documentId]},origin:'USER',css:presentationCSS(request.token)});
      return {ok:true};
    } catch {return {ok:false};}
  }
  if (['watch-consent','cancel-consent-watch'].includes(request?.type) && sender.tab?.id!=null) {
    const settings=await getSettings();
    if(!isEnabled(settings,hostname(sender.tab.url)))return {ok:false};
    let url;try{url=new URL(sender.url);}catch{return {ok:false};}
    if(sender.frameId===0 || url.protocol!=='https:' || !/(^|\.)privacy-mgmt\.com$/.test(url.hostname) || url.pathname!=='/us_pm/index.html' ||
        typeof request.token!=='string' || request.token.length>120) return {ok:false};
    const siteId=url.searchParams.get('site_id');
    if(!/^\d{1,12}$/.test(siteId || ''))return {ok:false};
    return chrome.tabs.sendMessage(sender.tab.id,{type:request.type,token:request.token,siteId},{frameId:0}).catch(()=>({ok:false}));
  }
  if (request?.type==='prompt-outcome' && sender.tab?.id!=null) {
    const settings=await getSettings(),host=hostname(sender.tab.url);
    if(!isEnabled(settings,host))return {ok:false};
    if(!['sourcepoint-us','cookieyes-legacy','cookiebot','promotion'].includes(request.provider) ||
       !['closed','saved','hidden','unconfirmed','unsupported','blocked'].includes(request.outcome) ||
       request.outcome==='hidden' && request.provider!=='promotion')return {ok:false};
    const reasons=['','presentation-reverted','unrecognized-controls','protected','no-settings-control','unknown-preferences','preferences-changed',
      'no-save-control','state-did-not-change','unsafe-control','unknown-activation','save-unconfirmed','unstable-controls','page-guard','cancelled-or-unavailable','user-interaction'];
    const key=`tab:${sender.tab.id}`,previous=(await chrome.storage.session.get(key))[key] || {host,status:'watching'};
    const categories=['consent','newsletter','registration','support','subscription','offer','survey','app','notifications','chat','video','adblock','privacy-notice'];
    const record={provider:request.provider,category:categories.includes(request.category)?request.category:'consent',outcome:request.outcome,reason:reasons.includes(request.reason)?request.reason:''};
    const diagnostics=[...(previous.diagnostics || []),record].slice(-12);
    const consent=request.provider!=='promotion';
    const flow=typeof request.flow==='string' && /^[a-f0-9-]{36}$/.test(request.flow)?request.flow:'';
    // Stronger evidence is retained only within the same action, never by provider name.
    const outcome=flow && previous.consentFlow===flow && previous.consentOutcome==='saved'?'saved':request.outcome;
    // An unrelated embedded provider's miss stays in diagnostics, not in the
    // main result of an already completed top-page flow.
    const unrelatedMiss=sender.frameId!==0 && previous.consentFlow!==flow &&
      ['saved','closed'].includes(previous.consentOutcome) && !['saved','closed','blocked'].includes(outcome);
    const updateConsent=consent && !unrelatedMiss;
    const status=updateConsent?(outcome==='blocked'?'blocked':['saved','closed'].includes(outcome)?'dismissed':'needs-help'):previous.status;
    await chrome.storage.session.set({[key]:{...previous,host,status,diagnostics,
      ...(updateConsent?{consentOutcome:outcome,consentFlow:flow,provider:request.provider,accepted:false,
        reason:outcome==='blocked'?(previous.reason || 'The consent action was stopped.'):''}:{})}});
    await chrome.action.setBadgeText({tabId:sender.tab.id,text:status==='blocked'?'!':status==='dismissed'?'✓':status==='needs-help'?'·':previous.promotionsDismissed?'✓':''});
    await chrome.action.setBadgeBackgroundColor({tabId:sender.tab.id,color:status==='blocked'?'#936022':'#23685f'});
    return {ok:true};
  }
  if (request?.type === 'guard' && sender.tab?.id != null) {
    const settings = await getSettings();
    if (!isEnabled(settings, hostname(sender.tab.url))) return { stopAll: true, stopAccept: true, reason: 'Cookie Calm is paused.' };
    let top = request.local;
    if (sender.frameId !== 0) {
      try {
        top = await chrome.tabs.sendMessage(sender.tab.id, { type: 'assess-page' }, { frameId: 0 });
      } catch { return { stopAll: true, stopAccept: true, reason: 'The parent page could not be checked.' }; }
    }
    const local = request.local;
    if (!local || !top) return { stopAll: true, stopAccept: true, reason: 'The page could not be checked.' };
    if (top.stopAll || local.stopAll) return top.stopAll ? top : local;
    const stopPromotions = Boolean(top.stopPromotions || local.stopPromotions);
    const deferPromotions = Boolean(top.deferPromotions || local.deferPromotions);
    const protectedPromotions = [...new Set([...(top.protectedPromotions || []), ...(local.protectedPromotions || [])])];
    if (top.stopAccept || local.stopAccept) return {...(top.stopAccept ? top : local), stopPromotions, deferPromotions, protectedPromotions};
    const reason = addressGuard(sender.tab.url) || (/^https?:/.test(sender.url || '') ? addressGuard(sender.url) : '');
    return { stopAll: false, stopAccept: Boolean(reason), stopPromotions, deferPromotions, protectedPromotions, reason };
  }
  if (request?.type === 'bootstrap') {
    const host = hostname(sender.tab?.url);
    const settings = await getSettings();
    const promotionAllowed = sender.frameId === 0 || hostname(sender.origin || sender.url) === host;
    return { host, settings, promotionAllowed, rules: isEnabled(settings, host) ? await rules : null };
  }
  if (['status', 'promotion-dismissed'].includes(request?.type) && sender.tab?.id != null) {
    const tabId = sender.tab.id;
    const host = hostname(sender.tab.url);
    const settings = await getSettings();
    if (!isEnabled(settings, host)) return { ok: false };
    const key = `tab:${tabId}`;
    const previous = (await chrome.storage.session.get(key))[key];
    if (request.type === 'promotion-dismissed') {
      if (!['dismissed', 'collapsed', 'hidden'].includes(request.action)) return { ok: false };
      const status = previous?.status || 'watching';
      await chrome.storage.session.set({ [key]: {
        ...previous, host, status,
        promotionsDismissed: Math.min(99, (previous?.promotionsDismissed || 0) + 1),
        lastPromotionAction: request.action,
        lastPromotionCategory: typeof request.category === 'string' ? request.category.slice(0,30) : ''
      } });
      if (!['blocked', 'needs-help'].includes(status)) {
        await chrome.action.setBadgeText({ tabId, text: '✓' });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: '#23685f' });
      }
      return { ok: true };
    }
    if (previous?.status === 'dismissed' && !['dismissed', 'blocked'].includes(request.status)) return { ok: true };
    if (previous?.status === 'blocked' && ['watching','needs-help'].includes(request.status)) return {ok:true};
    const status = ['dismissed', 'needs-help', 'watching', 'blocked'].includes(request.status) ? request.status : 'watching';
    await chrome.storage.session.set({ [key]: {
      host, status, accepted: request.accepted === true,
      promotionsDismissed: previous?.promotionsDismissed || 0,
      lastPromotionAction: previous?.lastPromotionAction || '',
      lastPromotionCategory: previous?.lastPromotionCategory || '',
      provider: typeof request.provider === 'string' ? request.provider.slice(0, 100) : '',
      reason: typeof request.reason === 'string' ? request.reason.slice(0, 150) : '',
      consentOutcome:previous?.consentOutcome,consentFlow:previous?.consentFlow,diagnostics:previous?.diagnostics || []
    } });
    await chrome.action.setBadgeText({ tabId, text: status === 'blocked' ? '!' : status === 'needs-help' ? '·' : status === 'dismissed' || previous?.promotionsDismissed ? '✓' : '' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: status === 'blocked' ? '#936022' : '#23685f' });
    return { ok: true };
  }
  return { ok: false };
}

chrome.runtime.onMessage.addListener((request, sender, reply) => {
  // Serial writes prevent one frame from overwriting another frame's completion.
  queue = queue.then(() => message(request, sender)).then(reply, () => reply({ error: 'The extension could not load. Reload it in chrome://extensions.' }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== 'loading' && !change.url) return;
  queue = queue.then(async () => {
    await chrome.storage.session.remove(`tab:${tabId}`);
    await chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  }).catch(() => {});
});
chrome.tabs.onRemoved.addListener(tabId => {
  queue = queue.then(() => chrome.storage.session.remove(`tab:${tabId}`)).catch(() => {});
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  queue = queue.then(async () => {
    await chrome.storage.session.clear();
    for (const tab of await chrome.tabs.query({})) {
      if (tab.id != null) await chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {});
    }
  }).catch(() => {});
});

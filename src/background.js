import { getSettings, hostname, isEnabled } from './settings.js';
import { addressGuard } from './page-guard.js';

const rules = fetch(chrome.runtime.getURL('rules.json')).then(response => {
  if (!response.ok) throw new Error('Bundled rules could not load');
  return response.json();
});
let queue = Promise.resolve();

async function message(request, sender) {
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
    if (top.stopAccept || local.stopAccept) return top.stopAccept ? top : local;
    const reason = addressGuard(sender.tab.url) || (/^https?:/.test(sender.url || '') ? addressGuard(sender.url) : '');
    return { stopAll: false, stopAccept: Boolean(reason), reason };
  }
  if (request?.type === 'bootstrap') {
    const host = hostname(sender.tab?.url);
    const settings = await getSettings();
    return { host, settings, rules: isEnabled(settings, host) ? await rules : null };
  }
  if (request?.type === 'status' && sender.tab?.id != null) {
    const tabId = sender.tab.id;
    const host = hostname(sender.tab.url);
    const settings = await getSettings();
    if (!isEnabled(settings, host)) return { ok: false };
    const key = `tab:${tabId}`;
    const previous = (await chrome.storage.session.get(key))[key];
    if (previous?.status === 'dismissed' && !['dismissed', 'blocked'].includes(request.status)) return { ok: true };
    const status = ['dismissed', 'needs-help', 'watching', 'blocked'].includes(request.status) ? request.status : 'watching';
    await chrome.storage.session.set({ [key]: {
      host, status, accepted: request.accepted === true,
      provider: typeof request.provider === 'string' ? request.provider.slice(0, 100) : '',
      reason: typeof request.reason === 'string' ? request.reason.slice(0, 150) : ''
    } });
    await chrome.action.setBadgeText({ tabId, text: status === 'dismissed' ? '✓' : status === 'blocked' ? '!' : status === 'needs-help' ? '·' : '' });
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
  if (change.status !== 'loading') return;
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

import { getSettings, hostname, normalizeSettings } from './settings.js';
const $ = selector => document.querySelector(selector);
let settings, host = '', tabId;
let saving = Promise.resolve();
const feedback = text => { $('#feedback').textContent = text; };

async function render() {
  const paused = host && settings.disabledSites.includes(host);
  document.body.dataset.paused = String(!settings.enabled || paused);
  $('#enabled').checked = settings.enabled;
  $('#enabled').disabled = false;
  $('#modes').disabled = false;
  document.querySelectorAll('[name=mode]').forEach(input => { input.checked = input.value === settings.mode; });
  $('#hostname').textContent = host || 'This page is outside our reach';
  $('#pause').disabled = !host || !settings.enabled;
  $('#pause').textContent = paused ? 'Resume on this site' : 'Pause on this site';
  const state = tabId != null ? (await chrome.storage.session.get(`tab:${tabId}`))[`tab:${tabId}`] : null;
  const names={'sourcepoint-us':'Sourcepoint','cookieyes-legacy':'CookieYes',cookiebot:'Cookiebot',promotion:'Website prompt'};
  const results={saved:'privacy choices recorded',closed:'closed',hidden:'hidden',unsupported:'unrecognized controls',blocked:'action stopped',unconfirmed:'result unconfirmed'};
  const records=state?.host===host?(state.diagnostics || []):[];
  $('#diagnostics').textContent=`Version ${chrome.runtime.getManifest().version}. `+(records.length?
    records.slice(-5).map(r=>`${r.category==='privacy-notice'?'Privacy notice':names[r.provider] || 'Prompt'}: ${results[r.outcome] || 'unconfirmed'}.`).join(' '):'No supported prompt recorded in this tab yet.');
  if (settings.enabled && !paused && state?.host === host && state.status === 'blocked') {
    $('#status').textContent = state.reason || 'Automatic acceptance is paused on this page.';
    return;
  }
  const current = state?.host === host ? state : null;
  const promotionStatus = current?.promotionsDismissed ? `${current.promotionsDismissed} ${current.promotionsDismissed === 1 ? 'prompt' : 'prompts'} ${current.lastPromotionAction === 'collapsed' ? 'handled (last minimized)' : 'handled'}.` : '';
  const outcomes={saved:'The site recorded your privacy choices.',closed:'Cookie panel closed. Saved choices could not be verified.',
    unconfirmed:'The consent action could not be confirmed.',unsupported:'This consent form has controls we do not recognize.',blocked:'The consent action was stopped.'};
  const consentStatus = outcomes[current?.consentOutcome] || (current?.status === 'dismissed' ? (current.accepted ? 'Cookie banner dismissed with acceptance.' : 'Cookie banner dismissed after a rejection attempt.') : current?.status === 'needs-help' ? 'This cookie banner may need your help.' : '');
  $('#status').textContent = !settings.enabled ? 'Paused everywhere.' : !host ? 'Open a website to use Cookie Calm.' : paused ? 'You handle banners and pop-ups here.' : [consentStatus, promotionStatus].filter(Boolean).join(' ') || 'Ready for supported cookies and pop-ups.';
}

function save(change) {
  saving = saving.then(async () => {
    const latest = await getSettings();
    settings = normalizeSettings(change(latest));
    await chrome.storage.local.set({ settings });
    await render();
    $('#feedback').dataset.error = 'false';
    feedback('Saved. Applies to new automatic actions.');
  }).catch(() => {
    $('#feedback').dataset.error = 'true';
    feedback('Could not save. Reopen Cookie Calm and try again.');
  });
}

$('#enabled').addEventListener('change', event => { const enabled = event.target.checked; save(current => ({ ...current, enabled })); });
$('#pause').addEventListener('click', () => save(current => ({ ...current, disabledSites: current.disabledSites.includes(host) ? current.disabledSites.filter(value => value !== host) : [...current.disabledSites, host] })));
document.querySelectorAll('[name=mode]').forEach(input => input.addEventListener('change', event => { const mode = event.target.value; save(current => ({ ...current, mode })); }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && settings) render().catch(() => {});
});

async function init() {
  settings = await getSettings();
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  host = hostname(tab?.url);
  tabId = tab?.id;
  await render();
}
init().catch(() => { $('#status').textContent = 'Could not load. Reopen Cookie Calm or reload the extension.'; });

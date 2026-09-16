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
  if (settings.enabled && !paused && state?.host === host && state.status === 'blocked') {
    $('#status').textContent = state.reason || 'Automatic acceptance is paused on this page.';
    return;
  }
  $('#status').textContent = !settings.enabled ? 'Paused everywhere.' : !host ? 'Open a website to use Cookie Calm.' : paused ? 'You handle cookie banners here.' : state?.host === host && state.status === 'dismissed' ? (state.accepted ? 'Banner dismissed with acceptance.' : 'Banner dismissed after a rejection attempt.') : state?.host === host && state.status === 'needs-help' ? 'This banner may need your help.' : 'Ready for supported cookie banners.';
}

function save(change) {
  saving = saving.then(async () => {
    const latest = await getSettings();
    settings = normalizeSettings(change(latest));
    await chrome.storage.local.set({ settings });
    await render();
    $('#feedback').dataset.error = 'false';
    feedback('Saved. Applies to new consent choices.');
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

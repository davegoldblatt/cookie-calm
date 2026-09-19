import {label, visible} from './dom.js';

// Sourcepoint's US manager uses inverse consent: checked means OPT OUT.
// Keep this adapter separate from the older GDPR rules and fail closed on
// unfamiliar purposes. No publisher-specific hostnames or hidden controls.
const OPT_OUT = /^do not sell or share my personal information(?: \/ opt out of targeted advertising)?(?: \(if you select on you are asking us not to sell or share your personal information and are opting out of targeted advertising\))?$/;

export function isSourcepointUSManager() {
  return window !== window.top && location.protocol === 'https:' &&
    /(^|\.)privacy-mgmt\.com$/.test(location.hostname) && location.pathname === '/us_pm/index.html' &&
    (new URL(location.href).searchParams.get('is_usnat_notice') !== 'true' ||
      Boolean(document.querySelector('.pm-toggle,[role="switch"],.sp_choice_type_SE')));
}

export const sourcepointUS = {
  id: 'sourcepoint-us',
  owns: isSourcepointUSManager,
  observe() {
    const panels = [...document.querySelectorAll('.message-container .message.type-modal')].filter(visible);
    if (!panels.length) return {stage:'absent'};
    const panel = panels.length === 1 ? panels[0] : null;
    const unsupported = {stage:'unsupported',reason:'unknown-preferences'};
    if (!panel || document.querySelector('form,input,select,textarea,[contenteditable],.pm-tab,.pm-tabs,[role="tab"]')) return unsupported;
    const toggles = [...document.querySelectorAll('.pm-toggle,[role="switch"],[role="checkbox"],[role="radio"]')];
    const saves = [...panel.querySelectorAll('.sp_choice_type_SE')];
    if (toggles.length !== 1 || saves.length !== 1) return unsupported;
    const [toggle] = toggles, [save] = saves, on = toggle.querySelector(':scope > span.on');
    if (!panel.contains(toggle) || !toggle.matches('button.pm-toggle[type="button"][role="switch"]') ||
        !OPT_OUT.test(label(toggle)) || !['true','false'].includes(toggle.getAttribute('aria-checked')) ||
        !save.matches('button') || label(save) !== 'save and close' || !on || label(on) !== 'on') return unsupported;
    const siteId = new URL(location.href).searchParams.get('site_id');
    return {stage:'preferences',root:panel,preferences:[{
      id:'sale-sharing',purpose:'sale-sharing',value:toggle.getAttribute('aria-checked')==='true',grantsWhen:false,
      control:{element:toggle,target:on,activation:'set',sets:true}
    }],save:{element:save,target:save},receipt:/^\d{1,12}$/.test(siteId || '')?{kind:'sourcepoint-us',siteId}:null};
  }
};

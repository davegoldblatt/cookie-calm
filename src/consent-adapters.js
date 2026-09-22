import {sourcepointUS} from './sourcepoint-us.js';
import {oneTrustGroups} from './onetrust-groups.js';
import {visible, clickable, label, grantsAll} from './dom.js';
import {control, single, checked, checkboxControl, legacyVisible} from './consent-controls.js';

const unknown = () => ({stage:'unsupported',reason:'unknown-preferences'});
const categories = {necessary:'essential','non-necessary':'other',functional:'functional',performance:'performance',analytics:'analytics',advertisement:'advertising',others:'other'};
const fragmentControl=(...args)=>({...control(...args),fragmentLink:true});

export const cookieYes = {
  id:'cookieyes-legacy',
  owns:()=>[...document.querySelectorAll('#cookie-law-info-bar')].some(visible) || [...document.querySelectorAll('#cliSettingsPopup.cli-modal.cli-show')].some(legacyVisible),
  observe() {
    if(document.querySelectorAll('#cliSettingsPopup.cli-modal').length>1 || document.querySelectorAll('#cookie-law-info-bar').length>1)return unknown();
    const panel=single(document,'#cliSettingsPopup.cli-modal'), bar=single(document,'#cookie-law-info-bar');
    if (!panel?.classList.contains('cli-show')) {
      const reject=single(bar,'#cookie_action_close_header_reject');
      if(clickable(reject))return {stage:'reject',root:bar,effect:'deny-optional',reject:fragmentControl(reject)};
      const open=single(bar,'.cli_settings_button');
      return visible(bar)?{stage:'notice',root:bar,open:open?fragmentControl(open):null}:{stage:'absent'};
    }
    if (!legacyVisible(panel)) return visible(bar)?unknown():{stage:'absent'};
    const inputs=[...panel.querySelectorAll('input,[role="switch"],[role="checkbox"],[role="radio"]')];
    if (!inputs.length || panel.querySelector('form,select,textarea,iframe,[contenteditable]') ||
        inputs.some(input=>!input.matches('input.cli-user-preference-checkbox[type="checkbox"]'))) return unknown();
    const preferences=inputs.map(input=>{
      const name=input.id.replace(/^wt-cli-checkbox-/,'');
      return {id:input.id,purpose:categories[name],value:checked(input),grantsWhen:true,
        control:checkboxControl(input,legacyVisible)};
    });
    if (!preferences.some(p=>p.purpose==='essential')) return unknown();
    const save=single(panel,'#wt-cli-privacy-save-btn.cli_setting_save_button[data-cli-action="accept"]');
    // Category cookies can change before Save. They are not commit receipts.
    return {stage:'preferences',root:panel,preferences,save:save?fragmentControl(save,save,()=>legacyVisible(save)):null};
  }
};

const COOKIEBOT_NAMES = {Preferences:'preferences',Statistics:'analytics',Marketing:'advertising',Necessary:'essential'};
function cookiebotPurpose(input) {
  if (input.disabled && input.checked && [...(input.labels || [])].some(label=>/^(necessary|essential)( cookies)?$/i.test(label.textContent.trim()))) return 'essential';
  const suffix=input.id.replace(/^CybotCookiebotDialogBodyLevelButton/,'');
  if (COOKIEBOT_NAMES[suffix]) return COOKIEBOT_NAMES[suffix];
  if (/^IAB(Purpose|Vendor)LegitimateInterest\d+$/.test(suffix)) return 'advertising';
  return {necessary:'essential',preferences:'preferences',statistics:'analytics',marketing:'advertising'}[input.name];
}
export const cookieBot = {
  id:'cookiebot',
  owns:()=>[...document.querySelectorAll('#CybotCookiebotDialog')].some(visible),
  observe() {
    if(document.querySelectorAll('#CybotCookiebotDialog').length>1)return unknown();
    const panel=single(document,'#CybotCookiebotDialog');
    if (!visible(panel)) return {stage:'absent'};
    const reject=single(panel,'#CybotCookiebotDialogBodyButtonDecline');
    if (clickable(reject)) return {stage:'reject',root:panel,effect:'deny-optional',reject:control(reject)};
    const save=[...panel.querySelectorAll('#CybotCookiebotDialogBodyButtonAcceptSelected,#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection,#CybotCookiebotDialogBodyLevelButtonAccept,.cb-button')]
      .filter(element=>clickable(element) && !grantsAll(element) && (!element.matches('.cb-button') || /^(save preferences|done)$/.test(label(element))));
    if (!save.length) {
      const open=[...panel.querySelectorAll('#CybotCookiebotDialogBodyLevelButtonCustomize,#CybotCookiebotDialogBodyButtonDetails,.cb-button,.js-cookie-settings,[data-toggle="collapse"]')]
        .filter(element=>clickable(element) && (!element.matches('.cb-button') || label(element)==='manage cookies'));
      const descriptor=open.length===1?control(open[0]):null;
      if(!descriptor && panel.querySelector('input,[role="switch"],[role="checkbox"],[role="radio"]'))return unknown();
      if(descriptor)descriptor.fragmentLink=true;
      return {stage:'notice',root:panel,open:descriptor};
    }
    const inputs=[...panel.querySelectorAll('input,[role="switch"],[role="checkbox"],[role="radio"]')];
    if (save.length!==1 || !inputs.length || panel.querySelector('form,select,textarea,iframe,[contenteditable]') ||
        inputs.some(input=>!input.matches('input[type="checkbox"]'))) return unknown();
    const preferences=inputs.map(input=>({id:input.id || input.name,purpose:cookiebotPurpose(input),value:checked(input),grantsWhen:true,control:checkboxControl(input)}));
    return {stage:'preferences',root:panel,preferences,save:control(save[0])};
  }
};

// A visible supported provider or an attempted flow owns its controls. Hidden
// leftovers do not suppress unrelated providers. Unknown visible preferences
// remain exclusive: falling back would abandon the stronger safety policy.
export const CONSENT_ADAPTERS = [sourcepointUS,cookieYes,cookieBot,oneTrustGroups];
let claimedOwner;
const histories=new Map();
export function consentOwner() {
  if(claimedOwner && claimedOwner.observe().stage==='absent')claimedOwner=null;
  if(claimedOwner)return claimedOwner;
  return CONSENT_ADAPTERS.find(adapter=>{
    if(!adapter.owns())return false;
    const snapshot=adapter.observe();
    // A notice with no settings path retains the existing generic policy.
    // Unknown preferences and attempted flows cannot take that fallback.
    return snapshot.stage!=='absent' && !(snapshot.stage==='notice' && !snapshot.open);
  });
}
export function claimConsent(owner) {
  claimedOwner=owner;
  if (!histories.has(owner.id)) histories.set(owner.id,{});
  return histories.get(owner.id);
}
export function finishConsent(owner,result) {
  if (claimedOwner===owner && ['closed','saved'].includes(result.outcome)) claimedOwner=null;
}

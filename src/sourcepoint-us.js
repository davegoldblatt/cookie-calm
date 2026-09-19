import {clickable, label, visible} from './dom.js';

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

export class SourcepointUS {
  constructor(run) {
    this.run = run;
    this.name = 'sourcepoint-us-opt-out';
  }
  panel() {
    if (!isSourcepointUSManager()) return null;
    const panels = [...document.querySelectorAll('.message-container .message.type-modal')].filter(visible);
    return panels.length === 1 ? panels[0] : null;
  }
  detect() {
    const panel = this.panel();
    return Boolean(panel && (this.started || panel.querySelector('.sp_choice_type_SE')));
  }
  isShowing() { return Boolean(this.panel()); }
  isUtility() { return false; }
  stopObservers() {}
  controls() {
    const panel = this.panel();
    if (!panel || document.querySelector('form,input,select,textarea,[contenteditable],.pm-tab,.pm-tabs,[role="tab"]')) return null;
    // Save commits frame-wide preferences, including hidden or sibling controls.
    const toggles = [...document.querySelectorAll('.pm-toggle,[role="switch"],[role="checkbox"],[role="radio"]')];
    const saves = [...panel.querySelectorAll('.sp_choice_type_SE')];
    if (toggles.length !== 1 || saves.length !== 1) return null;
    const [toggle] = toggles, [save] = saves;
    const on = toggle.querySelector(':scope > span.on');
    if (!panel.contains(toggle) || !toggle.matches('button.pm-toggle[type="button"][role="switch"]') ||
        !OPT_OUT.test(label(toggle)) || !['true','false'].includes(toggle.getAttribute('aria-checked')) ||
        !save.matches('button') || label(save) !== 'save and close' ||
        !on || label(on) !== 'on' || !clickable(on) ||
        [toggle,save].some(control => control.form || control.hasAttribute('formaction') ||
          control.closest('a[href],label') || !clickable(control))) return null;
    return {toggle, on, save};
  }
  async runMethod(method) {
    const run = this.run;
    if (method === 'OPEN_OPTIONS') { this.started = true; this.prepared = false; return; }
    if (method === 'DO_CONSENT') {
      let controls = this.controls();
      if (!controls) throw new Error('Unrecognized Sourcepoint US preferences');
      if (controls.toggle.getAttribute('aria-checked') === 'false') {
        await run.beforeClick();
        run.assertActive();
        controls = this.controls();
        if (!controls) throw new Error('Sourcepoint US preferences changed');
        if (controls.toggle.getAttribute('aria-checked') === 'false') {
          // This provider listens on the On segment, not the outer button.
          controls.on.click();
          run.registerClick();
        }
      }
      for (let attempt = 0; attempt < 15; attempt++) {
        await run.wait(100);
        controls = this.controls();
        if (!controls) throw new Error('Sourcepoint US preferences unavailable');
        if (controls.toggle.getAttribute('aria-checked') === 'true') { this.prepared = true; return; }
      }
      throw new Error('Sourcepoint US opt-out did not turn on');
    }
    if (method === 'SAVE_CONSENT') {
      if (!this.prepared) throw new Error('Sourcepoint US opt-out was not verified');
      await run.beforeClick();
      run.assertActive();
      const controls = this.controls();
      if (!controls || controls.toggle.getAttribute('aria-checked') !== 'true') {
        throw new Error('Sourcepoint US opt-out is not on');
      }
      controls.save.click();
      run.registerClick();
    }
  }
}

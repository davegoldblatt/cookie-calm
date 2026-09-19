import CMP from '../vendor/consent-o-matic/CMP.js';
import Action from '../vendor/consent-o-matic/Action.js';
import Tools from '../vendor/consent-o-matic/Tools.js';
import Consent from '../vendor/consent-o-matic/Consent.js';
import Bridge from '../vendor/consent-o-matic/ConsentEngine.js';
import { clickable, grantsAll } from './dom.js';
import { SourcepointUS, isSourcepointUSManager } from './sourcepoint-us.js';

const NONE = Object.freeze({ A: false, B: false, D: false, E: false, F: false, X: false });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clickableForRule(element, cmp) {
  const panel = cmp.name === 'cookiebar' && element?.closest('#cliSettingsPopup.cli-modal.cli-show');
  const save = panel && element.matches('#wt-cli-privacy-save-btn.cli_setting_save_button[data-cli-action="accept"]');
  const necessary = panel?.querySelector?.('#wt-cli-checkbox-necessary.cli-user-preference-checkbox');
  if (save) {
    const optional = [...panel.querySelectorAll('.cli-user-preference-checkbox')].filter(input => input !== necessary);
    // Saving selected preferences must never become an accidental accept-all.
    if (!necessary?.checked || !optional.length || optional.some(input => input.type !== 'checkbox' || input.checked)) return false;
  }
  if (clickable(element)) return true;
  if (!panel || !necessary || panel.getAttribute('aria-hidden') !== 'true') return false;
  const input = element.matches('label[for]') ? panel.querySelector(`#${CSS.escape(element.htmlFor)}`) : element;
  const toggle = input?.matches('input.cli-user-preference-checkbox[id^="wt-cli-checkbox-"]') && input !== necessary;
  if (!save && !toggle) return false;
  if (element.disabled || input?.disabled || element.getAttribute('aria-disabled') === 'true' || element.closest('[inert],a[href]')) return false;
  for (let node = element; node; node = node.parentElement) {
    if (node !== panel && node.getAttribute('aria-hidden') === 'true') return false;
  }
  // CookieYes legacy opens this dialog without updating its stale aria-hidden.
  // Ignore only that known ancestor; keep actual rendering and all other guards.
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0 &&
    element.checkVisibility({checkOpacity:true, checkVisibilityCSS:true});
}

const setConsent = Consent.prototype.setEnabled;
Consent.prototype.setEnabled = async function(enabled) {
  await setConsent.call(this, enabled);
  Bridge.singleton.assertActive();
  if (!enabled && this.enabledMatcher) {
    let stillEnabled = false;
    // Missing categories are common across variants. A present, still-on category is a failed choice.
    try { stillEnabled = this.isEnabled() === true; } catch {}
    if (stillEnabled) throw new Error('An optional consent category stayed enabled');
  }
};

// Every nested action goes through this factory. Vendor code remains unchanged.
const create = Action.createAction.bind(Action);
Action.createAction = function(config, cmp) {
  const action = create(config, cmp);
  const execute = action.execute.bind(action);
  action.execute = async function(param) {
    const run = Bridge.singleton;
    run.assertActive();
    if (['hide', 'close'].includes(config.type) || config.openInTab) return;
    if (['click', 'multiclick'].includes(config.type)) {
      const results = config.type === 'multiclick' ? Tools.find(config, true) : [Tools.find(config)];
      for (const { target } of results) {
        run.assertActive();
        // Hidden checkbox inputs are valid when their visible label is the control.
        let control = target;
        if (target?.matches('input[type="checkbox"]') && !clickableForRule(target, cmp)) {
          control = [...(target.labels || [])].find(label => clickableForRule(label, cmp));
        }
        if (!control || !clickableForRule(control, cmp) || target?.disabled) continue;
        if (grantsAll(control)) continue; // The dedicated fallback owns acceptance.
        await run.wait(Math.min(config.timeout ?? 40, 500));
        await run.beforeClick?.();
        run.assertActive();
        if (!clickableForRule(control, cmp)) continue;
        control.click();
        run.registerClick();
        await run.wait(Math.min(config.timeout ?? 60, 500));
      }
      return;
    }
    if (config.type === 'wait') return run.wait(Math.min(config.waitTime || 0, 5000));
    if (config.type === 'waitcss') {
      const retries = Math.min(config.retries ?? 10, 40);
      for (let n = 0; n <= retries; n++) {
        run.assertActive();
        const present = Boolean(Tools.find(config).target);
        if (config.negated ? !present : present) return;
        await run.wait(Math.min(config.waitTime || 250, 1000));
      }
      return;
    }
    if (config.type === 'slide') await run.beforeClick?.();
    await execute(param);
    run.assertActive();
  };
  return action;
};
Action.prototype.waitTimeout = function(ms) { return Bridge.singleton.wait(ms); };

export class RuleEngine {
  constructor(rules, host) {
    Bridge.topFrameUrl = host;
    this.cmps = [new SourcepointUS(this), ...Object.entries(rules).map(([name, config]) => new CMP(name, config))];
    this.tried = new Set();
    this.cancelled = false;
    this.numClicks = 0;
    this.pipEnabled = false;
  }
  reset() { this.tried.clear(); }
  cancel() { this.cancelled = true; }
  assertActive() {
    if (this.cancelled || Date.now() > this.deadline || this.numClicks >= 200) throw new Error('Consent run stopped');
  }
  async wait(ms) {
    for (let remaining = ms; remaining > 0; remaining -= 100) {
      this.assertActive();
      await sleep(Math.min(remaining, 100));
    }
    this.assertActive();
  }
  registerClick() { this.numClicks++; }
  getClicksSoFar() { return this.numClicks; }
  currentMethodDone() {}
  // GDPR rules and generic fallbacks cannot take over an inverse opt-out panel.
  get exclusive() { return isSourcepointUSManager(); }
  showing(cmp) {
    try { return cmp.detect() && cmp.isShowing(); } catch { return false; }
  }
  async runNext() {
    const cmp = this.cmps.find(candidate => (!this.exclusive || candidate instanceof SourcepointUS) &&
      !this.tried.has(candidate.name) && this.showing(candidate));
    if (!cmp) return null;
    this.tried.add(cmp.name);
    Bridge.singleton = this;
    this.deadline = Date.now() + 18000;
    this.numClicks = 0;
    this.cancelled = false;
    try {
      if (cmp.isUtility()) {
        await cmp.runMethod('UTILITY', NONE);
      } else {
        for (const method of ['OPEN_OPTIONS', 'DO_CONSENT', 'SAVE_CONSENT']) {
          this.assertActive();
          await cmp.runMethod(method, NONE);
        }
      }
      await this.wait(400);
      return { name: cmp.name, clicks: this.numClicks, dismissed: !cmp.isUtility() && this.numClicks > 0 && !this.showing(cmp) };
    } catch {
      return { name: cmp.name, clicks: this.numClicks, dismissed: false };
    } finally {
      cmp.stopObservers();
      Tools.setBase(null);
    }
  }
}

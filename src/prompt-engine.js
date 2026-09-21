import {clickable} from './dom.js';
import {plan, shape} from './prompt-model.js';

// Adapters observe and describe. This is the only native action path for them.
export function usable(control) {
  const element = control?.element, target = control?.target || element;
  if (!element?.isConnected || !target?.isConnected || !(element === target || element.contains(target) ||
      (target.matches('label') && target.control === element))) return false;
  if (element.disabled || target.disabled || element.getAttribute('aria-disabled') === 'true' || target.getAttribute('aria-disabled') === 'true') return false;
  for (const node of [element,target]) {
    const anchor=node.closest('a[href]');
    if(anchor && !(control.fragmentLink && anchor===element && /^#[\w-]*$/.test(anchor.getAttribute('href'))))return false;
    if ((node.form && !node.matches('button[type="button"]')) || node.hasAttribute('formaction') || node.hasAttribute('download') || node.closest('[inert],summary')) return false;
    if (node.closest('form') && !node.matches('button[type="button"]')) return false;
  }
  return control.usable ? control.usable() : clickable(target);
}

export async function runPrompt(adapter, hooks) {
  let clicks = 0, expectedShape, submitted = false;
  const started = Date.now(), history=hooks.history || {}, attempted = history.attempted ||= new Set();
  expectedShape=history.shape;
  const result = (outcome,reason='') => ({provider:adapter.id,category:adapter.category || 'consent',outcome,reason,clicks,submitted});
  const active = () => {
    hooks.assertActive();
    if (Date.now()-started > 18000 || clicks >= 60) throw new Error('Prompt budget exhausted');
  };
  const wait = async ms => {
    for (let left=ms; left>0; left-=100) { active(); await new Promise(resolve=>setTimeout(resolve,Math.min(left,100))); }
    active();
  };
  const observe = () => { active(); return adapter.observe(); };
  try {
    for (let step=0; step<80; step++) {
      const snapshot = observe();
      if (snapshot.stage === 'preferences') {
        if (expectedShape && expectedShape !== shape(snapshot)) return result('unsupported','preferences-changed');
        expectedShape = history.shape = shape(snapshot);
      }
      const action = plan(snapshot);
      if (action.type === 'stop') return result(snapshot.stage === 'blocked'?'blocked':'unsupported',action.reason);
      if (attempted.has(action.id)) return result('unconfirmed','state-did-not-change');
      if (action.type === 'set-preference' && !(action.control?.activation === 'toggle' ||
          (action.control?.activation === 'set' && action.control.sets === action.goal))) return result('unsupported','unknown-activation');
      if (!usable(action.control)) return result('unsupported','unsafe-control');
      if (['save','reject'].includes(action.type)) await hooks.beforeCommit?.(snapshot.receipt);
      await hooks.beforeClick();
      active();
      const current = observe(), next = plan(current);
      if (expectedShape && current.stage === 'preferences' && expectedShape !== shape(current)) return result('unsupported','preferences-changed');
      // A replaced target or a changed goal needs a fresh guard, not a stale click.
      if (next.type !== action.type || next.id !== action.id || next.goal !== action.goal ||
          next.control?.element !== action.control.element || next.control?.target !== action.control.target) continue;
      if (!usable(next.control)) return result('unsupported','unsafe-control');
      const receiptBefore=current.receipt?.read?.();
      hooks.onActivate?.(next,current);
      active();
      attempted.add(action.id);
      const target=next.control.target || next.control.element;
      const preventNavigation=event=>event.preventDefault();
      // A provider settings link activates its handler without changing the URL.
      if(next.control.fragmentLink)target.addEventListener('click',preventNavigation,{capture:true,once:true});
      try { target.click(); }
      finally { if(next.control.fragmentLink)target.removeEventListener('click',preventNavigation,true); }
      clicks++;
      if (['save','reject'].includes(action.type)) submitted = true;
      let changed = false;
      const timeout = ['save','reject','dismiss'].includes(action.type) ? 2200 : 1800;
      for (let elapsed=0; elapsed<timeout; elapsed+=100) {
        await wait(100);
        const after = observe();
        if (['save','reject'].includes(action.type) && receiptBefore === false && current.receipt?.read?.() === true) return result('saved');
        if (['save','reject','dismiss'].includes(action.type) && after.stage === 'absent') return result('closed');
        if (after.stage === 'preferences' && expectedShape && shape(after) !== expectedShape) return result('unsupported','preferences-changed');
        if (action.type === 'open' && after.stage === 'preferences') { changed=true; break; }
        if (action.type === 'set-preference' && after.stage === 'preferences' && after.preferences.find(p=>p.id===action.id)?.value === action.goal) { changed=true; break; }
        if (after.stage === 'blocked') return result('blocked','protected');
      }
      if (!changed) {
        if(action.type==='dismiss' && adapter.recovery && hooks.presentation && adapter.recovery()) {
          if(await hooks.presentation.ensureStyle()) {
            await hooks.beforeClick();
            active();
            const recovery=adapter.recovery();
            if(recovery && hooks.presentation.apply(recovery)) {
              adapter.recovered?.();
              return result('hidden');
            }
          }
        }
        return result('unconfirmed',submitted?'save-unconfirmed':'state-did-not-change');
      }
    }
    return result('unconfirmed','unstable-controls');
  } catch (error) {
    return result(clicks && !error?.message?.startsWith('Automatic clicks blocked')?'unconfirmed':'blocked',
      error?.message?.startsWith('Automatic clicks blocked')?'page-guard':error?.message==='User interaction deferred'?'user-interaction':'cancelled-or-unavailable');
  }
}

import {clickable, visible} from './dom.js';

export const control = (element,target=element,usable) => ({element,target,usable});
export const single = (root,selector) => { const nodes=root?.querySelectorAll(selector); return nodes?.length===1?nodes[0]:null; };
export const checked = element => element?.matches('input[type="checkbox"]') ? element.checked :
  element?.getAttribute('aria-checked')==='true' ? true : element?.getAttribute('aria-checked')==='false' ? false : null;
export function checkboxControl(input, isUsable=clickable) {
  const target = isUsable(input) ? input : [...(input.labels || [])].find(isUsable);
  return {...control(input,target,()=>Boolean(target && isUsable(target))),activation:'toggle'};
}

// Only the known CookieYes legacy dialog has this stale aria-hidden exception.
export function legacyVisible(element) {
  if (!element?.isConnected) return false;
  const panel = element.closest('#cliSettingsPopup.cli-modal.cli-show');
  if (!panel || panel.getAttribute('aria-hidden') !== 'true') return visible(element);
  if (element.closest('[inert]')) return false;
  for(let node=element;node;node=node.parentElement) if(node!==panel && node.getAttribute('aria-hidden')==='true') return false;
  const style=getComputedStyle(element);
  return style.display!=='none' && style.visibility!=='hidden' && element.getClientRects().length>0 && element.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
}

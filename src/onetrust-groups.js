import {visible,clickable,label,grantsAll} from './dom.js';
import {single,control,checkboxControl} from './consent-controls.js';

// One researched OneTrust integration, not a claim about all OneTrust layouts.
// The prose settings link is a native provider control. Never use its Close-
// labelled acceptance button or reach into page-world provider APIs.
const unknown = reason => ({stage:'unsupported',reason:reason || 'unknown-preferences'});
const names={C0004:'targeting cookies',C0002:'performance cookies'};
const templateFields={
  'vendor-search-handler':['text','#ot-pc-lst'],
  'chkbox-id':['checkbox','#ot-fltr-modal'],
  'select-all-hosts-groups-handler':['checkbox','#ot-pc-lst'],
  'select-all-vendor-groups-handler':['checkbox','#ot-pc-lst'],
  'select-all-vendor-leg-handler':['checkbox','#ot-pc-lst']
};
const named=(element,text)=>element && label(element)===text;
function measurementFrame(frame,panel) {
  if(!frame.matches('iframe.ot-text-resize[title="onetrust-text-resize"][sandbox="allow-same-origin"][aria-hidden="true"]') ||
      frame.hasAttribute('src') || frame.hasAttribute('srcdoc') || getComputedStyle(frame).position!=='absolute' ||
      !(parseFloat(getComputedStyle(frame).top)<=-10000) || visible(panel) && frame.getBoundingClientRect().bottom>=0)return false;
  try {
    const doc=frame.contentDocument;
    return doc?.URL==='about:blank' && doc.body && !doc.body.childElementCount && !doc.body.textContent.trim();
  } catch {return false;}
}
function preferences(panel) {
  if(!panel || !chrome.dom?.openOrClosedShadowRoot || panel.querySelector('form,textarea,select,[contenteditable],[role="switch"],[role="checkbox"],[role="radio"]'))return null;
  const descendants=[panel,...panel.querySelectorAll('*')];
  if(descendants.length>1000 || descendants.some(node=>node.localName.includes('-') || node.shadowRoot ||
      node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node)))return null;
  const frames=[...panel.querySelectorAll('iframe')];
  if(frames.length>1 || frames.some(frame=>!measurementFrame(frame,panel)))return null;
  const content=single(panel,'#ot-pc-content'),groups=content?.querySelectorAll('.ot-cat-item');
  if(groups?.length!==2)return null;
  const necessary=single(content,'.ot-cat-item[data-optanongroupid="C0001"]');
  const group=single(content,'.ot-cat-item[data-optanongroupid="OSSTA_BG"]');
  if(!necessary || !group || necessary.querySelector('input') ||
      !named(single(necessary,'#ot-header-id-C0001'),'strictly necessary cookies') ||
      !named(single(necessary,'.ot-always-active'),'always active') ||
      !named(single(group,'#ot-header-id-OSSTA_BG'),'targeted advertising'))return null;
  const parent=single(group,'input.category-switch-handler[type="checkbox"][data-optanongroupid="OSSTA_BG"]');
  if(!parent || parent.id!=='ot-group-id-OSSTA_BG' || single(document,'#ot-group-id-OSSTA_BG')!==parent ||
      parent.disabled || parent.indeterminate || parent.labels.length!==1 || !group.contains(parent.labels[0]) ||
      !named(parent.labels[0],'targeted advertising'))return null;
  const children=[...group.querySelectorAll('.ot-subgrp')];
  if(children.length!==2 || group.querySelectorAll('input').length!==3)return null;
  const allowed=new Set([parent]);
  const result=[{id:'C0001',purpose:'essential',value:true,grantsWhen:true,observed:true},
    {id:'OSSTA_BG',purpose:'sale-sharing',value:parent.checked,grantsWhen:true,control:checkboxControl(parent)}];
  for(const child of children) {
    const id=child.getAttribute('data-optanongroupid'),input=single(child,'input');
    if(!names[id] || !named(single(child,'h5'),names[id]) || !input ||
        !input.matches('input.cookie-subgroup-handler[type="checkbox"]') || input.id!==`ot-sub-group-id-${id}` ||
        input.getAttribute('data-optanongroupid')!==id || input.getAttribute('aria-label')?.toLowerCase()!==names[id] ||
        single(document,`#${input.id}`)!==input || input.indeterminate || input.disabled)return null;
    allowed.add(input);
    result.push({id,purpose:id==='C0004'?'advertising':'performance',value:input.checked,grantsWhen:true,observed:true});
  }
  if(new Set(result.map(p=>p.id)).size!==4)return null;
  const inputs=[...panel.querySelectorAll('input')];
  if(inputs.length>20)return null;
  for(const input of inputs) {
    if(allowed.has(input))continue;
    const template=templateFields[input.id],scope=template && input.closest(template[1]);
    if(!template || input.type!==template[0] || !scope || !panel.contains(scope) ||
        getComputedStyle(scope).display!=='none' || single(panel,`#${input.id}`)!==input)return null;
  }
  for(const selector of ['#ot-pc-lst','#ot-fltr-modal']) {
    const section=panel.querySelector(selector);
    if(section && getComputedStyle(section).display!=='none')return null;
  }
  return result;
}

let opened=false;
export const oneTrustGroups={
  id:'onetrust-zd-group',
  interactionRoots:()=>[...document.querySelectorAll('#onetrust-banner-sdk,#onetrust-pc-sdk')],
  owns() {
    const bar=document.querySelector('#onetrust-banner-sdk'),panel=document.querySelector('#onetrust-pc-sdk');
    return Boolean(bar?.querySelector('.zdcOpenPc') && (visible(bar)||visible(panel)));
  },
  activated(action) {if(action.type==='open')opened=true;},
  dispose() {opened=false;},
  observe() {
    if(!this.interactionRoots().some(visible))return {stage:'absent'};
    const bar=single(document,'#onetrust-banner-sdk'),panel=single(document,'#onetrust-pc-sdk');
    if(!bar || document.querySelectorAll('#onetrust-pc-sdk').length>1)return unknown();
    if(!visible(bar) && !visible(panel))return {stage:'absent'};
    const link=single(bar,'a.zdcOpenPc[href="#"]');
    const opening=()=>link && clickable(link) && named(link,'subject to your privacy choices') ?
      {stage:'notice',root:bar,open:{...control(link),fragmentLink:true}} : unknown('no-settings-control');
    // This provider creates its panel lazily. Preflight existing markup when
    // available; otherwise only the reviewed settings action is authorized.
    if(!panel)return opening();
    const values=preferences(panel);
    if(!values)return unknown();
    const save=single(panel,'button.save-preference-btn-handler');
    if(!save || grantsAll(save) || !named(save,'confirm my choices') || save.form || save.closest('form') || save.hasAttribute('formaction'))return unknown('no-save-control');
    if(visible(panel)) {
      if(!opened)return {stage:'blocked',reason:'user-interaction'};
      return {stage:'preferences',root:panel,preferences:values,save:control(save)};
    }
    return opening();
  }
};

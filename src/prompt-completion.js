import {visible, roots} from './dom.js';

export const ABSENCE_DWELL = 400;
const LIMIT = 2500;
const SURFACE = 'dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"]';
const surface = node => node.matches(SURFACE) || ['fixed','sticky'].includes(getComputedStyle(node).position);
function bounds(node) {
  const rect = node.getBoundingClientRect();
  if (rect.width && rect.height) return rect;
  const children = [...node.querySelectorAll('*')];
  if (children.length > 100) return null;
  const rects = children.filter(visible).map(n=>n.getBoundingClientRect());
  return rects.length ? {left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),
    top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))} : null;
}
const overlaps = (a,b) => !a || Math.min(a.right,b.right)>Math.max(a.left,b.left) && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);

// Evidence about remaining obstructions never grants permission to act on them.
// Observe only changes during this action, rather than scanning all page content
// on every poll or treating a coarse budget fingerprint as an element identity.
export class PromptCompletion {
  constructor(container, equivalent, existing=[]) {
    this.container=container;this.rect=bounds(container);this.equivalent=equivalent;
    this.existing=new WeakSet(existing.filter(node=>!node.contains(container) && !container.contains(node) && visible(node)));
    this.pending=new Map();this.surfaces=new Set();this.observed=new Set();
    this.inspected=0;this.exhausted=false;this.absentAt=0;
    this.observer=new MutationObserver(records=>this.record(records));
    for(const root of roots())this.observe(root);
  }
  observe(root) {
    if(this.observed.has(root))return;
    this.observed.add(root);
    this.observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,
      attributeFilter:['class','style','hidden','aria-hidden','role','open']});
  }
  add(node,deep) {
    if(!(node instanceof Element))return;
    for(let parent=node.parentElement,depth=0;parent && depth<10;parent=parent.parentElement,depth++) {
      if(this.pending.get(parent)===true)return;
    }
    if(!this.pending.has(node) && this.pending.size>=256) {
      // Preserve all observations by inspecting a shared subtree once. Never
      // drop overflow records and later infer absence from an incomplete scan.
      const parent=node.parentElement;
      const siblings=parent && !parent.matches('html,body') ? [...this.pending.keys()].filter(child=>parent.contains(child)) : [];
      if(siblings.length<2){this.exhausted=true;return;}
      for(const child of siblings)this.pending.delete(child);
      this.pending.set(parent,true);return;
    }
    this.pending.set(node,deep || this.pending.get(node) || false);
  }
  record(records) {
    for(const record of records) {
      if(record.type==='childList')for(const node of record.addedNodes)this.add(node,true);
      else this.add(record.target instanceof Element?record.target:record.target.parentElement,record.type==='attributes');
    }
  }
  inspect(node) {
    if(++this.inspected>LIMIT){this.exhausted=true;return;}
    if(!node.isConnected || this.container.contains(node))return;
    const shadow=node.shadowRoot || (node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node));
    if(shadow && !this.observed.has(shadow)) {
      this.observe(shadow);
      for(const child of shadow.children)this.add(child,true);
    }
    for(let current=node,depth=0;current && depth<10;current=current.parentElement,depth++) {
      if(current.matches('html,body'))break;
      const remainingDepth=10-depth;
      if((this.checked.get(current)||0)>=remainingDepth)break;
      this.checked.set(current,remainingDepth);
      if(this.existing.has(current))break;
      if(this.equivalent(current) || surface(current)) {
        if(this.surfaces.size>=256){this.exhausted=true;return;}
        this.surfaces.add(current);break;
      }
    }
  }
  settled(gone) {
    this.record(this.observer.takeRecords());
    // Deduplicate high-frequency mutation records within each poll. A poll
    // that cannot inspect its changes still permanently withholds completion.
    this.inspected=0;
    this.checked=new Map();
    // Added ancestor roots subsume their descendant mutation records.
    const work=[...this.pending];this.pending.clear();
    for(const [node,deep] of work) {
      if(this.exhausted)break;
      if(!node.isConnected || this.container.contains(node))continue;
      if(work.some(([other,subtree])=>other!==node && subtree && other.contains(node)))continue;
      this.inspect(node);
      if(deep && !node.matches('html,body')) {
        const walker=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT);let next;
        while(!this.exhausted && (next=walker.nextNode()))this.inspect(next);
      }
    }
    const remaining=[...this.surfaces].some(node=>visible(node) &&
      (this.equivalent(node) || surface(node) && overlaps(this.rect,node.getBoundingClientRect())));
    if(!gone || remaining || this.exhausted || this.pending.size){this.absentAt=0;return false;}
    this.absentAt ||= Date.now();
    return Date.now()-this.absentAt>=ABSENCE_DWELL;
  }
  dispose() {
    this.observer.disconnect();this.pending.clear();this.surfaces.clear();this.observed.clear();this.checked?.clear();
  }
}

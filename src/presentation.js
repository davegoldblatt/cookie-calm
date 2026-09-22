import {visible} from './dom.js';
import {opaqueID} from './identity.js';

export const HIDE_ATTRIBUTE='data-cookie-calm-hide';
export const UNLOCK_ATTRIBUTE='data-cookie-calm-unlock';
const SIMPLE_HIDE_ATTRIBUTE='data-cookie-calm-app-hide';

// Small banners need no viewport recovery. Keep their ownership independent of
// the full obstruction helper, including detached nodes awaiting restoration.
export class CosmeticHides {
  constructor() {this.token=opaqueID();this.elements=new Set();this.sheets=new Map();this.observers=new Map();}
  hide(element) {
    if(this.elements.size>=12 || element.hasAttribute(SIMPLE_HIDE_ATTRIBUTE))return false;
    const root=element.getRootNode();
    if(!('adoptedStyleSheets' in root))return false;
    let sheet=this.sheets.get(root);
    if(!sheet) {
      sheet=new CSSStyleSheet();sheet.replaceSync(`[${SIMPLE_HIDE_ATTRIBUTE}="${this.token}"]{display:none!important}`);
      root.adoptedStyleSheets=[...root.adoptedStyleSheets,sheet];this.sheets.set(root,sheet);
    }
    element.setAttribute(SIMPLE_HIDE_ATTRIBUTE,this.token);this.elements.add(element);
    const observer=new MutationObserver(()=>this.releaseElement(element));
    observer.observe(element,{subtree:true,attributes:true,childList:true,characterData:true});
    this.observers.set(element,observer);
    if(visible(element)) {this.releaseElement(element);return false;}
    return true;
  }
  releaseElement(element) {
    this.observers.get(element)?.disconnect();this.observers.delete(element);
    if(element.getAttribute(SIMPLE_HIDE_ATTRIBUTE)===this.token)element.removeAttribute(SIMPLE_HIDE_ATTRIBUTE);
    this.elements.delete(element);
  }
  release() {
    for(const element of this.elements)this.releaseElement(element);
    for(const [root,sheet] of this.sheets)root.adoptedStyleSheets=root.adoptedStyleSheets.filter(current=>current!==sheet);
    this.sheets.clear();
  }
}
const MODALS='dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[popover]:popover-open';
const CONTENT='article,main,[role="main"]';
const LOCKED=new Set(['hidden','clip']);

// No saved site styles: USER-origin CSS overrides author rules while these
// document-specific attributes exist. Releasing reveals the site's current CSS.
export function presentationCSS(token) {
  return `[${HIDE_ATTRIBUTE}="${token}"]{display:none!important}`+
    `html[${UNLOCK_ATTRIBUTE}="${token}"]{overflow-y:auto!important}`+
    `body[${UNLOCK_ATTRIBUTE}="${token}"]{overflow-x:clip!important;overflow-y:visible!important}`+
    `body[${UNLOCK_ATTRIBUTE}="${token}-body"]{overflow-y:auto!important}`;
}
function clearContent(element) {
  if (!element?.isConnected || !visible(element)) return false;
  for(let node=element;node;node=node.parentElement) {
    const style=getComputedStyle(node);
    if(node.inert || node.getAttribute('aria-hidden')==='true' || style.filter!=='none' || Number(style.opacity)<0.95)return false;
  }
  return true;
}
function competingModal(surface, strict=false) {
  const selector=strict?':modal,[aria-modal="true"]':MODALS;
  return [...document.querySelectorAll(selector)].some(node=>!surface.contains(node) && visible(node));
}
function viewportLocked() {
  const html=getComputedStyle(document.documentElement).overflowY;
  return LOCKED.has(html) || html==='visible' && LOCKED.has(getComputedStyle(document.body).overflowY);
}
function contentCandidates(surface) {
  const outside=node=>!surface.contains(node) && !node.contains(surface) && node.getClientRects().length;
  const main=[...document.querySelectorAll('main,[role="main"]')].filter(outside);
  return main.length?main:[...document.querySelectorAll('article')].filter(outside);
}
function pageObstructed(surface, content) {
  const rect=content.getBoundingClientRect();let sampled=0;
  const left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(innerWidth,rect.right),bottom=Math.min(innerHeight,rect.bottom);
  if(right<=left || bottom<=top)return true;
  for(const node of [document.documentElement,document.body])for(const pseudo of ['::before','::after']) {
    const style=getComputedStyle(node,pseudo);
    if(!['none','normal'].includes(style.content) && style.position==='fixed' && Number(style.opacity)>0 &&
      parseFloat(style.width)*parseFloat(style.height)>=innerWidth*innerHeight*0.25 &&
      (style.backgroundImage!=='none' || !['transparent','rgba(0, 0, 0, 0)'].includes(style.backgroundColor)))return true;
  }
  // Probe points within the existing content, not arbitrary absolute-positioned
  // decorations elsewhere. A pseudo-element backdrop returns its owning body.
  for(const x of [0.2,0.5,0.8])for(const y of [0.2,0.5,0.8]) {
    const px=left+(right-left)*x,py=top+(bottom-top)*y;
    sampled++;
    const hit=document.elementFromPoint(px,py);
    if(surface.contains(hit))return true;
    if(content.contains(hit))continue;
    const fixed=hit?.closest('header,nav');
    // Small navigation can legitimately cover a sample near the top edge.
    if(fixed && ['fixed','sticky'].includes(getComputedStyle(fixed).position) && fixed.getBoundingClientRect().height<innerHeight*0.15)continue;
    return true;
  }
  return sampled===0;
}

export class Presentation {
  constructor(prepare) {
    this.token=opaqueID();this.prepare=prepare;this.ready=false;this.current=null;
    this.observer=new MutationObserver(()=>this.release(true));
    this.changedState=()=>this.changed();
  }
  async ensureStyle() {
    if(!this.ready)this.ready=Boolean(await this.prepare(this.token));
    return this.ready;
  }
  describe(surface) {
    if(this.current || surface.getRootNode()!==document || !visible(surface) || getComputedStyle(surface).position!=='fixed')return null;
    if(surface.matches('html,body,main,article,nav,header,footer,dialog,[popover]') ||
      surface.querySelector(`${CONTENT},nav,form,input,textarea,select,iframe,video,audio,[contenteditable],dialog,[popover]`))return null;
    if(document.querySelector(':modal') || competingModal(surface))return null;
    const descendants=[surface,...surface.querySelectorAll('*')];
    if(descendants.length>1000 || descendants.some(node=>node.localName.includes('-') || node.shadowRoot ||
      node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node)))return null;
    if([document.documentElement,document.body].some(node=>['fixed','sticky'].includes(getComputedStyle(node).position)))return null;
    const candidates=contentCandidates(surface);
    if(!candidates.length || candidates.some(node=>!clearContent(node)))return null;
    const content=candidates.find(node=>{const r=node.getBoundingClientRect();return r.top<innerHeight && r.bottom>0;});
    if(!content)return null;
    return {surface,content};
  }
  apply(plan) {
    const fresh=this.describe(plan.surface);
    if(!this.ready || !fresh || fresh.content!==plan.content)return false;
    const {surface,content}=plan;
    if(surface.hasAttribute(HIDE_ATTRIBUTE) || [document.documentElement,document.body].some(node=>node.hasAttribute(UNLOCK_ATTRIBUTE)))return false;
    const focused=surface.contains(document.activeElement)?document.activeElement:null;
    surface.setAttribute(HIDE_ATTRIBUTE,this.token);
    this.probeLock();
    // display:none normally releases focus itself. Do not focus arbitrary page
    // controls or submit forms to escape a provider's focus management.
    if(surface.contains(document.activeElement))document.activeElement.blur();
    if(visible(surface) || !clearContent(content) || viewportLocked() || competingModal(surface) ||
      pageObstructed(surface,content) || surface.contains(document.activeElement)) {
      this.removeAttributes(surface);
      if(focused?.isConnected && document.activeElement===document.body)focused.focus({preventScroll:true});
      return false;
    }
    this.current={surface,content,text:surface.textContent};
    this.observer.observe(surface,{attributes:true,childList:true,characterData:true,subtree:true});
    for(const event of ['fullscreenchange','close','cancel'])document.addEventListener(event,this.changedState,true);
    return true;
  }
  removeAttributes(surface) {
    if(surface.getAttribute(HIDE_ATTRIBUTE)===this.token)surface.removeAttribute(HIDE_ATTRIBUTE);
    this.releaseUnlock();
  }
  releaseUnlock() {
    for(const node of [document.documentElement,document.body]) {
      if([this.token,this.token+'-body'].includes(node?.getAttribute(UNLOCK_ATTRIBUTE)))node.removeAttribute(UNLOCK_ATTRIBUTE);
    }
  }
  changed() {
    if(this.current && !this.timer)this.timer=setTimeout(()=>{this.timer=null;this.maintain();},100);
  }
  probeLock() {
    this.releaseUnlock();
    if(!viewportLocked() || Math.max(document.scrollingElement.scrollHeight,document.body.scrollHeight)<=innerHeight)return;
    if(getComputedStyle(document.documentElement).overflowY==='visible') {
      // Preserve body-to-viewport overflow propagation and sticky positioning.
      document.body.setAttribute(UNLOCK_ATTRIBUTE,this.token+'-body');
    } else {
      document.documentElement.setAttribute(UNLOCK_ATTRIBUTE,this.token);
      if(LOCKED.has(getComputedStyle(document.body).overflowY))document.body.setAttribute(UNLOCK_ATTRIBUTE,this.token);
    }
  }
  maintain() {
    const current=this.current;if(!current)return;
    const {surface,content}=current;let cloned=false;
    for(const node of document.querySelectorAll(`[${HIDE_ATTRIBUTE}="${this.token}"]`)) {
      if(node!==surface){node.removeAttribute(HIDE_ATTRIBUTE);cloned=true;}
    }
    if(!surface.isConnected) {this.release(cloned);return;}
    if(surface.getAttribute(HIDE_ATTRIBUTE)!==this.token || !clearContent(content)) {this.release(true);return;}
    // Yield while an actual modal owns page interaction, then probe again when
    // it closes. Non-modal menus and inert carousel slides do not own scrolling.
    if(competingModal(surface,true)) {this.releaseUnlock();return;}
    this.probeLock();
    // Never retain a hidden obstruction over an unrepairable CSS scroll lock.
    if(viewportLocked())this.release(true);
  }

  release(reverted=false) {
    clearTimeout(this.timer);this.timer=null;
    this.observer.disconnect();
    for(const event of ['fullscreenchange','close','cancel'])document.removeEventListener(event,this.changedState,true);
    if(this.current)this.removeAttributes(this.current.surface);
    const previous=this.current;this.current=null;
    if(previous && reverted)this.onRevert?.();
  }
}

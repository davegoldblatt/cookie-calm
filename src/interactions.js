import { CANDIDATES, CATEGORIES } from './annoyance-rules.js';

// Retain element identities, never text entered into a field.
export class Interactions {
  constructor() {
    this.reset();
    this.listeners = new AbortController();
    this.observed = new WeakSet();
    this.observe(document);
  }
  observe(root) {
    if (this.observed.has(root)) return;
    this.observed.add(root);
    for (const name of ['pointerdown', 'keydown', 'input', 'change', 'focusin']) root.addEventListener(name, event => this.record(event), {capture:true, signal:this.listeners.signal});
  }
  disconnect() { this.listeners.abort(); }
  automatic(action) {
    // Native checkbox input/change events can be trusted even when .click()
    // initiated them. Suppress only this synchronous activation, never a timer.
    this.automaticDepth=(this.automaticDepth || 0)+1;
    try {return action();} finally {this.automaticDepth--;}
  }
  reset() {
    this.touched = new WeakSet(); this.protected = new WeakSet(); this.keys = new Set();
    this.intentNodes = new WeakSet();
    this.targets = new Set(); this.categories = new Set(); this.gestureAt = 0; this.revision=0;
  }
  noteChange(node) {
    if (node.matches?.('html,body')) return;
    if (Date.now() - this.gestureAt < 10000) this.intentNodes.add(node);
  }
  openedByUser(container) {
    for (let node = container; node; node = node.parentElement || node.getRootNode()?.host) {
      if (this.intentNodes.has(node)) return true;
    }
    return false;
  }
  record(event) {
    if (!event.isTrusted || this.automaticDepth) return;
    if (event.type === 'focusin' && !this.recent()) return; // Website autofocus is not user intent.
    if (event.type === 'keydown' && !['Enter', ' ', 'Tab','k','m','Escape'].includes(event.key) && !event.target.matches?.('input,textarea,[contenteditable]')) return;
    this.revision++;
    if(event.type==='keydown' && event.key==='Escape')this.gestureAt=Date.now();
    const path = event.composedPath().filter(node => node instanceof Element);
    const control = path.find(node => node.matches('button,a,input,textarea,select,[role="button"],[contenteditable],video,audio'));
    if (control) {
      this.gestureAt = Date.now();
      for (const attribute of ['aria-controls','aria-owns','data-target','data-bs-target','href']) {
        const value = control.getAttribute(attribute) || '';
        if (attribute === 'href' && !value.startsWith('#')) continue;
        for (const id of value.replace(/^#/, '').split(/\s+/)) if (/^[\w-]+$/.test(id)) this.targets.add(id);
      }
      if (control.matches('button,a,[role="button"]')) {
        const text = control.getAttribute('aria-label') || control.textContent || '';
        for (const [category,pattern] of CATEGORIES) if (pattern.test(text)) this.categories.add(category);
      }
    }
    for (const node of path) {
      if (node.matches(CANDIDATES)) this.protected.add(node);
      if (!node.matches('html,body')) this.touched.add(node);
    }
  }
  recent() { return Date.now() - this.gestureAt < 1500; }
  protect(container, key) { this.protected.add(container); if (key) this.keys.add(key); }
  permits(container, key, category) {
    // Save, comment, and similar controls can open authentication without
    // mentioning it. Keep the resulting prompt protected beyond the short defer.
    if (['registration','adblock','privacy-notice','survey'].includes(category) && (Date.now() - this.gestureAt < 10000 || this.openedByUser(container))) {
      this.protect(container, key); return false;
    }
    const controlled = [...this.targets].some(id => {
      const selector = `#${CSS.escape(id)}`;
      return container.closest(selector) || container.querySelector(selector);
    });
    if (this.keys.has(key) || this.categories.has(category) || controlled || this.protected.has(container) || this.touched.has(container)) {
      this.protect(container, key); return false;
    }
    // Focus moved into a prompt during the gesture grace period is conservatively
    // protected, including site autofocus. Otherwise an unrelated gesture defers.
    if (this.recent()) return false;
    return true;
  }
}

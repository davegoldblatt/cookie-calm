import { CANDIDATES, CATEGORIES } from './annoyance-rules.js';

// Retain element identities, never text entered into a field.
export class Interactions {
  constructor() {
    this.reset();
    this.observed = new WeakSet();
    this.observe(document);
  }
  observe(root) {
    if (this.observed.has(root)) return;
    this.observed.add(root);
    for (const name of ['pointerdown', 'keydown', 'input', 'change', 'focusin']) root.addEventListener(name, event => this.record(event), true);
  }
  reset() {
    this.touched = new WeakSet(); this.protected = new WeakSet(); this.keys = new Set();
    this.targets = new Set(); this.categories = new Set(); this.gestureAt = 0;
  }
  record(event) {
    if (!event.isTrusted) return;
    if (event.type === 'focusin' && !this.recent()) return; // Website autofocus is not user intent.
    if (event.type === 'keydown' && !['Enter', ' ', 'Tab','k','m'].includes(event.key) && !event.target.matches?.('input,textarea,[contenteditable]')) return;
    const path = event.composedPath().filter(node => node instanceof Element);
    const control = path.find(node => node.matches('button,a[href],input,textarea,select,[role="button"],[contenteditable],video,audio'));
    if (control) {
      this.gestureAt = Date.now();
      for (const attribute of ['aria-controls','aria-owns','data-target','data-bs-target','href']) {
        const value = control.getAttribute(attribute) || '';
        if (attribute === 'href' && !value.startsWith('#')) continue;
        for (const id of value.replace(/^#/, '').split(/\s+/)) if (/^[\w-]+$/.test(id)) this.targets.add(id);
      }
      if (control.matches('button,a[href],[role="button"]')) {
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

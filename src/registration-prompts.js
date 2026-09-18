import { label, visible } from './dom.js';

// Category detector, independent of domain names and of the action executor.
// These selectors identify inline gates; ordinary dialogs use the same detector.
export const REGISTRATION_CONTAINERS = [
  '[data-testid="sign-in-gate-main"]',
  ...['sign-in-gate', 'signin-gate', 'registration-wall', 'registration-prompt', 'regwall']
    .flatMap(word => [`[id*="${word}" i]`, `[class*="${word}" i]`])
].join(',');
export const REGISTRATION_INTENT = /\b(sign[ -]?in|log[ -]?in|register|create (a |an |your )?(free )?account)\b/i;
const INVITATION = /\bthis is not a paywall\b|\b(sign[ -]?in|log[ -]?in|register|create (a |an |your )?(free )?account|enter (your )?email)\b.{0,100}\b((continue|keep) reading|read (on|more|the (full |rest of )?(article|story))|for free|free account)\b/i;
const REQUIRED_AUTH = /\b(session|expired|timed out|signed out|logged out|sign[ -]?in again|re-?authenticat\w*|verify (it'?s )?you|confirm your identity)\b/i;
const PAID_ACCESS = /\b(subscrib\w*|paid access|purchase|payment|paywall)\b/i;
const SIGN_IN_CONTROL = /^(sign[ -]?in|log[ -]?in|register|create (a |an |your )?(free )?account)\b/i;
const FIELDS = 'form,input,textarea,select,[contenteditable],iframe';

function invitation(container, text) {
  if (container.matches('a,button,input,form') || container.closest('form') || container.querySelector(FIELDS)) return false;
  if (REQUIRED_AUTH.test(text) || PAID_ACCESS.test(text.replace(/\bthis is not a paywall\b/ig,''))) return false;
  if (!INVITATION.test(text.replace(/\s+/g,' '))) return false;
  return [...container.querySelectorAll('a[href],button,[role="button"]')]
    .some(control => visible(control) && SIGN_IN_CONTROL.test(label(control)));
}

export function isRegistrationPrompt(container, text, isOverlay) {
  if (!isOverlay && !container.matches(REGISTRATION_CONTAINERS)) return false;
  if (!invitation(container, text)) return false;
  // Prefer the prompt itself to an outer wrapper that remains after dismissal.
  // This also lets the shared verifier check removal without changing article CSS.
  return ![...container.querySelectorAll(REGISTRATION_CONTAINERS)]
    .some(child => visible(child) && invitation(child, child.innerText || child.textContent || ''));
}

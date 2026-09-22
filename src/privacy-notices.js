import {label, visible} from './dom.js';

// Reviewed notice adapters are distinct from consent adapters. A native Close
// may change consent elsewhere, so neither its label nor cookie text is enough.
const normalized = text => text.replace(/\s+/g, ' ').trim();
const PMC_BODY = normalized(`This website is now part of PMX Global, LLC, a subsidiary of Penske Media Corporation. By continuing to use our services, you agree to the PMC Terms of Use, including waiver and arbitration. PMC, its service providers, and third-party partners process information about you and how you use our services, including clicks and screen recordings, using first and third-party cookies, pixels, and similar technologies. Where applicable, you can opt out of certain uses of cookies via the Your Privacy Choices link in our footer. Learn more about our data practices in our Privacy Policy.`);
const PMC_CONTAINER = 'aside.duet--navigation--pmc-privacy-banner';

function pmcNotice(container) {
  if (!chrome.dom?.openOrClosedShadowRoot || chrome.dom.openOrClosedShadowRoot(container)) return false;
  if (window.top !== window || container.getAttribute('aria-modal') === 'true' || !container.matches(PMC_CONTAINER) || !['fixed','sticky'].includes(getComputedStyle(container).position) ||
      container.closest('form') || container.querySelector('form,input,textarea,select,iframe,[contenteditable],dialog,[role="dialog"],[role="alertdialog"],[aria-modal="true"],summary')) return false;
  // Unreviewed custom elements, shadow controls and focusable additions stop.
  const nodes = [...container.querySelectorAll('*')];
  if (nodes.length > 80 || nodes.some(node =>
      !['div','p','a','button','svg','title','line','rect','path','g'].includes(node.localName) ||
      node.hasAttribute('role') || node.hasAttribute('tabindex') ||
      node.shadowRoot || (node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node)))) return false;
  const headings = container.querySelectorAll('#pmc-privacy-banner-heading');
  const bodies = container.querySelectorAll('#pmc-privacy-banner-body');
  const controls = container.querySelectorAll('button,[role="button"],a:not([href]),[role="checkbox"],[role="switch"],[role="radio"]');
  if (headings.length !== 1 || bodies.length !== 1 || controls.length !== 1) return false;
  const [heading] = headings, [body] = bodies, [close] = controls;
  if (!visible(heading) || !visible(body) || !close.matches('button[type="button"][aria-label="Dismiss privacy notice"]') ||
      label(close) !== 'dismiss privacy notice' || !['','Close'].includes(normalized(close.textContent)) || normalized(heading.textContent) !== 'Terms of Use/Your Privacy Rights' ||
      normalized(body.textContent) !== PMC_BODY) return false;
  // Extra instructions anywhere in the component invalidate the reviewed copy.
  const copy = container.cloneNode(true);
  for (const node of copy.querySelectorAll('button,#pmc-privacy-banner-heading,#pmc-privacy-banner-body')) node.remove();
  if (normalized(copy.textContent)) return false;
  const links = [...container.querySelectorAll('a[href]')];
  const destinations = [
    ['Terms of Use','https://www.pmc.com/terms-of-use/'],
    ['Your Privacy Choices','https://www.pmc.com/privacy-policy#appendix'],
    ['Privacy Policy','https://www.pmc.com/privacy-policy/']
  ];
  return links.length === destinations.length && destinations.every(([text,href],index) =>
    normalized(links[index].textContent) === text && links[index].href === href && body.contains(links[index]));
}

export const PRIVACY_NOTICE_RULES = [{
  id:'duet-pmc-privacy-notice', category:'privacy-notice', container:PMC_CONTAINER,
  reviewedNotice:pmcNotice, control:'button[type="button"][aria-label="Dismiss privacy notice"]',
  controlLabel:/^dismiss privacy notice$/, action:'dismissed',
  source:'https://www.bigblueview.com/_next/static/chunks/2n1ahgw_35r8n.js'
}];

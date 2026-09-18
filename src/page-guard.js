import { roots, visible } from './dom.js';

// Conservative local heuristics, not a site-reputation service. Never inspect field values.
const SCAM_LANGUAGE = /your (computer|device|pc) (is|has been) (infected|blocked)|virus(es)? (has|have) been detected|call.{0,50}(microsoft|apple|technical|security) support|congratulations.{0,45}(you('ve| have)? won|winner)|claim your (prize|reward|airdrop)|enter (your )?(seed|recovery) phrase|verify.{0,35}(seed|recovery) phrase|press.{0,15}(windows|win).{0,8}(\+|and).{0,5}r\b|paste.{0,50}(powershell|terminal|command prompt)|disable.{0,30}(antivirus|security protection)|pay.{0,35}(unlock|release your funds)/i;
const WALLET = /connect (your |a )?(crypto )?wallet|walletconnect|seed phrase|recovery phrase/i;

export function addressGuard(url) {
  try {
    const address = new URL(url);
    // Local development pages have no public-site identity to assess.
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname);
    if (!loopback && address.protocol !== 'https:') return 'No automatic acceptance on an unencrypted page.';
    if (address.hostname.split('.').some(part => part.startsWith('xn--'))) return 'No automatic acceptance on an internationalized domain.';
    return '';
  } catch { return 'The page address could not be checked.'; }
}

let cached, revision = 0, cachedRevision = -1, cachedUrl;
export function invalidateAssessment() { revision++; }
export function assessPage() {
  if (cached && cachedRevision === revision && cachedUrl === location.href) return cached;
  cached = evaluatePage(); cachedRevision = revision; cachedUrl = location.href;
  return cached;
}
function evaluatePage() {
  const protectedPath = /\/(checkout|cart|basket|login|log-in|signin|sign-in|register|account|billing)(\/|$)/i.test(location.pathname);
  const searchRoots = roots();
  const text = searchRoots.map(root => (root === document ? document.body?.innerText : root.textContent) || '').join('\n').slice(0,150000).replace(/[’‘]/g,"'");
  if (SCAM_LANGUAGE.test(text)) return { stopAll: true, stopAccept: true, reason: 'Suspicious instructions on this page. No automatic clicks.' };
  if (WALLET.test(text)) return { stopAll: false, stopAccept: true, stopPromotions: true, reason: 'Wallet-related page. Automatic acceptance is paused.' };
  for (const root of searchRoots) {
    for (const field of root.querySelectorAll('input')) {
      if (!visible(field)) continue;
      const identity = `${field.name} ${field.id} ${field.autocomplete}`;
      if (field.type === 'password' || /password|passcode|one-time-code|cc-number|cc-csc|card.?number|cvv|cvc|credit.?card/i.test(identity)) {
        return { stopAll: false, stopAccept: true, stopPromotions: true, reason: 'Password or payment form. Automatic acceptance is paused.' };
      }
    }
    for (const frame of root.querySelectorAll('iframe')) {
      if (visible(frame) && /payment|credit.?card|checkout|wallet|stripe\.com|paypal\.com/i.test(`${frame.title} ${frame.src}`)) {
        return { stopAll: false, stopAccept: true, stopPromotions: true, reason: 'Embedded payment form. Automatic acceptance is paused.' };
      }
    }
    for (const link of root.querySelectorAll('a[href], [role="button"], button')) {
      if (!visible(link)) continue;
      if (link.hasAttribute('download') || /\.(exe|msi|dmg|pkg|apk|crx)([?#]|$)/i.test(link.getAttribute('href') || '') || /^download\b|^install\b/i.test((link.innerText || link.textContent || '').trim())) {
        return { stopAll: false, stopAccept: true, stopPromotions: protectedPath, reason: 'Software download prompt. Automatic acceptance is paused.' };
      }
    }
  }
  return { stopAll: false, stopAccept: false, stopPromotions: protectedPath, reason: '' };
}

import { REGISTRATION_CONTAINERS, REGISTRATION_INTENT } from './registration-prompts.js';
import { ADBLOCK_REQUEST } from './promotion-controls.js';

// Original rules based on public DOM structure. No third-party filter list is bundled.
export const RULES = [
  {
    id: 'guardian-support', category: 'support', hosts: ['theguardian.com', 'www.theguardian.com'],
    container: 'gu-island[name="StickyBottomBanner"]', context: /support|subscription|ad[ -]free/i,
    control: 'button', controlLabel: /^collapse banner$/, action: 'collapsed', successLabel: /^expand banner$/,
    source: 'https://github.com/guardian/dotcom-rendering/tree/main/dotcom-rendering/src/components/marketing/banners',
  },
  {
    id: 'smart-app-banner', category: 'app',
    container: '.smartbanner.smartbanner--ios, .smartbanner.smartbanner--android',
    required: '.smartbanner__info, .smartbanner__info__title', context: /app store|google play|view|install|download/i,
    hide: true, source: 'https://github.com/ain/smartbanner.js',
  }
];
export const CATEGORIES = [
  ['adblock', ADBLOCK_REQUEST],
  ['registration', REGISTRATION_INTENT],
  ['newsletter', /\bnewsletters?\b|\b(sign up|subscribe|get updates)\b.{0,60}\b(email|inbox|updates|news)\b/i],
  ['support', /\b(donat(?:e|ion|ions)|contribut(?:e|ion|ions))\b|\bsupport (us|our|the guardian|independent|journalism)\b/i],
  ['subscription', /\b(subscrib(?:e|ing)|subscriptions?)\b|\bad[ -]free\b/i],
  ['offer', /\b(special offer|exclusive offer|discount|coupon|promo code|save \d+%|\d+% off)\b/i],
  ['survey', /\b(take (a |our |this )?survey|short survey|rate (us|your experience)|give us feedback|share your feedback)\b/i],
  ['app', /\b(install|download|get|open|use|try) (our |the |this )?(mobile )?app\b|\bcontinue in (the )?app\b/i],
  ['notifications', /\b(enable|allow|turn on|receive|subscribe to|stay updated with) (push |desktop |browser )?notifications\b/i],
  ['chat', /\b(chat with us|how can (we|i) help|need (any )?help|send us a message|talk to (us|an expert))\b/i],
];
export const CANDIDATES = [
  REGISTRATION_CONTAINERS,
  'dialog[open]', '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]', '.jw-flag-floating',
  ...['newsletter', 'subscription', 'subscribe', 'donation', 'promo', 'popup', 'pop-up', 'modal', 'app-banner',
    'appbanner', 'slidedown', 'survey', 'chat-widget', 'chat-window', 'floating-video']
    .flatMap(word => [`[id*="${word}" i]`, `[class*="${word}" i]`, `[data-testid*="${word}" i]`]),
  ...RULES.map(rule => rule.container)
].join(',');

# Chrome Web Store listing

## Name

Cookie Calm

## Summary

Reject optional cookies and automatically dismiss supported promotional popups. Local rules, protected forms, and per-site pause.

## Category and language

Privacy & Security. English.

## Description

Spend less time on cookie banners and unwanted popups.

Cookie Calm automatically rejects optional cookies on supported websites. It uses recognized controls and bundled Consent-O-Matic rules to apply your choice.

Promotional dismissal works automatically in both cookie modes. Supported newsletter, donation, subscription, discount, survey, app, notification, and chat prompts close or minimize. The Guardian support banner uses its native collapse control. Recognized optional registration invitations use safe close controls across sites. Actual sign-in forms and session-expiry warnings stay available.

Supported optional adblock requests use their visible decline controls. If an explicit decline fails and the obstruction can be isolated, Cookie Calm can reversibly hide it and restore CSS scrolling. This result is reported as hidden. It does not enable ads or change other extensions.

Reviewed Duet/PMC privacy notices use their native Close control. The popup reports notice closure separately from cookie consent. Changed instructions or controls prevent automatic dismissal.

Cookie preferences:

- Reject optional cookies: the default. Unknown forms stay visible.
- Allow acceptance if needed: try rejection first, then allow a recognized acceptance action if needed. This can permit tracking cookies.
- Pause on a site, or pause everywhere, from the extension popup. Pausing restores elements hidden by Cookie Calm.

Conservative local checks stop clicks on certain suspicious prompts. Password, payment, and wallet signals stop promotional actions and the acceptance fallback. Software-download signals stop the acceptance fallback.

These checks can miss scams or stop on legitimate pages. Cookie Calm does not certify that a website is safe.

Recognized user-opened prompts and protected forms stay available. Rules handle supported inactive floating video prompts. Playing or previously played media stays available. Chat handling covers proactive greetings without a conversation or composer.

All rules ship with the extension. There is no account, telemetry, remote AI, or background rule download.

Cookie Calm processes website addresses, page text, and control states on your device. It observes interaction events without recording typed values. It stores preferences locally and temporary tab status in session storage.

Website access lets the extension find consent forms and promotional prompts. Website controls can send their normal requests to their providers.

Some prompts still need manual handling. Generic promotion labels currently use English. Paid-only content still requires access, and Chrome permission prompts remain outside this release.

Cookie Calm does not block trackers, erase cookies, or undo choices saved by website controls.

Open source under the MIT license. Built on Consent-O-Matic's MIT-licensed interpreter and rules, with attribution included.

## Links

- Website: https://davegoldblatt.github.io/cookie-calm/
- Privacy: https://davegoldblatt.github.io/cookie-calm/privacy.html
- Support: https://github.com/davegoldblatt/cookie-calm/issues
- Contact: dave@davegoldblatt.com

## Assets

- Icon: `../static/icons/128.png`
- Small promotional tile: `assets/promo-440x280.png`
- Screenshot 1: `assets/screenshot-1.png`
- Screenshot 2: `assets/screenshot-2.png`
- Screenshot 3: `assets/screenshot-3.png`

The screenshots use the actual extension popup with controlled demonstration pages.

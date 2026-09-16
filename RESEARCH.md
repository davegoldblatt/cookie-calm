# Research and implementation decisions

Research date: September 11, 2026.

| Source | Finding | Decision |
| --- | --- | --- |
| [Consent-O-Matic project](https://consentomatic.au.dk/) | It applies user preferences to recognized consent forms. Its authors acknowledge incomplete coverage. | Reuse its rule approach and state the coverage limit. |
| [Official repository](https://github.com/cavi-au/Consent-O-Matic) | The project includes declarative rules, a JavaScript interpreter, and an MIT license. | Vendor a pinned snapshot with attribution. |
| [I still don't care about cookies](https://addons.mozilla.org/en-GB/firefox/addon/istilldontcareaboutcookies/) | Its listing says it can accept cookies when necessary for a site to work. | Make acceptance an explicit user choice. |
| [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Content scripts use page DOM in an isolated environment. Injection can include frames. | Use Manifest V3 content scripts on HTTP and HTTPS pages. |
| [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage) | Extensions have local and session storage. | Keep preferences local and tab status temporary. |
| [Playwright extension tests](https://playwright.dev/docs/chrome-extensions) | Extension tests use Chromium persistent contexts with an unpacked extension. | Verify the actual artifact in a separate profile. |
| [Chrome unsafe-site warnings](https://support.google.com/chrome/answer/99020?hl=en) | Chrome Safe Browsing warns about phishing, malware, and social engineering. | Keep browser protection separate from local acceptance guards. |

## Source inspection

Pinned commit: `8ca8500d26434c586039e126ad091e1bfccd205d`.

The referenced rule list contains 203 distinct files. The build merges their rule definitions into a local JSON resource.

The upstream OneTrust banner utility can accept when its settings button is absent. Cookie Calm blocks known accept-all controls during rule execution.

The upstream engine normally stops detection after a short period. Cookie Calm continues bounded detection for delayed banners and page changes.

The upstream rules include cosmetic hiding and window actions. Cookie Calm disables hiding, window closing, and new-tab actions.

Cookie Calm uses its own scheduler and popup. Six vendored modules provide detection, matching, and rule interpretation.

The acceptance guard uses local text and visible controls. It does not use a reputation database or certify that a site is safe.

Clear scam phrases stop all clicks. Sensitive forms, wallet prompts, downloads, public HTTP pages, and internationalized domains prevent acceptance.

These signals favor missed dismissals over automatic acceptance. They can produce false positives and false negatives.

The build avoids remote rules to keep operation local and reproducible. This choice makes rule updates manual.

## Design

The popup is a small utility, with the site control before global preferences. All content is left aligned.

The palette uses paper `#ffffff`, sky `#e9f3f9`, ink `#203848`, blue `#175d83`, green `#23685f`, and slate `#576b78`.

Avenir Next gives the short headline a friendly shape. System sans-serif keeps controls legible. A bitten-cookie icon identifies the extension.

The design uses one tinted site panel. Radio controls explain the privacy difference without another setup screen.

## Validation limits

Automated fixtures exercise actual content-script injection, the popup, storage, known-provider rules, and DOM behavior in Chromium.

Fixture coverage does not establish universal live-site coverage. A dismissed banner does not establish tracking compliance.

## Publication research — September 16, 2026

[Consent-O-Matic](https://consentomatic.au.dk/) already offers open-source preference-based consent automation. It is the closest existing alternative and Cookie Calm's upstream source.

[Super Agent](https://chromewebstore.google.com/detail/superagent-automatic-cook/neooppigbkahgfdhbpbhcccgpimeaafi) offers cookie preference automation with free and paid usage levels.

[I still don't care about cookies](https://github.com/OhMyGuus/I-Still-Dont-Care-About-Cookies) is another open-source option, focused on removing cookie notices.

Cookie Calm's contribution is a separate interface, local bundled rules, reject-first behavior, per-site pauses, and conservative click guards. It does not claim to invent this category.

Chrome requires the manifest at the [ZIP root](https://developer.chrome.com/docs/webstore/prepare/). Store assets include a 128-pixel icon, screenshots, and a 440-by-280 promotional tile.

Chrome's [privacy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires disclosures for local processing too. Cookie Calm therefore documents page-content processing, website addresses, stored preferences, and temporary tab status.

The publisher must complete [developer registration](https://developer.chrome.com/docs/webstore/register/), account verification, applicable declarations, and Google's review process.

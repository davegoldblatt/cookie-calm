# Cookie Calm

Reject optional cookies on supported websites. Let the browser handle the repetitive consent clicks.

Cookie Calm is an open-source Chrome extension built on [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic).
It adds a compact popup, local bundled rules, per-site pauses, and conservative checks before automatic clicks.

![Cookie Calm popup and consent controls](store/assets/screenshot-1.png)

## What it does

- Rejects optional cookies by default through recognized controls and provider rules.
- Offers an optional acceptance fallback after rejection attempts fail.
- Stops automatic clicks when local checks find certain suspicious instructions.
- Blocks acceptance around password, payment, wallet, and software download prompts.
- Supports delayed banners, embedded frames, and shadow DOM.
- Runs locally without telemetry, accounts, remote AI, or automatic rule downloads.

The popup includes a global switch and an exact-hostname pause control. Pauses also apply to embedded consent frames.

## Install

The Chrome Web Store listing is not available yet. The prepared package still requires developer registration and Google's review.

1. Download the extension ZIP from [Releases](https://github.com/davegoldblatt/cookie-calm/releases/latest).
2. Extract the ZIP to a permanent folder.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Select the extracted folder that contains `manifest.json`.
7. Reload tabs that were open before installation.

Keep the extracted folder in place. Chrome loads unpacked extensions from that location.

## Choices and limits

**Reject optional cookies** uses recognized rejection buttons and consent rules. Unknown forms stay visible.

**Just dismiss the banner** tries rejection first. If rejection fails, it can use a recognized acceptance button. This can allow tracking.

Scam checks use local heuristics and some English phrases. They can miss scams or stop on legitimate pages. They do not certify websites.

Public HTTP pages and internationalized domains cannot use the acceptance fallback. Loopback addresses remain available for local development.

A checkmark means that a banner disappeared after an action. It does not prove that the site stored or honors the choice.

Settings apply to new consent choices. They do not undo previous consent. The extension does not delete cookies or block trackers.

It does not bypass paywalls or handle browser notification and location prompts. Some sites still require a manual choice.

The bundled rules need release updates as websites change. Unpacked installations require manual updates.

## Existing alternatives

This is an existing category. [Consent-O-Matic](https://consentomatic.au.dk/) is the closest open-source alternative and supplies Cookie Calm's rule foundation.

[Super Agent](https://chromewebstore.google.com/detail/superagent-automatic-cook/neooppigbkahgfdhbpbhcccgpimeaafi) also applies saved preferences to supported consent forms.

[I still don't care about cookies](https://github.com/OhMyGuus/I-Still-Dont-Care-About-Cookies) focuses on removing cookie notices.

Cookie Calm's main additions are local packaging, simplified controls, guarded actions, and an explicit acceptance fallback.

## Privacy

Cookie Calm reads page text, consent controls, and addresses locally to perform its features. It does not transmit them to the maintainer.

Settings stay in local extension storage. Temporary tab status stays in session storage. Website consent controls can send their normal requests.

Read the [privacy policy](PRIVACY.md) for the data categories, retention, and contact details.

## Build and test

Requires Node 22 or later and Python 3.

```sh
git clone https://github.com/davegoldblatt/cookie-calm.git
cd cookie-calm
npm ci --ignore-scripts
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm test
npm run package
```

The build writes an unpacked extension to `extension/`. Packaging writes a Chrome Web Store ZIP to `dist/` with `manifest.json` at its root.

Playwright tests load the actual extension into isolated Chromium profiles. Fixtures cover consent flows, false positives, cancellation, frames, and guards.

See [validation](VALIDATION.md), [contribution instructions](CONTRIBUTING.md), and the [store submission guide](store/SUBMISSION.md).

## Credits and license

MIT license. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

The bundled Consent-O-Matic snapshot contains 203 rule files, merged into 202 named definitions. Its original license remains included.

Cookie Calm is an independent derivative. It is not affiliated with or endorsed by Aarhus University or the Consent-O-Matic authors.

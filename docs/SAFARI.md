# Safari preview

Cookie Calm now has a separate Safari build from the same source as the Chrome extension.
It targets Safari 26 or later on Mac. Nine controlled checks passed in installed Safari 26.6.2. This is a temporary development preview, not an App Store release.
Installation and testing on iPhone or iPad are not yet verified.

## Build

Requires Node 22 or later and Python 3.

```sh
npm ci --ignore-scripts
npm run package:safari
```

Outputs:

- `build/safari/`: extension resources, with `manifest.json` at the root.
- `dist/cookie-calm-1.2.5-safari-preview.zip`: the same resources, ready for temporary loading or Apple's packager.
- `dist/SAFARI-SHA256SUMS.txt`: the ZIP checksum.

The Safari command does not change the Chrome build or Chrome release archives.
The ZIP is not a signed Mac app or an iPhone installation package.

## Try it in Safari on Mac

Safari 26.6.2 on the development Mac exposes the temporary installation control.
Other Safari versions may require the Xcode route below.

1. Open Safari > Settings > Advanced.
2. Select **Show features for web developers**.
3. Open the **Developer** tab, then choose **Add Temporary Extension…**.
4. Complete the Mac authentication prompt yourself. Do not share your password.
5. Choose the Safari ZIP, or the extracted folder containing `manifest.json`.
6. In **Extensions**, enable Cookie Calm for your test profile.
7. Open **Edit Websites…** and allow the websites you want Cookie Calm to handle.
8. Reload the test page. Open Cookie Calm's toolbar button to check its version and results.

Website permission is separate from the extension's enabled switch. Without permission, page automation cannot run.
Private browsing and other Safari profiles can require separate permission.
Safari removes temporary extensions after 24 hours or when Safari quits.
This method does not provide automatic updates or an always-installed extension.

See Apple's [running instructions](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)
and [website permission model](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions).

## Persistent installation and iPhone/iPad

For the Mac app distributed through GitHub, see [direct distribution](SAFARI-DIRECT-DISTRIBUTION.md).
That work requires Developer ID signing and notarization. The temporary preview is not the durable installer.

For a normal distribution, package the extension inside an Apple app.
Apple offers two routes:

- **App Store Connect web packager:** enroll in the Apple Developer Program, create a macOS/iOS app record, and upload the Safari ZIP through the Safari Web Extension Packager in the Xcode Cloud tab. Test the resulting build through TestFlight before submitting it for review.
- **Full Xcode:** run `xcrun safari-web-extension-packager build/safari` to generate the app project. Older Xcode versions name the tool `safari-web-extension-converter`. Select the intended platforms, configure signing, and test the app before distribution.

The web packager does not require a local Xcode installation. It does require an eligible Apple developer account.
The local tool requires full Xcode; Command Line Tools alone did not provide it on this Mac.
An iOS app can deliver the extension to iPhone and iPad, but the resource ZIP cannot be installed directly there.
No Apple app record, signing identity, enrollment, submission, or approval is implied by this preview.

Sources: Apple's [web packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect),
[Xcode packager](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari),
and [distribution options](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

## Compatibility decisions

The build changes the minimum browser setting and JavaScript compilation target. A Safari-specific capability check also stops automation if closed-root inspection is unavailable.
It retains the same permissions, local rules, consent policy, guards, content script settings, popup and service worker.
Safari supports the `chrome` namespace and Promise-based extension APIs, so no compatibility shim is required by the documented API surface.

| Dependency | Documented Safari availability | Decision |
| --- | --- | --- |
| Manifest V3 service worker | 15.4 | Keep the existing worker. |
| `storage.session` | 16.4 | Keep temporary status out of persistent storage. |
| User-origin `scripting.insertCSS` | 18 | Retain user-origin styles; refuse failed insertion. |
| Document IDs and inherited-origin content script injection | 18.4 | Keep document targeting and frame coverage. |
| `dom.openOrClosedShadowRoot` | 26 | Set the Safari minimum to 26.0. |
| Badge background color | API exists, no visual effect | Do not use color as the only status indicator. |

When packaging an app, set and verify the intended deployment targets as well as the manifest minimum. Closed-root inspection serves both discovery and safety checks. Supporting older Safari would require a separately reviewed reduction in coverage.
The code does not replace precise document targeting with tab-wide CSS or bypass guarded actions.

Sources: [Apple's compatibility guide](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility),
[WebKit's Safari 18.4 release notes](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/),
[MDN shadow-root API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot),
[Safari manifest version limits](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings),
and [MDN compatibility data](https://github.com/mdn/browser-compat-data/tree/main/webextensions).

## Validation boundaries

Run the package and WebKit checks:

```sh
npm run test:safari-package
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install webkit
npm run test:webkit
```

The package test checks Chrome preservation, manifest permissions, offline resources, syntax, full archive contents, excluded Finder metadata and same-toolchain ZIP reproducibility. Different zlib/toolchain versions can produce different compressed bytes.
The WebKit tests execute the Safari content bundle with a simulated extension message bridge.
They cover scanner behavior for rejection, accept-only banners, newsletter dismissal, survey state and open shadow DOM. They also check the Safari capability refusal and website-access hint. The bridge does not validate background guards, CSS insertion or cross-frame security.
They do not load a Safari extension. Playwright's WebKit build is not the installed Safari application.

Before calling the Safari port ready for everyday use, verify a native installation:

- Identify the Safari version, profile, loaded Cookie Calm version and granted website access.
- Verify real background messages, bundled rule loading, popup settings and session status updates.
- Check cross-origin/srcdoc frames and top-frame guards, including a suspicious top page.
- Check closed shadow DOM and the reviewed notice adapters.
- Check user-origin CSS, document targeting, scroll recovery and restoration when paused.
- Check pause/resume, page navigation, worker restart and browser restart after signed installation.
- Test live cookie, newsletter and survey examples. Record absent prompts separately from product failures.
- For iPhone/iPad, test a signed app on the intended device sizes and permission flows.

The temporary build loaded in Safari 26.6.2 after Mac authentication and website permission. Nine controlled native checks passed: rejection, newsletter and survey dismissal, closed shadow DOM, accept-only and scam refusal, cross-origin frames, parent-frame guards, and user-origin presentation recovery. These exercised the real extension APIs.
Further native lifecycle, pause restoration, trusted scrolling, live-site coverage and signed restart checks remain open. See [the validation record](../VALIDATION.md).
The initial Desktop selection failed because the delivery folder lacked a root manifest; the folder now contains the extension files directly.

## Independent review

Claude reviewed the research and plan: [raw report](audits/safari-research-plan.md).
Its packaging objection was outdated: current Apple documentation explicitly provides the web packager.
The Mac's actual Developer settings also confirm the temporary install feature.
The suggested lower minimum would remove a safety capability; this preview retains Safari 26.
Website permissions and native runtime checks are explicit installation and validation requirements above.
Native acceptance must verify badge behavior, exact frame routing and user-origin CSS.
The code already withholds cosmetic success if insertion or presentation checks fail.
The build rejects unknown targets before deleting output. Current Chrome and Safari JavaScript outputs were byte-identical despite their different compilation targets.

Claude also reviewed the [implementation](audits/safari-implementation.md). That review led to a runtime capability refusal, an explicit missing-capability fixture, fixed ZIP metadata, Finder-file exclusion and a complete Chrome directory comparison. User-facing help and privacy copy now apply across browsers, with a Safari website-access hint. The mocked bridge remains an explicit test limitation. No release command uses a broad dist glob; Safari files have a distinct preview name and checksum file.

The [follow-up audit](audits/safari-followup.md) found no blockers in the supplied changes. Its resource-list and negative-settling suggestions were added. A symbol check does not prove privileged API behavior; native closed-root validation remains required.

# Validation

## Release 1.1.1 — September 18, 2026

All **79 Playwright tests passed in one run on the final code** (5.5 minutes). The suite loads the actual unpacked extension in isolated Chromium profiles. It includes all 64 previous cases, nine registration tests, three delayed-intent cases, and three lifecycle tests.

Registration tests cover the observed Guardian structure in both cookie modes, other domains and markup, missing or unsafe close controls, real forms, session-expiry warnings, user-initiated prompts, site pause, ordinary article content, delayed hydration, and page-wide class changes. Synthetic hostnames demonstrate reusable behavior; they are not claims about live coverage on those sites.

A separate baseline check reproduced the invalidated-context errors with 1.1.0. The 1.1.1 lifecycle tests unload the extension and verify quiet shutdown, cancellation of an active consent flow, and restoration of extension-owned hiding. Chromium disables a CLI-loaded extension after runtime.reload; this harness behavior is not recorded as a product failure. Host-page refresh remains necessary to start the new content script.

### Installed profile and live limit

Chrome confirmed version **1.1.1 enabled** in the personal Gmail profile, loaded from the Desktop extension folder. Its existing acceptance-fallback preference was preserved. The Mission Control profile was not changed.

Before the update, the user-provided Guardian article showed its registration gate in that same profile: one native dismiss control, two of five article paragraphs visible, and two masked paragraphs. The captured native control is a button labelled Dismiss sign-in gate inside the sign-in-gate-main container.

After the update, all five paragraphs were visible and no gate remained. However, the diagnostic observer saw neither a gate nor a dismiss action on that visit, and the popup did not report a dismissal. Two disposable-profile visits, one per cookie mode, also showed no gate or dismissal and no extension errors. **These final visits are not proof of live automatic dismissal.** The captured markup passes the functional tests; end-to-end live confirmation remains limited by the site's variable prompt display. No claim of universal coverage is made.

The installed files match the store package byte for byte. Package SHA-256: `a86d8e4b97318e8d9f61729fe9afad47f2538a0347b772d4e6d7085319888d90`.

### Audit and publication

Claude reviewed the plan, implementation, and corrections in four read-only passes. Its final report found no remaining code blocker. The full suite passed afterward; the live-display limitation above remains explicit. See [AUDIT.md](AUDIT.md).

The dashboard still shows 1.1.0 pending review and 1.0.1 published. Upload new package is disabled during review. Version 1.1.1 is packaged separately; the pending submission was not withdrawn.

## Release 1.1.0 — September 18, 2026

All 64 Playwright tests passed against the built extension in isolated Chromium profiles: 22 existing cookie tests, four CookieYes tests, and 38 promotion tests. The suite also asserts that fixtures have no page errors.

Coverage includes the Guardian inline custom element and collapse state, eight prompt categories in both modes, protected forms and pages, active media and restored chats, trusted user intent, navigation, hydration, frames, shadow roots, bounded retries, and cosmetic restoration. Negative tests use a separate cookie-rejection witness where applicable to establish that the content script scanned.

### Browser identity and live evidence

The personal Chrome window was verified through `chrome://version` as the Default profile. Its Google account is the Gmail publisher account. The Mission Control window uses Profile 4. Cookie Calm was enabled in Default as version 1.0.0 before this update. An exploratory Guardian check in Profile 4 is **invalid for this release**, not an extension failure. The pre-update 1.0.0 check is a baseline, not a 1.1.0 result.

After replacing the unpacked folder and reloading the verified extension, a fresh Guardian US page automatically changed its native control from Collapse banner to Expand banner. No test script clicked that control. Chrome showed Cookie Calm 1.1.0 enabled in the same personal profile (Chrome 153.0.8010.37). The final package was reloaded and the automatic collapse repeated. After a deliberate reopen, the panel stayed open for at least ten seconds; it was then minimized through its native control. The installed files match the package byte for byte. A separate 30-page exploratory sample used disposable profiles and an earlier draft. It is research evidence, not final-release acceptance. Seven pages returned HTTP 401/403, Reddit presented a human challenge, and one screenshot inspection failed. Many other pages had no in-scope prompt. The sample does not support a percentage coverage claim. An Independent support panel remained visible; an Everlane inline newsletter section was correctly preserved.

The final 1.1.0 smoke sample revisited Guardian, CNBC, Intercom, and Independent in verified disposable profiles. CNBC consent was rejected. The personalized Guardian support panel appeared only in the personal-profile check. Intercom consent remained unresolved, and the Independent support banner remained unsupported. These are recorded coverage limits; no removal percentage is claimed.

### E4E Africa report

A fresh, service-worker-verified 1.1.0 profile reproduced an actual failure on e4eafrica.com/jobs/: the cookiebar flow opened settings but refused to save. CookieYes legacy 3.5.6 leaves aria-hidden=true on its visibly open dialog. This was a product compatibility issue, not a wrong-profile result.

The scoped fix keeps normal visibility checks everywhere else. Its Save path requires necessary cookies enabled and all optional consent boxes off. Four new fixtures cover successful rejection, truly hidden controls, a separate hidden ancestor, stuck and unknown categories, and the scam guard. The real site recorded necessary=yes and functional/performance/analytics/advertisement/others=no; the banner stayed dismissed after reload. The live CookieYes check passed in both cookie modes. The installed Gmail profile uses Allow acceptance if needed and already had saved acceptance from 20:51 UTC, before this fix. Its saved choices were preserved. That existing-state observation is not counted as a fresh rejection test.

### Performance

The final source was profiled for approximately 52 seconds after page load in Chromium 153.0.8010.12. Each disposable profile verified the extension through its service worker as 1.1.0.

| Page | Attributed callback time total | Longest callback | 95th percentile | Callbacks over 50 ms |
| --- | ---: | ---: | ---: | ---: |
| Guardian US | 372.7 ms | 17.1 ms | 0.35 ms | 0 |
| CNBC | 350.1 ms | 42.3 ms | 0.37 ms | 0 |
| Intercom | 175.8 ms | 49.6 ms | 0.36 ms | 0 |

Earlier traces found 59–79 ms observer callbacks. Deduplicating inserted subtrees and mutation targets removed those outliers in the repeat sample. Traces attribute callbacks with an extension URL; they do not include every microtask or all extension CPU. Page variants and timings vary. The one-second idle timer only compares the URL. Mutation observers still run on changing pages. A consent-provider flow can delay promotion handling by up to its 18-second deadline.

A further Guardian trace with four wheel scrolls measured 353.6 ms total attributed callback time, a 13.4 ms maximum, and no callbacks over 50 ms. This run includes the final controlled-target protection change.

Live interaction checks preserved the Guardian expanded menu and search field, and TechCrunch's opened search overlay for at least 3.5 seconds. GitHub login and Nike cart pages received no automatic clicks during observation. These read-only page checks did not exercise a payment or submit a login. A BBC menu check was obstructed by its consent dialog, and an Allbirds cart URL redirected to its homepage; neither is counted as a protection test.

### Audit and scope

Claude independently reviewed the plan and implementation. See [AUDIT.md](AUDIT.md) for findings and follow-up status. Generic promotional rules are English and run only in top-level or same-hostname frames. Playing media, chats with composers or logs, and protected account/payment flows remain untouched. Unknown prompts and ambiguous intent can still require manual handling.

The store ZIP has a root manifest, passes ZIP integrity checks, and matches the installed folder. SHA-256: `c720c79e5b666c4ce6ed95bf1319cfaed6082c7ab333013c3ccb073dc6a996da`. The store dashboard showed the earlier release as Published - public; the new version requires its own review.

## Release 1.0.1 — September 16, 2026

All 22 Playwright tests passed against the built Manifest V3 extension in Chromium. Each test used a separate browser profile.

The suite covers rejection, necessary cookies, acceptance fallback, French labels, provider settings, frames, shadow roots, and delayed banners.

It also checks pause controls, saved settings, unrelated forms, repeated clicks, failed category changes, cancellation, SVG graphics, and saved-choice acknowledgements.

Guard tests cover clear scam prompts, password and payment forms, wallet prompts, downloads, public HTTP pages, and internationalized domains.

The popup tests passed after removing the redundant `activeTab` permission. The extension requests `storage` and HTTP/HTTPS host access.

These tests show behavior on controlled fixtures. They do not establish universal coverage or prove that websites honor consent choices.

## Earlier live checks — September 11, 2026

| Site | Observed result |
| --- | --- |
| GOV.UK | Rejected additional cookies and dismissed the confirmation. |
| Cookiebot | Dismissed the consent dialog. Its exposed state showed necessary cookies enabled and optional categories disabled. |

These checks cover only the page variants served on that date. They have not been repeated for this publication preparation.

## Release artifacts

- The build contains 203 upstream rule files merged into 202 named definitions.
- Six upstream interpreter modules retain their original contents and MIT license.
- The Chrome Web Store ZIP has `manifest.json` at its root.
- ZIP integrity and file contents are checked against the installable folder.
- Release checksums are provided with the downloadable ZIP.
- Store screenshots show the actual popup on controlled demonstration pages.

The source, automated checks, installation guide, and privacy policy are public. Chrome Web Store availability requires submission and approval.

## Reproduce

Run the commands in [README.md](README.md#build-and-test). The [test suite](tests/extension.spec.js) and [CI workflow](.github/workflows/check.yml) are included.

Test logs and temporary browser profiles are not distributed with the source or extension.

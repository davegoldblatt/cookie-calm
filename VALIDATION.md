# Validation

## Release 1.2.5 — September 22, 2026

Tracked in [GitHub #7](https://github.com/davegoldblatt/cookie-calm/issues/7) and [PR #8](https://github.com/davegoldblatt/cookie-calm/pull/8).
The three initial positive fixtures failed against 1.2.4. A fresh disposable-profile live check confirmed the actual Epoch survey remained visible, with no automatic survey click.
The personal everyday installation was independently inspected: Store 1.2.2 enabled, unpacked 1.2.2 disabled. It was not used to score candidate behavior.

The candidate closed the actual article survey through one native `Close cookie popup` click. No rating was selected.
The site set `survey-shown=1`, the prompt disappeared, and the extension recorded one `survey` / `closed` result.
This is survey dismissal, not stored consent proof. The site's handler can record a dismissal event and suppress the survey for 30 days.
Tests used separate disposable profiles, the reported article path, and the component's natural delay.
Local captures are under `evidence/epoch-survey-2026-09-22/`; raw public-site bundles are not part of the extension package.

The initial 11 survey tests passed. A broader 72-test local regression run passed, covering promotions, the shared engine, and survey safeguards.
The semantic-header fixture initially failed because discovery stopped at the header. After correction, 36 tests passed; a subsequent 37-test shared/survey run passed with the application-shell exclusion.
Two live repeats were invalid: one navigation timed out, and one did not observe the prompt appear. Neither was counted as a product failure.
The later repeat used a page-load observer to capture the naturally mounted survey before automatic dismissal and succeeded with the strict generated-text checks.
The final code is `fc4b86d`. A fresh profile with that build enabled from page load again closed the naturally mounted Epoch survey with exactly one native X click and no selected answer.
The final archive contains 18 files (118,583 bytes), and every entry matches the built extension. Its SHA-256 is `c347b53756642e60426c0c2ad8f4aac6dc0dd129720365fc2c438444a46df2df`.
The Desktop ZIP is byte-identical. The existing Desktop extension directory was not replaced.
A final Chrome check confirmed Store 1.2.2 enabled and unpacked 1.2.2 disabled. The dashboard still showed pending 1.2.3, published 1.2.2, and Upload new package disabled.
All 15 final survey tests passed on `fc4b86d`, including delayed visibility after the ten-second gesture window. Both complete hosted runs passed all 210 tests (15.9 minutes each): [push](https://github.com/davegoldblatt/cookie-calm/actions/runs/35791092354) and [PR](https://github.com/davegoldblatt/cookie-calm/actions/runs/35791095842).
PR #8 merged as `f6f1163`. [GitHub release v1.2.5](https://github.com/davegoldblatt/cookie-calm/releases/tag/v1.2.5) is published at that merge commit.
The downloaded GitHub release ZIP matches the build and Desktop copy byte for byte. Subsequent status changes affect documentation only.

---

## Release 1.2.4 — September 22, 2026

Tracked in [GitHub #4](https://github.com/davegoldblatt/cookie-calm/issues/4).
Research, plan, independent findings, and adjudications are linked from [AUDIT.md](AUDIT.md).
The initial complete local run passed 181 of 183 tests. Both failures were investigated:

- A lifecycle fixture used an incomplete Apple App Store URL. It now uses a valid app-ID path, matching the new destination contract.
- A presentation assertion raced the existing 100 ms cleanup. It now polls the required removal instead of reading before scheduled cleanup.

Both corrected cases passed in the subsequent 59-test focused run, alongside the first audit regressions.
All 34 final targeted tests passed on code commit `029ddcd` after the last audit corrections.
One earlier targeted run timed out waiting for an unsupported-frame diagnostic. No automatic action was observed.
The same test passed three unchanged isolated repeats and the final targeted suite. The timeout cause was not established.
Both complete GitHub runs passed all 195 tests on the final code:
[push run](https://github.com/davegoldblatt/cookie-calm/actions/runs/35782099388) and
[PR run](https://github.com/davegoldblatt/cookie-calm/actions/runs/35782116561).
[PR #5](https://github.com/davegoldblatt/cookie-calm/pull/5) merged as `fabfcc1`. Later status edits change documentation only.

Live research used fresh disposable profiles with verified extension versions.
Baseline 1.2.3 missed the Close-labelled notices on Popular Science and Lifehacker.
Native handler inspection showed that the visible Close-labelled acceptance button grants consent.
The prose privacy-settings link provides a separate native path to the grouped preferences.
Controlled research on both publishers turned exposed group values off and confirmed their stored values after reload.
Publisher-locked functional permission stayed enabled. The implementation reports closure only; it has no receipt descriptor for this integration.

The repeatable corpus is `node scripts/coverage-corpus.mjs extension evidence/coverage-corpus`.
It records installed identity, before/after surfaces, actions, diagnostics, and inspection limits.
Counts can include nested wrappers and empty widgets; they are not a coverage score.
The baseline also closed the Big Blue View notice, E4E cookie panel, and Futurism's Sourcepoint panel.
Guardian's captured widgets were empty, and Vox's adblock prompt did not appear. Those are not reproduced misses or verified fixes.
Region was not independently verified. These observations do not establish cross-region coverage.

The final packaged 1.2.4 build completed the same seven-page corpus:

| Page | Observed result | Limit |
| --- | --- | --- |
| Popular Science | Opened native settings, denied exposed group, confirmed, panel closed | One empty newsletter widget remained; no consent receipt claimed |
| Lifehacker | Same native settings flow; panel closed | Same integration as Popular Science, not an independent provider family |
| Big Blue View reported article | One native privacy-notice dismissal; notice gone | Frame inspection hit its 60-frame cap; only the observed top-page notice is validated |
| E4E jobs | Opened Cookie Settings and saved selected preferences; panel closed | No stored receipt claimed |
| Futurism reported article | Sourcepoint panel disappeared and its supported receipt changed | The closed frame no longer exposed its click log |
| Guardian US | Two empty widget wrappers; no actionable target prompt | Not reproduced; frame inspection capped |
| Vox article | No target adblock prompt appeared | Not reproduced; frame inspection capped |

All seven responses were HTTP 200. No Cookie Calm warning was captured.
The captured OneTrust actions were the privacy-settings link, the exposed group control, and Confirm My Choices.
The Close-labelled acceptance controls were not activated. No acceptance fallback was reported.
The corpus uses a before/after observation window, so it does not establish that prompts never return.

The 18-file ZIP matches the final built extension byte for byte: 117,448 bytes.
SHA-256: `c8ffef46ec1fb94fda1fd206e36760e909692dae922da563c46b84ad716ebfde`.
The [v1.2.4 GitHub release](https://github.com/davegoldblatt/cookie-calm/releases/tag/v1.2.4) and Desktop ZIP contain the same artifact.
The everyday installation was not replaced with this package.


The personal Default profile was verified at Store version 1.2.2, enabled. Its unpacked duplicate remained disabled.
The developer dashboard still showed Pending review for the existing submission. No pending review was withdrawn.
Development tests did not alter either everyday installation.

## Release 1.2.3 — September 22, 2026

The personal Default profile has the Store extension enabled at 1.2.2.
The duplicate unpacked 1.2.2 remains disabled. Neither installation changed during this work.
The developer dashboard also reports 1.2.2 as Published - public.

A fresh disposable Chromium profile reproduced the Big Blue View notice with 1.2.2 after 16 seconds.
The display marker was absent, and no native Close activation occurred.
With candidate 1.2.3 in a second disposable profile, the same live article closed its notice automatically.
The page observed one native Close activation and its expected display-marker write.
A separate disposable-profile visit also closed the live SB Nation homepage notice with one activation.
Diagnostics recorded `promotion / privacy-notice / closed`. The consent outcome remained unset and acceptance remained false.
The older `needs-help` tab status remained present alongside the notice result. Closure did not clear unrelated or earlier consent status.
These observations establish notice closure. They do not establish cookie rejection or downstream tracking behavior.

Eight focused extension tests passed in 47.4 seconds.
They cover two hostnames, both consent modes, changed copy and controls, unsafe forms, no-op and replacement handlers, user intent, pause, shadow controls, and storage failure.
The complete local suite passed all 150 tests in 11.1 minutes on the initial adapter build.
The final audit revisions passed all eight focused tests in 49.9 seconds.
A fresh 1.2.3 visit again closed the reported live Big Blue View notice with one native activation.
Both GitHub checks passed on final code commit `6e139df`. The recorded complete run passed 150 tests in 11.0 minutes.
PR #3 merged as `0383d5d`. No code changes followed those checks. Chrome Web Store submission completed September 22 at 12:26 p.m. Pacific, with automatic publication selected.
The dashboard confirmed Pending review. The published and enabled everyday version remains 1.2.2.


The 18-file Store ZIP matches the tested extension folder byte for byte.
Package SHA-256: `d0ad45f4b7f9928cee71d6e5143b72c218f0f85362a68b1835ddaeeed3114613`.
The GitHub v1.2.3 release contains this ZIP and its checksum.
A matching ZIP is in the Desktop Cookie Calm folder. The disabled Desktop development installation remains 1.2.2.

## Release 1.2.2 — September 21, 2026

### Automated and independent checks

All **142 browser tests passed in one local run (10.0 minutes)** on code commit `4d1909e`.
Both [push CI](https://github.com/davegoldblatt/cookie-calm/actions/runs/35658636034) and [PR CI](https://github.com/davegoldblatt/cookie-calm/actions/runs/35658640978) passed on that commit.
The suite includes 17 presentation tests covering broken native handlers, public HTTP startup, trusted wheel scrolling, body overflow propagation, sticky headers, focus, pause, route changes, surface replacement, competing dialogs, and fullscreen transitions.
Claude reviewed the plan, implementation, and corrections. See [AUDIT.md](AUDIT.md) and the [decision record](docs/PRESENTATION-RECOVERY.md).

An earlier complete-suite attempt exposed a real public-HTTP startup regression and was stopped.
The new constructor used `randomUUID`, which is unavailable on those origins. The final code reuses the existing HTTP-safe identifier function.
The final package only changes the privacy policy's effective date after the passing run. Its executable files are unchanged.

### Installed build

The regular Chrome process and personal Default profile were independently verified.
During validation, the Desktop unpacked extension was **1.2.2, enabled, in reject mode**, and the duplicate Store installation was disabled at 1.2.0.
Afterward, the user enabled the Store copy for everyday use. The development duplicate was then disabled; see [current distribution status](store/SUBMISSION.md).
The work profile was not changed. All 18 installed files match the release ZIP.

In that installed browser, a controlled broken-decline prompt recorded one native attempt, then became hidden.
The document's vertical overflow changed from hidden to auto; body overflow became visible. Article text remained present.
The popup reported “Version 1.2.2. Website prompt: hidden.”
A real back navigation loaded a new document and recovered again. It did not restore from BFCache, so BFCache preservation remains unverified.
Trusted wheel input is covered by the automated browser suite, separately from these installed DOM checks.

ZIP SHA-256: `1ff8e0e1ac831bebc75835e3fe17ef5dd61e377c5d88131ec59449034dfe68ee`.

### Live coverage boundary

Clean live Vox visits returned HTTP 200 with and without Cookie Calm, but neither showed the original adblock prompt.
That absence is neither a successful dismissal nor a product failure. The observed broken handler is reproduced by a fixture.
This release fixes the native-only strategy limitation; a live recurrence of the original publisher variant has not been verified.
Presentation recovery is restricted to supported optional adblock requests with an explicit decline. It does not establish saved consent or paid-content access.

### Distribution

PR #2 is merged. Current GitHub, Desktop, and Chrome Store status is recorded in [store/SUBMISSION.md](store/SUBMISSION.md).

## Candidate 1.2.1 — September 21, 2026

### Automated checks

The original 1.2.0 build failed the new cross-publisher adblock dismissal fixture.
An early candidate passed all 125 browser tests in 4.5 minutes with two workers.
Claude then identified an authentication-text veto gap. The correction includes landmark, longer-link, late-text, and split-text fixtures.

The final build's three-worker run passed 123 tests and timed out on two scan witnesses.
Both failures occurred while waiting for the sentinel cookie rejection, before their behavior assertions.
Both tests passed unchanged with the configured single-worker setup in 8.5 seconds.
The cause of those parallel-run timeouts remains unconfirmed. This is not a clean single-run pass of the final suite.

All 125 cases therefore passed on the final build across the run and targeted recheck.
The no-op fixture also reproduces a native decline handler whose referenced Close target is absent.
The matched-target fixture checks the observed anchor-to-hidden-Close handler and its native event order.
These fixtures establish supported behavior, not a guarantee that the live publisher supplies a working handler.

### Installed build and live Vox result

The affected Chrome profile was independently identified as Default.
The unpacked installation at `~/Desktop/Cookie Calm/extension` now contains 1.2.1 and remains enabled in reject mode.
The duplicate Store copy, 1.2.0, was disabled in that profile. The work profile was not changed.
All 18 installed extension files match the tested package. Permissions are unchanged.
ZIP SHA-256: `4f58bf953d718d2d66ede61cd311f0022aec9ddcb91d4fc4a60e0f2128c292f6`.

The original live prompt contained a visible “Continue without support” anchor without `href` and a hidden native Close control.
The updated detector recognized its category and selected the visible anchor without a hostname-specific rule.
After the installed update and reload, the prompt appeared after a delay.
The decline link remained, but the Close selector in its handler matched no element.
Cookie Calm recorded two unconfirmed attempts. The prompt remained visible and scrolling remained locked.
An earlier observation before the delayed prompt appeared was not evidence of successful dismissal.

**Historical 1.2.1 result: the live Vox case remained unresolved.** Recognition is corrected, but the observed website handler has no target.
The extension does not substitute Allow ads, activate the hidden Read control, or hide the wall to claim success.
The local record is under `evidence/vox-adblock-2026-09-21/`, without the gift-link token.

### Audit and distribution

Claude reviewed the design, implementation, and corrections in three static passes. See [AUDIT.md](AUDIT.md).
The final targeted review cleared the veto correction subject to browser validation.
Version 1.2.1 is a local candidate and prepared package. It has not been submitted to the Chrome Web Store.

## Release 1.2.0 — September 19, 2026

### Automated checks

The full local suite passed **111 tests in 7.4 minutes**. A subsequent live Cookiebot visit exposed a hydration race. A controlled fixture reproduced the miss before the correction. Separating legacy and semantic attempt keys fixed it.

After that correction, **37 focused browser tests passed in 2.3 minutes**. The final reverse-order safeguard passed both hydration tests in **5.4 seconds**. The current complete suite contains **113 tests**. The GitHub Actions run for the release commit supplies its final full-suite result.

All browser tests load the real extension in disposable Chromium profiles. Coverage includes preference polarity, changing controls, failed saves, retained ownership, startup timing, protected flows, fragment links, duplicate roots, public HTTP rejection, and lifecycle cancellation.

### Comparison and live checks

The frozen 1.1.2 comparison handled zero of six unfamiliar controlled layouts. The new discovery handled five. Neither build clicked the eight protected examples. The French newsletter remained unsupported. These fixtures do not establish web-wide coverage.

An eight-page live sample found remaining misses. Longer Smithsonian repeats showed Close in both builds, so the initial apparent improvement was discarded. Popular Science and Lifehacker privacy notices remained open. wikiHow dismissal stayed unconfirmed. ScienceAlert returned HTTP 403 and was excluded. See the [evaluation report](docs/EVALUATION-1.2.0.md).

Futurism checks in both cookie modes recorded Options, On, and Save and Close. Sourcepoint stored sellStatus=false and shareStatus=false. Both reloads had no visible manager. The new popup reported the changed saved receipt after the iframe disappeared. No extension errors were observed in those visits.

E4E Africa opened Cookie Settings and used SAVE & ACCEPT after the preference checks. Cookiebot used Deny in both repeat visits after the hydration correction. These adapters report closure without claiming receipt proof. A stored Sourcepoint choice does not prove downstream tracker compliance.

### Installed profile and package

Chrome independently identified the personal profile as Default. The extension card showed **1.2.0 enabled**. The previous acceptance-fallback preference remained selected. The Mission Control profile was not modified.

A controlled page in that personal Chrome profile recorded three automatic clicks: newsletter Close, analytics checkbox, and Save choices. Both panels disappeared, analytics saved as false, and the article remained. These were extension actions; the diagnostic script did not click the controls.

All 18 Desktop extension files match the packaged files. The ZIP has a root manifest and passed integrity checks. SHA-256: `4671a03c7b8536b37ed4903f19463d3d5fe94d82ca239b06c0eab724171d4e2c`.

### Performance and audit limits

A 52-second idle trace on Smithsonian attributed 783.9 ms to extension callbacks, with a 10.5 ms maximum. Futurism attributed 226.8 ms, with a 29.6 ms maximum. Neither trace recorded an attributed callback above 50 ms. These measurements preceded the final attempt-key corrections. They exclude some microtasks and do not measure total page CPU.

The initial profiling tool could not serialize a large whole-page trace. The revised tool retains the same extension-attributed callbacks during collection. That instrumentation failure was not counted as a product failure.

Claude reviewed the plan, implementation, and corrections. Its final targeted reviews found no blocking issue. Review findings and applied safeguards appear in [AUDIT.md](AUDIT.md). The reviews are separate from browser validation.

The Web Store dashboard still required Google account verification on September 19. Version 1.2.0 has not been uploaded there. The last verified review state was September 18: 1.0.1 published and 1.1.0 pending. No pending submission was withdrawn.

## Release 1.1.2 — September 19, 2026

All **90 Playwright tests passed in one run on the final code** (6.4 minutes), including 11 new Sourcepoint US cases. The suite loads the actual extension in isolated Chromium profiles.

The Futurism report reproduced with a fresh, service-worker-verified 1.1.1 installation. Cookie Calm opened Options, then left Sourcepoint's US privacy manager visible. The older rules did not handle its inverse opt-out switch or Save and Close control.

The new provider adapter handles this Sourcepoint US panel across publisher hosts. It clicks the native On segment, verifies aria-checked=true, and saves through the native control. It refuses unknown labels, stuck switches, extra preferences, forms, and inaccessible controls. Parent-page scam checks, site pause, and cancellation apply before each click. Older provider rules and generic fallbacks cannot take over a refused US manager.

Eleven regression tests cover both cookie modes, multiple publisher hosts, already-on preferences, asynchronous changes, failed or unsafe controls, hidden sibling preferences, parent guards, cancellation, no-op saves, provider origin/path checks, and the initial notice-to-manager flow. A pre-fix run failed the successful opt-out test as expected.

### Live and installed verification

Two fresh profiles loaded the final 1.1.2 build, one for each cookie mode. Both recorded Options, On, and Save and Close in that order. The opt-out was on when Save ran. Sourcepoint's stored consent reported sellStatus=false, shareStatus=false, rejectedAny=true, and consentedToAll=false. The manager was absent after reload. No extension errors were observed. These records show a saved site preference, not proof of downstream tracker behavior.

The personal Gmail Chrome profile was independently verified as Default, with Cookie Calm enabled. After the update, its existing Futurism tab closed the manager and stored the opt-out. The acceptance-fallback setting remained unchanged. The Mission Control profile was not changed. Chrome confirmed the installed extension as 1.1.2.

When Sourcepoint removes its iframe during Save, the frame's content script ends before its success report. The popup can therefore stay on Ready despite the successful saved choice. The fix does not claim success for a modal that remains visible.

The Desktop install matches the release package. ZIP SHA-256: `d978b4cb08a4a6a438b27b94140b373b4d6b0bc6eb83f86a8e397657fcfb9def`.

### Audit and store

Claude reviewed the initial implementation and two follow-ups. The reviews led to exclusive ownership of US manager frames, frame-wide preference checks, mandatory click guards, and protection when manager controls appear under a notice URL. The final review found no new actionable blocker. See [AUDIT.md](AUDIT.md).

The Chrome Web Store dashboard required Google account re-verification on September 19. The 1.1.2 package has not been uploaded. The last verified state, September 18, was 1.1.0 pending review and 1.0.1 published. No pending submission was withdrawn.

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

# Cookie Calm learnings

This file records recurring failures and the rules they established.
Tests enforce behavior. This document explains the decisions behind those tests.
It is not a transcript, release checklist, or claim of universal coverage.

## 1. A reported miss needs a valid browser observation

Multiple Chrome profiles, duplicate installs, old versions, and stale content scripts can obscure the cause.
Confirm the affected browser process, profile, extension ID, enabled state, version, and actual prompt before diagnosing detection.
Application-name automation can target a separate headless Chrome process. Bind the intended process ID and verify the profile path.
An absent prompt, blocked website, or incorrect installation provides no evidence of a product failure.
After an extension update, refresh the affected page.

Evidence: [live evaluation limits](EVALUATION-1.2.0.md), [installation and live checks](../VALIDATION.md).

## 2. Separate discovery, meaning, action, and verification

A popup can fail at any of these stages. Adding its hostname does not necessarily fix the underlying problem.
First identify whether the scanner missed the container, misunderstood the request, refused a control, or failed to verify completion.
Extend a shared category or provider adapter when the same structure or meaning appears across sites.
Use site adapters only for controls with behavior unique to that site.

A survey can lack the word “survey,” and a copied accessible label can name the wrong component.
Epoch's website-rating invitation exposed both failures: unrecognized prose and an X labelled as a cookie popup.
Use independent invitation/question and response-control evidence for the shared category.
Do not widen generic cookie-close permission to compensate for a misleading label.
A researched exception must retain ordinary consent vetoes and verify the observed component before acting.
Its first-screen contract also prevents sending answers through a later Close handler.
Protect indirect user-opened surveys on named and reviewed paths, not only structural discovery.
A component header is a possible wrapper around Close, not necessarily a page boundary. Traverse toward the bounded enclosing overlay, but reject candidates that contain main, article, or navigation landmarks.
For reviewed contracts, inspect the container's own semantic attributes as well as descendants. A root label can contradict otherwise unchanged copy.

Evidence: [survey research and boundaries](SURVEY-PROMPTS.md), [survey regressions](../tests/surveys.spec.js).

Evidence: [category guide](ADDING-PROMPT-CATEGORIES.md), [shared engine](SHARED-PROMPT-ENGINE.md), [structural discovery tests](../tests/shared-engine.spec.js).

## 3. Rejecting consent differs from hiding a notice

A hidden banner does not establish rejection. Consent controls can also use opposite switch meanings.
For example, an analytics switch grants permission when on. A “Do not sell” switch removes permission when on.
Represent the permission and switch polarity separately, then verify the resulting state before Save.
Unknown categories, changed preference sets, or stuck switches prevent submission.

Evidence: [permission planner](../src/prompt-model.js), [Sourcepoint tests](../tests/sourcepoint-us.spec.js), [shared-engine tests](../tests/shared-engine.spec.js).

A Close-only privacy notice needs separate handler evidence. Its X can dismiss information or grant consent.
A reviewed notice adapter can authorize native closure without weakening the generic consent exclusion.
Keep its result separate from rejection and saved consent. A marker named `accepted` does not explain its effects by itself.
Exact copy and controls limit accidental matches, but cannot prove that a website kept the same handler.

Popular Science and Lifehacker supplied a Close-labelled OneTrust acceptance button and a separate settings link inside prose.
The shared promotional path now vetoes known consent surfaces and acceptance controls independently of cookie keywords.
The researched provider adapter opens settings and models the advertising group and its hidden children separately.
Observed child preferences constrain Save without becoming click targets. Unknown children or failed propagation prevent submission.
Lazy panels cannot be preflighted before opening; validate their controls as soon as they appear.
An empty, sandboxed measurement iframe is different from an embedded form. Any exception needs exact structure and negative tests.

Evidence: [coverage research](PROMPT-COVERAGE-RESEARCH.md), [grouped preference tests](../tests/onetrust-groups.spec.js).

Evidence: [reviewed notice contracts](PRIVACY-NOTICES.md), [notice regressions](../tests/privacy-notices.spec.js).

## 4. Upstream coverage does not replace our policy

Bundled consent recipes can contain acceptance fallbacks. A reject-first product must guard those actions explicitly.
Acceptance remains a separate user-selected fallback. A refused or partially completed semantic flow must not fall through to a more permissive recipe.
Keep ownership and attempt tracking explicit. Namespace attempts when separate engines share provider names.
Test both startup orders to catch hydration races.

Evidence: [acceptance safeguards](../tests/extension.spec.js), [ownership and hydration tests](../tests/shared-engine.spec.js), [1.2.0 audit](../AUDIT.md).

## 5. Optional dismissal differs from paid-access removal

The Guardian supplied native dismissal controls for optional invitations. The observed Athletic subscription wall supplied only checkout choices.
Prefer the website's recognized refusal, close, or collapse control. Do not infer that removing a wall grants article access.
Preserve payment flows and required authentication. Cosmetic recovery needs separate evidence about the request and its effects.

Evidence: [promotion tests](../tests/promotions.spec.js), [registration tests](../tests/registration.spec.js), [product limits](../README.md#choices-and-limits).

## 6. A control's appearance does not determine its semantics

Vox's Admiral prompt used an anchor without `href` for “Continue without support.” Its handler activated a hidden native Close button.
The original scanner omitted this control type, phrase, and ancestor depth.
Share exact dismissal labels between discovery and action selection. Support native anchors without navigation targets.
Do not activate hidden controls directly or treat every “Continue” label as refusal.
Recheck the control immediately before activation.

A later live Vox visit retained the decline link but omitted its referenced Close target.
Recognizing a control cannot repair a broken website handler. That limits the native strategy, not the possible user outcome.
For a clearly optional request, consider a separately guarded, reversible presentation strategy after an unconfirmed native attempt.
Do not promote a past implementation boundary into an immutable product rule.
Do not substitute a hidden Read or Allow ads control whose effect is different.

Evidence: [shared control vocabulary](../src/promotion-controls.js), [observed handler and cross-publisher fixtures](../tests/adblock-prompts.spec.js).

## 7. Positive evidence must be independent and visible

Words in links, navigation, or hidden steps can describe unrelated actions.
An adblock request needs visible request text outside its controls. Generic wording such as “Allow ads” is insufficient.
A secondary Sign in button does not make the entire request an authentication flow.
The exception still excludes actual authentication requests, forms, fields, and embedded frames.
Authorization can use a bounded sample. A veto must not silently discard late instructions or instructions inside headers, footers, and longer links.
If a veto scan exceeds its budget, refuse the action.
Prefer one explicit refusal, exclude unrelated nested panels, and stop when eligible refusals are ambiguous.

Evidence: [classifier](../src/promotions.js), [false-positive and nested-control tests](../tests/adblock-prompts.spec.js), [independent reviews](../AUDIT.md).

## 8. Preserve user intent across delayed rendering

Save, Comment, Play, and similar controls can open useful dialogs without naming their category.
A short delay alone cannot distinguish those dialogs from unsolicited prompts.
Record relevant trusted interactions and mutation-time relationships. Preserve those markers through delayed hydration and route changes.
Do not mark the entire document as user-opened because its body class changed.
Existing conversations, edited forms, and active media also require protection.

Evidence: [interaction model](../src/interactions.js), [delayed-intent tests](../tests/registration-intent.spec.js), [promotion tests](../tests/promotions.spec.js), [adblock tests](../tests/adblock-prompts.spec.js).

## 9. A click is not a successful result

Native handlers can do nothing, animate slowly, replace the prompt, or fail to save.
Verify disappearance or the expected collapse transition before counting a dismissal.
Distinguish `closed`, `saved`, `unconfirmed`, `unsupported`, and `blocked` results.
The separate `hidden` result records a presentation override, not a saved preference or verified browser input behavior.
Only a supported changed receipt can establish a recorded privacy choice. It cannot prove downstream compliance by the website.
Bound retries and cancel active work on pause, navigation, or extension unload.

Use the current node's discovery evidence. Do not reuse a removed node's structural classification for its replacement.
A replacement that loses its Close button or gains protected fields still prevents a claim of successful disappearance.
Observe changed surfaces during the action, require a short absence interval, and withhold success when the observation budget is exhausted.
Fingerprints constrain retry budgets; they are not unique identities for all prompts on a page.
Always dispose action observers, including on cancellation and errors.

Evidence: [replacement regressions](../tests/prompt-verification.spec.js), [completion observer](../src/prompt-completion.js).

Evidence: [runner](../src/prompt-engine.js), [receipt tests](../tests/shared-engine.spec.js), [lifecycle tests](../tests/lifecycle.spec.js).

## 9a. Own the override, not the website's styles

An obstruction can include a panel, backdrop, scroll lock, and focus state. Hiding a box alone can leave the page unusable.
Restoring saved inline styles can overwrite later website changes. A separate user-origin stylesheet avoids that ownership problem.
Scope it to exact elements with document-specific attributes. Removing those attributes exposes the website's current styles.
Keep native dialog state, competing overlays, content suppression, and shared portal roots in the verification model.
A programmatic scroll can succeed under `overflow:hidden`; test real wheel input before claiming scrolling works.
Do not claim runtime proof of trusted input or arbitrary event listeners from an isolated content script.

Use the same authorization predicate at discovery and immediately before a cosmetic effect.
Parse app-store destinations instead of matching hostnames embedded in arbitrary URL strings.
Keep cosmetic ownership separate from action history. Releasing styles does not refund attempts or clear another element's completion state.
Retain bounded records for disconnected elements so later reattachment does not strand a hidden element.
Release an app override when its element changes, rather than hiding newly repurposed content.

Evidence: [cosmetic ownership regressions](../tests/cosmetic-ownership.spec.js).

Evidence: [research and decision](PRESENTATION-RECOVERY.md), [presentation tests](../tests/presentation.spec.js), [plan audit](audits/1.2.2-plan.md).

## 10. Negative tests need evidence that automation ran

A prompt staying visible can mean either correct refusal or a scanner that never started.
Load the actual extension and use a successful cookie rejection as a scan witness where practical.
Use observed markup and handlers for reported cases, then vary domains and layout.
Pair successful cases with protected forms, user actions, ambiguous controls, failed handlers, and unchanged article content.
Fixtures establish behavior for their inputs. Verify the installed build separately on the live page.

Evidence: [test fixture](../tests/fixtures.js), [adblock regression suite](../tests/adblock-prompts.spec.js), [validation record](../VALIDATION.md).

## 10a. Startup code must work on every declared origin

Chrome content scripts also run on public HTTP pages. Secure-context-only APIs can stop the entire scanner before any guarded action.
Reuse the shared `opaqueID` helper, which uses `getRandomValues`, instead of `randomUUID` in content-script startup.
Test both rejection and presentation recovery on a public HTTP origin. A localhost test is insufficient because localhost is a secure context.

Evidence: [shared identifier](../src/identity.js), [HTTP rejection tests](../tests/shared-engine.spec.js), [HTTP presentation test](../tests/presentation.spec.js).

## 11. An independent audit supplies findings, not certification

Claude's reviews exposed missed guards and weak test assumptions, including invisible evidence and delayed user intent.
Assess each finding against the code and observed behavior. Turn confirmed risks into safeguards and regression tests.
Retain the original report and explain the resolution. Distinguish static review from executed tests and live verification.

Evidence: [audit history](../AUDIT.md), [raw reports](audits/).

## 12. Packaging, installation, and publication are separate facts

A GitHub release, Desktop build, enabled extension, and Chrome Store listing can contain different versions.
Compare package contents and hashes with the installed files. Preserve existing settings during updates.
Verify the correct Chrome profile and report which distribution channel contains the fix.
Recheck publisher authentication and current review status before changing a Store submission.
Historical approval or a successful local build does not establish a new publication.

Keep the user's Chrome Web Store installation enabled as the everyday copy. Test unreleased builds in a separate disposable profile.
Disabling the Store copy to replace it with an unpacked build creates a misleading turned-off warning on the public listing.
If the user enables the Store copy, disable only the redundant development copy after confirming the Store copy is active.
Do not switch the user back to an unpacked release during later testing. A newer local build does not override their choice of automatic Store updates.

Evidence: [package script](../scripts/package.py), [validation history](../VALIDATION.md), [Store workflow](../store/SUBMISSION.md).

## 13. Compact openers need a distinct dismissal contract

A dismissed signup form can leave a teaser that reopens it. Closing the form does not prove the teaser is gone.
Control text can carry all of a compact offer's meaning, while generic classification correctly excludes that text.
Do not remove that exclusion globally. Require a bounded component with distinct opener and dismissal controls.
Keep special dismissal labels scoped to that contract, including final action authorization.
Preserve user-opened teasers on named selectors as well as structural discovery paths.
Use separate offer keys without treating a retry key as unique DOM identity.

Evidence: [research and limits](OFFER-TEASERS.md), [teaser tests](../tests/teasers.spec.js).

## Maintain this document

Browser ports need separate evidence for API compatibility, DOM behavior, native installation and distribution.
A WebKit fixture does not load Safari's extension APIs. A ZIP is not a signed Apple app.
Use a browser minimum that preserves required safety capabilities; do not silently weaken guards for older versions.
Keep each browser's output and release checksums separate. Document host permissions and temporary installation expiry.
A folder named as the installable delivery must contain manifest.json directly. A wrapper with instructions and a nested extension folder causes a valid-package error; verify the exact folder the user will select.
See the [Safari preview](SAFARI.md) for the compatibility matrix and native acceptance checks.

For a new durable lesson, record the observed failure, general rule, remaining boundary, and regression or evidence link.
Update an existing lesson when it already covers the failure class. Keep temporary status and raw debugging output elsewhere.
Use sanitized fixtures. Exclude gift-link tokens, private query strings, entered field values, and unrelated page content from public records.
Bounded scans, English labels, site changes, and unknown controls remain coverage limits. A successful sample does not remove those limits.

### Automatic actions and user intent

Programmatic checkbox activation can emit trusted input/change events. `isTrusted` alone cannot identify a human action.
Suppress intent recording only during the synchronous automatic activation. Never suppress a whole asynchronous flow or timer.
A later trusted intervention cancels automatic completion credit, including Escape. Keep user input and delayed website changes visible to the guard.
An adapter's “opened by us” flag belongs to its current run. It must not survive into a later manual preference session.
Clear it at run disposal, not during a temporary gap between hiding the notice and mounting the preferences.
Document attempt history is a different lifetime: retain it to prevent repeated actions across route changes and settings updates.

### Completion baselines and mutation budgets

Snapshot visible equivalent prompts before acting. An already-visible sibling does not become a replacement just because its CSS changes.
Deduplicate mutation targets and budget each polling pass. Repeated benign changes must not consume a cumulative lifetime node allowance.
If one pass cannot inspect its pending changes, retain an unconfirmed result; do not discard the uncertainty and later call it success.

A shadow-control check must include the component root itself. A root can render normal light DOM through a slot alongside unseen permissions.
Coalesce crowded mutation records into a subtree and inspect that subtree. Discarding overflow records cannot support a later success claim.
Only disjoint, already-visible equivalent prompts belong in the independent-sibling baseline. An enclosing dialog remains relevant obstruction evidence.

Memoized bounded searches must retain the remaining search depth. A “visited” bit can suppress a later traversal that would reach farther.
Test order-dependent character-data mutations as well as attribute and subtree replacements.

## Native distribution has separate proof boundaries

A temporary browser extension, a compiled app, a signed app, a notarized download, and a verified installation are different states.
Never infer a later state from an earlier one. A successful unsigned build cannot establish durable Safari operation.
Keep the everyday Chrome installation enabled while testing a Safari app. Avoid two active Safari copies during native acceptance.

Apple's generated project is an input to review. Its packager can derive inconsistent bundle identifiers, and Xcode can generate entitlements without separate files.
Set intended identities explicitly and sign with checked-in entitlement files. Verify the built bundle, rather than trusting command-line settings alone.
Wrap app artifacts before CI upload to preserve executable permissions. Bind signing to the canonical run, exact source commit, and matching artifact hash.
Keep submitted notarization artifacts immutable; staple a copy. A missing submission ID after an interrupted upload is uncertainty to resolve, not permission to upload again.

Evidence: [direct distribution](SAFARI-DIRECT-DISTRIBUTION.md), [native validation](../VALIDATION.md), [independent audit](audits/safari-direct-implementation-claude.md).

# Prompt coverage and verification research

Date: 2026-09-22. Baseline: 1.2.3, commit `818187b`.
This record precedes the implementation plan. It separates reproduced defects from unresolved evidence.

## What failed, and why

| Observation | Evidence | General lesson |
| --- | --- | --- |
| A replacement newsletter remains visible but increments the dismissal count. | Actual-extension regression `tests/prompt-verification.spec.js`: expected zero, received one. | Result verification cannot reuse the original node's discovery provenance for a different node. |
| A selected smart-app banner still gets hidden after its store link changes to a payment URL. | Browser harness using the actual `Promotions` class: `eligible=true`, `act=true` after mutation. | Every prerequisite that authorizes an effect must survive the final action check. |
| Restoring a connected hidden banner refunds its attempt. Removing it before restoration does not. | Same harness: total becomes zero for the connected case, stays one for the removed case. | Attempt history and ownership of cosmetic changes have different lifetimes. |
| Popular Science and Lifehacker leave a privacy notice visible. | Fresh disposable Chromium profiles reproduced both on September 22, HTTP 200. | A visible Close label can disguise a different provider action. Settings may exist inside prose. |

The first reproduction replaces an unnamed fixed newsletter with a named dialog inside an `aside`.
Both have the same heading. The replacement Close button is disabled, so a later click cannot hide the verification error.
`Promotions.finished()` passes `this.structural.has(container)` for the old node when classifying the new node.
Structural classification excludes `aside`; named classification does not. The visible replacement disappears from the completion check.
Changing the argument to `next` alone is insufficient: newly discovered structural nodes are not consistently registered during verification.

There is a broader distinction. A replacement can lose its Close button, change its copy, or acquire protected fields.
Those changes should prevent another action. They should not establish successful disappearance.
Authorization to click and evidence of remaining obstruction need separate checks.

The smart-app finding is also confirmed. Discovery requires a store link, but `eligible()` drops that requirement.
The substring selector can match a store domain embedded in an unrelated URL.
Discovery and final authorization should use the same parsed destination predicate.

The original budget audit called retained counters a leak. That conclusion was incomplete.
Document attempt limits deliberately prevent endless rerendering and repeated actions after settings changes.
Refunding disconnected entries would weaken that limit. Restoration should release owned presentation without refunding attempts.
The product must state whether a restored banner can be hidden again, and enforce a finite limit either way.

## Close-only OneTrust notices

Both observed publishers use the same OneTrust layout and Ziff Davis integration. No hostname exception is necessary to describe it.
The notice contains two controls labelled Close:

- `#onetrust-accept-btn-handler`, wired to `allowAllEventHandler(false)` in the loaded script.
- `.onetrust-close-btn-handler`, with separate banner-close behavior.

The prose also contains `a.zdcOpenPc[href="#"]`, labelled “Subject to your privacy choices”.
Activating that existing link opens the preference center. It does not require the extension to inject a page-world API call.
The observed `zdconsent.showConsentTool` prevents navigation and calls `OneTrust.ToggleInfoDisplay()`.

The visible preference center exposes a `Targeted Advertising` group (`OSSTA_BG`) and Confirm My Choices.
The group checkbox is visually hidden; its native associated label is visible.
Hidden descendants include Targeting Cookies and Performance Cookies. Other hidden fields belong to the vendor-list UI.
This hierarchy matters: ignoring every hidden field would miss real permissions; treating every hidden template checkbox as a permission would block valid handling.
The group initially rendered checked even though the recorded category cookie showed it off. DOM and stored values can disagree before Save.
The extension must observe and verify the actual controls, and must not treat that initial cookie as a completed rejection.

In a second clean visit to each publisher, the research probe opened the prose settings link, turned Targeted Advertising off,
and selected Confirm My Choices. Both the banner and preference center disappeared. The group and its two descendants were off.
The existing cookie's category values did not change, so this proves the native route and closure, not a newly written consent receipt.
The configured functional group remains always active; do not claim that every nonessential category was disabled.

Primary provider evidence:

- [OneTrust banner configuration](https://my.onetrust.com/articles/en_US/Knowledge/UUID-2b6cc670-059c-5342-275c-4a7d8da5630e) distinguishes acceptance, settings, rejection, and closing. Close preserves the configured consent model; it is not a universal rejection operation.
- [OneTrust cookie documentation](https://my.onetrust.com/articles/en_US/knowledge/UUID-2dc719a8-4be5-8d16-1dc8-c7b4147b88e0) lists Accept, Reject, Close, and Save as sources of the banner-closed cookie. That cookie alone cannot identify the user's privacy choice.
- [Loaded publisher SDK](https://cdn.ziffstatic.com/jst/otBannerSdk.202604.2.0.js) contains the observed accept-button handler and publisher modifications. The unmodified vendor SDK is not sufficient evidence for this integration.
- [Popular Science configuration](https://cdn.cookielaw.org/consent/019e1e59-ac0b-7030-9790-69529e0407ca/019e0d34-73e7-736e-8722-58c96a594705/en.json) and [Lifehacker configuration](https://cdn.cookielaw.org/consent/cff15d34-b1f4-467b-84ce-f864dd9684dd/019e0d34-73e7-736e-8722-58c96a594705/en.json) identify the group layout and regional defaults. These are evidence snapshots, not runtime dependencies.

Research profiles contain no user credentials. Raw local captures live under `evidence/prompt-coverage-2026-09-22/` and are ignored by Git.
Public fixtures must remove provider-generated user IDs, receipt identifiers, and unrelated article content.

## Strategies considered

1. Broader Close matching would increase apparent coverage but could invoke acceptance. Reject this strategy for unresolved consent.
2. Hiding all fixed overlays would remove forms, media, and useful dialogs. It would not change privacy preferences.
3. Page-world API calls could reach provider methods, but add a second action path with different ownership and trust assumptions.
   Chrome's [content-script documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) explains the isolated-world boundary. Existing native controls offer a simpler path for these cases.
4. Provider observations can express settings, permission polarity, hierarchy, and Save through the existing shared runner.
   This addresses a family of layouts, while refusing unfamiliar permission shapes.
5. Completion checks can retain evidence about the obstruction's location and provider without authorizing further actions against its replacement.
6. A fixed coverage corpus can separate discovery failures, unsafe actions, failed effects, and invalid tests. It cannot establish web-wide coverage.

## Questions the plan must settle

- How will verification recognize a replacement that changes labels or becomes non-actionable without confusing unrelated page content?
- How will candidate bounds affect a claim of completion when the scan is exhausted?
- Which OneTrust group, child, and hidden-template shapes are actually understood? Unknown controls must block Save.
- How will subgroup consistency, changed controls, and a changed preference shape be checked before committing?
- How will action budgets survive restoration, pause/resume, and disconnected cosmetic elements?
- Which local diagnostics explain unsupported notices without storing page text or reporting absent prompts as failures?
- How will the live corpus prove the installed version and distinguish absent prompts, challenges, and wrong profiles from product misses?

Exact DOM contracts cannot prove that arbitrary future site handlers retain the same behavior.
This is an evidence limit, not a reason to stop improving coverage. New variants need research, shared adapters, and regression evidence.

## Independent research review and adjudication

[Claude's research audit](audits/1.2.4-research.md) used a read-only code and evidence snapshot before the plan.

- **Confirmed additional safety defect:** a known acceptance button labelled Close is reachable through promotional classification when the surrounding copy contains newsletter language but no cookie keywords.
  A second actual-extension regression expected zero acceptance calls and observed one. A separate successful rejection proves the scanner ran.
  This is a synthetic counterexample, not evidence that either live publisher accepted through this path.
- **Accept:** restoration must preserve `attempts`, category/total counts, and fingerprint-level completion state. Detached elements must retain an ownership record until their styles can be released.
- **Accept with narrower claims:** the two publishers are one Ziff Davis integration on two hosts. The settings alias is provider-specific, even without hostname conditions.
  Future OneTrust variants need their own evidence; the plan must not advertise universal OneTrust coverage.
- **Accept:** fingerprints are conservative budget keys, not identities. Completion should distinguish simultaneous existing prompts from newly created replacements.
- **Correct the audit:** a verified generic action permitting one more action is still finite (`count < 2`). It is a deliberate bounded recurrence policy, not an unlimited retry.
- **Correct the audit:** discovery exhaustion reduces coverage; it does not itself authorize unsafe actions. Completion must not infer absence from an exhausted verification scan.
- **Correct the audit:** the supplied snapshot omitted `prompt-engine.js`. That runner already checks `shape()`, limits opening attempts, and times out no-op controls.
  Retaining failed consent ownership intentionally prevents a permissive fallback after partial work. Release still occurs when the provider disappears.
- **Correct the audit:** the replacement fixture asserts one actual automatic click before checking the count. It is not a scanner-never-ran negative test.
  Add genuinely closed, actionable-replacement, and distinct simultaneous prompt cases anyway.
- **Accept:** unchanged cookie values do not prove a new saved choice. The initial observations prove closure only. Persistence needs separate tests.
- **Additional prior-review gap:** reviewed notice copy checks do not inspect generated `::before`/`::after` content. Add that veto within the bounded contract.

Further controlled research established persistence on both publishers. A direct cookie-seeding attempt was overwritten by the site and was not a valid enabled baseline.
The probe then established the enabled state through the native preference UI in its disposable profile.
It reopened settings, checked the current value, switched the group off only when enabled, and confirmed the choices.
`OptanonConsent.groups` changed from `OSSTA_BG:1,C0004:1,C0002:1` to all three values at zero.
The zero values survived reload on both hosts. Necessary and publisher-locked functional values stayed at one.
Local evidence: `*-verified-denial.json` and `*-reload-research.json` in the research directory.
This verifies the reviewed UI route for those visits. It does not prove arbitrary future handler behavior or downstream tracking compliance.

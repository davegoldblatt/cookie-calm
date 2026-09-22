# Prompt coverage and verification plan

Date: 2026-09-22. Candidate release: 1.2.4.
Tracking ticket: [GitHub #4](https://github.com/davegoldblatt/cookie-calm/issues/4).
Research: [observations and audit dispositions](PROMPT-COVERAGE-RESEARCH.md).
Do not describe these changes as complete coverage of the web.

## 1. Close the acceptance boundary first

Reuse the known acceptance-control predicate in promotional action selection and its final check.
Refuse controls inside known acceptance controls, even when their accessible label says Close.
Keep recognized consent-provider surfaces out of generic promotional classification regardless of their text.
The reviewed informational-notice contract remains a separate exception with exact content and control checks.
Reject nonempty generated CSS content on that notice and its descendants; keep the existing element bound.

Tests: misleading Close labels on acceptance controls, nested controls, supported native Close, both consent modes,
and generated text on reviewed notices. Prove scanner activity in refusal tests.

## 2. Observe completion separately from action eligibility

Derive candidate provenance from the current node instead of a lifetime WeakSet.
Separate permission to act from evidence that an obstruction remains.
Use a shared, bounded completion observer; inspection exhaustion cannot establish successful disappearance.

Before activation, record the original rectangle and existing equivalent candidate nodes.
Observe additions and relevant attribute changes during the action using a short-lived observer over the searched roots.
Inspect new subtrees with a finite node budget. New fixed/sticky/dialog surfaces overlapping the original rectangle block completion,
even if they lost their Close button, changed category, or gained protected fields.
New equivalent candidates elsewhere also block completion. Existing unrelated candidates do not become replacement evidence merely because their budget keys collide.
These observations never authorize clicks. They can only withhold a completion result.
Require an uninterrupted 400 ms absence interval within the existing runner deadline, and stop the observer on every exit.
Treat mutation/node-budget exhaustion as unconfirmed. Document the bounded observation window.

Tests: structural-to-named and named-to-structural replacements, changed copy, missing/disabled/actionable Close,
protected replacement, a short delayed replacement, unrelated simultaneous prompts, and exhausted scans.
Keep successful native close and collapse cases.

## 3. Unify cosmetic authorization and lifetime accounting

Use one smart-app predicate at selection and immediately before the effect.
It must retain the recognized banner structure, fixed/sticky placement, safe page/user context, and a real HTTPS App Store or Google Play app URL.
Parse the destination; do not match hostnames as arbitrary substrings.

Replace saved inline `display` restoration with an owned stylesheet and an opaque element marker.
Implement the small ownership helper alongside the existing presentation primitive, rather than resetting website styles in category code.
It only hides the exact app banner; it does not change scroll locks or other page elements.
If the stylesheet cannot hide it, do not report success. Removing the marker reveals the site's current styling.
Retain disconnected element records, bounded by the document's attempt cap, so detach/reattach and pause still restore correctly.

Restoration never refunds attempts, category totals, document totals, or another element's completed native action.
Allow at most two cosmetic applications per budget key, including pause/resume and site rerenders.
An already hidden element is not a new success. Preserve existing native recurrence limits.

Tests: destination removed/changed after selection, spoofed hosts, site style changes, detach/reattach,
pause/resume, repeated rerenders, and two nodes sharing a key. Use the actual class for deterministic race tests and the actual extension for lifecycle effects.

## 4. Add the observed OneTrust grouped-preference contract

Add an observation adapter for the researched OneTrust/Ziff Davis group layout, without hostname conditions.
Recognize the visible banner and its scoped native settings link, including the researched `zdcOpenPc` fragment alias.
Only describe actions for the shared runner. Do not invoke page-world APIs, fetch remote rules, or activate Close/Allow All.

The supported preference shape has a recognized necessary group and the Targeted Advertising group (`OSSTA_BG`).
Bind its checkbox to the native associated visible label. Verify its group ID, header text, and parent structure.
Describe its known targeting/performance child preferences as independent semantic observations, including hidden descendants.
Do not click hidden child controls. If a child remains enabled after the parent is off, stop before Save.
Reject extra permission groups, unknown input types, ambiguous controls, duplicate IDs, changed group shapes, or active vendor-list pages.
Ignore only the researched inert vendor-list template fields in their exact hidden template container.
Require a unique native Confirm My Choices control outside a form. Observe both banner and panel before declaring absence.

Preserve exclusive ownership after an attempted or unsupported flow. The older interpreter and accept fallback cannot take it over.
Let unclaimed OneTrust variants continue through their existing path; do not seize every OneTrust dialog.
Add the provider to the existing enum-only local diagnostics. No page copy, raw cookies, user IDs, or full URLs are recorded.
Report `closed` on observed closure. Do not add a saved-receipt claim in this increment; live research verifies persistence independently.
The publisher's locked functional category remains outside the controls this adapter can reject. Document that limit.

Tests: two hostnames, parent on/off, child mismatch, replacement controls, new preference before Save,
unknown group/template fields, no-op settings link, no-op Save, duplicate IDs, both modes, and no acceptance fallthrough.
Use sanitized observed markup plus small synthetic variants. Never publish provider-generated user IDs.

## 5. Make the evidence repeatable and finish the release

Keep a fixed small corpus: Popular Science, Lifehacker, Big Blue View, Guardian, E4E Africa, Futurism, and Vox.
Use the existing public URLs without private gift tokens. Capture the observed provider, actual loaded version/ID, automatic control actions, and remaining prompt.
Run the frozen 1.2.3 baseline and candidate in disposable profiles. Record no prompt, navigation/challenge failures, and invalid installation separately.
A test that does not see the relevant prompt cannot establish a fix or a miss.
Retain deterministic adversarial fixtures as the repeatable coverage oracle; live pages can change.

Have Claude audit this plan before implementation. Resolve each material finding.
After implementation, run focused regressions, a separate Claude code audit, the full browser suite, and live comparisons.
Document the findings in LEARNINGS, VALIDATION, and AUDIT. Create a reviewable PR and verify the matching package hash.
Use the standing merge/release authorization. Preserve the enabled everyday Store installation.
If 1.2.3 is still pending Store review, stage the next package instead of withdrawing it. Report GitHub, submitted, live, and installed versions separately.

## Plan audit decisions before implementation

[Claude's independent plan audit](audits/1.2.4-plan.md) identified useful amendments and several interpretation errors.
The following decisions supersede the relevant details above.

1. Consent-provider recognition vetoes generic promotion handling whether or not the new adapter claims it.
   A container holding a known acceptance control is also excluded. “Existing path” means the existing consent interpreter, never generic promotional dismissal.
   `grantsAll` already includes explicit provider selectors; extract that selector set for ancestor/container checks.
2. Add `observed` preferences to the semantic model. Validate their meaning and state, but never select them for activation.
   Process actionable parent preferences first. Before Save, any observed child mismatch stops with `inconsistent-preferences`.
   Include this flag in the shape signature and test reordered children and hidden mismatches.
3. Keep completion discovery local to the action's observed mutations instead of rescanning the entire page with a shared 100-candidate cap.
   Read candidate provenance fresh during discovery. Observe changed subtrees and evaluate their surfaces during the runner's existing polls.
   An arbitrary replacement without recognized labels need not appear in the normal candidate set, so polling that set alone is insufficient.
   Bound the changed-subtree scan, withhold success on exhaustion, and add `adapter.dispose()` in the runner's `finally` block.
   The cosmetic path must dispose in its own `finally`. A 400 ms absence dwell applies to closure; confirmed collapse transitions remain immediate.
   Use visible descendant rectangles for `display:contents`, and conservatively block on new surfaces when geometry is unavailable.
4. Preserve coarse fingerprint action caps, but scope verified retry timing to the original element with a WeakSet.
   A successful action on one element cannot waive another element's retry delay. Existing same-key prompts do not count as replacements.
5. Add a separate bounded cosmetic ownership helper in the presentation module. It uses a dedicated marker and constructed stylesheet per root.
   It has no shared scroll-lock state. It can coexist with adblock recovery and work in same-host frames and shadow roots.
   It never rewrites website inline styles. Verify the effect; an inline important rule can prevent an author-origin sheet from hiding the element.
6. Preflight the researched OneTrust hidden preference structure before opening it. Missing or unknown shapes do not authorize an open.
   Preserve user interaction checks at the final action boundary for this adapter, including the original banner and preference panel.
   A mid-flow unknown permission stops with a visible manual-choice diagnostic. Keep native controls available.
   Do not release failed ownership merely because a deadline elapsed: that would allow older recipes to take over partially reviewed preferences.
   User closure releases ownership through the existing absent-stage rule. This cannot guarantee automatic recovery from an arbitrary future provider change.
7. Register `onetrust-zd-group`, omit its receipt descriptor, and use the existing `closed` outcome without a saved claim.
   The later research established a persisted on-to-off transition on both hosts, so a default-off rollout is not required for lack of that evidence.
   This remains one researched integration, not universal OneTrust coverage.
8. Reject generated content other than `none`, `normal`, or an empty quoted string; an empty pseudo-element adds no consent instruction.
   Test the URL spoof cases, lazy child insertion, ambiguous Confirm controls, and generated text.
   Record the test environment as the machine's current network route; region was not independently verified. Do not generalize regional outcomes.

## Findings during implementation

- Real visits create the OneTrust panel only after the settings action. Preflight existing markup when available, then validate newly created markup before changing a preference.
  A missing panel cannot be treated as proof that the integration is unsupported. An unfamiliar panel after opening still requires manual handling.
- The provider inserts an empty measurement iframe for text sizing. Permit only its exact title/class, script-free sandbox, no URL/source document,
  empty same-origin `about:blank` document, and offscreen position. Other embedded frames remain unsupported.
- A synthetic native checkbox click emits trusted `input` and `change` events in Chromium. Suppress interaction recording only during the synchronous activation call.
  Never extend that suppression into a timer or asynchronous wait. Otherwise the extension mistakes its own preference change for user input.
- Popup counters reset on settings changes. The document's internal action budget persists independently. Lifecycle tests must not conflate those two counters.

## Implementation audit decisions

The first code audit added run-scoped automatic-open state, trusted-intervention outcome checks, and synchronous automatic-event suppression across click paths.
The grouped adapter also rejects unreviewed custom/shadow controls and acceptance identities on Save.
Existing equivalent prompts are snapshotted before activation; node work is bounded per poll. A lost observation still prevents completion for that action.
An unrelated gesture before the first click permits one retry after the grace interval. Flows already changed by the extension remain stopped.

Two raw live captures disproved the proposed third visible group. Both have only C0001 and OSSTA_BG top-level rows.
Document consent-attempt histories intentionally remain bounded across client-side navigation; a repeated workflow on another route may require manual handling.
These limits do not authorize fallback acceptance of an unresolved owned prompt.

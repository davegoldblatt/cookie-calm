# Release 1.2.6 independent review

Claude Opus reviewed the [research and plan](docs/audits/1.2.6-research-plan.md) and [implementation](docs/audits/1.2.6-implementation.md) through the authenticated CLI with tools disabled.
The [research record](docs/OFFER-TEASERS.md) records adjudication and remaining limits.

The plan review narrowed `Close teaser` authorization to a separate component contract and avoided a broad offer-intent policy change.
The implementation review identified false completion when a structural teaser moves to another corner, plus unchecked instruction-bearing attributes.
These findings led to stronger replacement observations and conservative attribute, role, and generated-text vetoes.

[The follow-up review](docs/audits/1.2.6-followup.md) confirmed that replacement observations do not widen click authorization.
Its shared-wrapper finding led to a stricter independent-sibling baseline and another regression fixture.
Two broader observation hypotheses are tracked in [GitHub #11](https://github.com/davegoldblatt/cookie-calm/issues/11).

Actual provider code and two live candidate runs established that the supported contract matches the reported Soylent component.
The review's concern about that evidence gap did not remain after live verification.
Intent markers, observation exhaustion, unknown overlapping widgets, fragmented copy, and discovery caps remain documented coverage limits.
No claim of universal teaser support or downstream tracking control follows from this work.

---

# Safari preview independent review

Claude Opus reviewed the [research and plan](docs/audits/safari-research-plan.md), [implementation](docs/audits/safari-implementation.md), and [follow-up](docs/audits/safari-followup.md) with tools disabled.
The final bounded review reported no blockers in the supplied changes. This is static review, not Safari certification.

The reviews led to a Safari capability refusal, a negative fixture with a settling interval, website-permission guidance, browser-neutral help, fixed ZIP metadata, Finder-file exclusion, and full resource-list comparisons.
Current Apple documentation and the installed Safari UI resolved the first review's outdated doubts about packaging and temporary installation.
The minimum remains Safari 26. A real browser check must still establish privileged API behavior, message routing, stylesheet origin and worker lifecycle.
Package reproducibility is claimed only for the same toolchain. No native behavior is inferred from the WebKit bridge.
See [Safari decisions and validation boundaries](docs/SAFARI.md).

# Release 1.2.5 independent review

Claude Opus reviewed the [research and plan](docs/audits/1.2.5-research-plan.md), [implementation](docs/audits/1.2.5-implementation.md), [follow-up](docs/audits/1.2.5-followup.md), and [header traversal](docs/audits/1.2.5-header.md) through the authenticated CLI with tools disabled.
Full adjudications are in [the survey research record](docs/SURVEY-PROMPTS.md).

Accepted findings led to persistent survey intent protection, preserved restored/unknown response widgets, independent promotion witnesses, tests beyond the gesture window, and a test that reveals a user-opened panel only after that window.
The researched Epoch exception checks the container and descendants for contradictory attributes, unknown controls, shadow content, generated text, and changed first-screen copy. It cannot authorize later response screens.
A semantic-header fixture exposed a shared discovery boundary. Traversal now reaches the enclosing overlay while refusing page layouts containing main/article/navigation landmarks. Sidebar/footer prose stays excluded.

The live DOM and successful native dismissal disproved the audit's missing-Icon theory. The ordinary document space bar does not start the control gesture timer.
Ambiguous control interactions intentionally preserve nearby surveys for the document. Unknown response widgets and decorative generated content can also reduce coverage. These conservative limits are documented, not treated as universal detection.
The CSS veto was retained after successful live checks; an unknown generated-content value does not establish permission to activate a conflicting label.

Reviews are static evidence, not certification. Final test, live, and distribution results are recorded in [VALIDATION.md](VALIDATION.md).

---

# Release 1.2.4 independent review

Claude Opus reviewed research, then the implementation plan, through the authenticated CLI with tools disabled.
The [research review](docs/audits/1.2.4-research.md) led to a reproduced acceptance-control counterexample and stored-state research on two publishers.
The [plan review](docs/audits/1.2.4-plan.md) led to separate completion evidence, final cosmetic authorization, retained attempt budgets, and observed-only child preferences.
The [research record](docs/PROMPT-COVERAGE-RESEARCH.md) and [plan](docs/PROMPT-COVERAGE-PLAN.md) distinguish accepted findings from claims contradicted by code or live captures.

The [implementation review](docs/audits/1.2.4-implementation.md) identified additional shared-state and verification problems.
Corrections scope automatic-open state to a run, exclude self-generated native checkbox events from user intent, and withhold completion after user intervention.
The grouped preference adapter rejects custom/shadow controls and Save buttons with known acceptance identities.
Completion snapshots existing equivalent prompts and applies its node budget per poll. Genuine inspection exhaustion still prevents success.
An unrelated gesture before any action permits one delayed retry. An interrupted flow with earlier actions stays stopped and retains ownership.
Manual-choice diagnostics retain their reason. Document action histories do not reset on SPA navigation.

The review's proposed third visible OneTrust group was disproved by both captured live panels: each has C0001 and OSSTA_BG only.
Publisher-locked functional permission remains enabled in storage but has no exposed control. The adapter makes no claim of rejecting that permission.
The review also listed generated-content and native-collapse tests as missing; those exist in the full supplied repository.
A short observation window cannot prove a prompt will never return, and neither publisher establishes coverage of all OneTrust integrations.

The [second review](docs/audits/1.2.4-followup.md) caught a transient absent-stage reset and a panel-level shadow-control gap.
The final adapter clears automatic-open state only at run disposal and inspects the panel itself for shadow content.
The review also identified crowded mutation queues. Related records now coalesce into a shared subtree that remains subject to the inspection limit.
Its suggestion to discard overflow records was rejected: losing observations could falsely establish disappearance.
Ancestor inspection is memoized per poll, existing-candidate snapshots have a finite bound, and ancestors cannot masquerade as independent sibling prompts.
The presentation primitive's synchronous focus effects also run under automatic-event suppression.

The [final delta review](docs/audits/1.2.4-final-delta.md) confirmed these corrections and found an ordering problem in ancestor memoization.
The memo now stores remaining search depth, so a shallow earlier walk cannot truncate a later, longer one.
The review described attribute records as shallow, but they already request subtree inspection and ancestor coalescing.
Its underlying ordering concern does apply to character-data records; a child-first text-mutation regression tests that path.
No other blocker was reported in that reviewed delta. Reviews remain static; measured results belong in VALIDATION.md.

---

# Release 1.2.3 independent review

Claude Opus reviewed the plan and implementation through the authenticated CLI with tools disabled.
The [plan review](docs/audits/1.2.3-plan.md) requested stronger source evidence, control checks, and attempt limits.
The implementation includes matching source hashes across three publishers, rejects unknown and shadow controls, and permits one native attempt.
The [decision record](docs/PRIVACY-NOTICES.md) explains the remaining handler-change limit and rejected proposals.

The first implementation request returned tool-call text without findings. It does not count as a completed audit.
The [completed implementation review](docs/audits/1.2.3-implementation.md) found a real gap in the button text check.
An unchanged aria-label could conceal new consent instructions inside that button. The adapter now requires the reviewed button text too.
Visible and hidden instruction regressions cover this change.
The adapter also refuses action if the closed-shadow inspection API is unavailable.
The [follow-up review](docs/audits/1.2.3-followup.md) confirms those corrections and reports no new blocker.
It identifies remaining DOM-observation limits, including CSS-generated text. Image and SVG-use elements are already outside the adapter allowlist.

Two reported uncertainties concern code outside the audit snapshot. The content runner connects the activation callback, and the page guard protects sibling password fields.
Executed tests cover both paths. The review confirms fresh classification after the asynchronous guard and the separate notice outcome.

Three other findings concern existing generic promotion behavior: replacement classification, app-banner revalidation, and lifetime attempt accounting.
They remain follow-up investigation items, not verified regressions from this notice adapter.
The notice path checks every visible replacement directly, has no cosmetic fallback, and deliberately retains its attempt limit.

Reviews are static. Browser tests and live observations appear in VALIDATION.md.

---

# Release 1.2.2 independent review

The user requested broader research and a first-principles review before implementation. The [decision record](docs/PRESENTATION-RECOVERY.md) compares native actions, cosmetic recovery, provider APIs, network prevention, lists, and remote models.

Claude Opus reviewed a read-only plan snapshot through the authenticated local CLI. Its [plan review](docs/audits/1.2.2-plan.md) rejected saved inline-style restoration and recommended user-origin CSS. The implementation adopted that mechanism and retained the shared guarded runner.

The [implementation review](docs/audits/1.2.2-implementation.md) found concrete lifecycle and overflow bugs. Revisions now resume scrolling after a modal closes, preserve body overflow propagation and sticky headers, prefer primary content over related articles, detect document pseudo-element dimmers, release on surface mutations, and refuse shadow-containing surfaces. Site reversion receives an unconfirmed diagnostic. Mutation work is coalesced. The matching extension tests exercise these counterexamples.

The [delta review](docs/audits/1.2.2-followup.md) confirmed the earlier changes and found a missing wake-up after fullscreen exit. The implementation now listens for fullscreen, close, and cancel events while an override is active. A real fullscreen enter/exit test and a native dialog close test pass. The existing content observer already watched the dialog open attribute, so that part of the finding was a test gap rather than an unhandled mutation.

A shadow-password test expected an unconfirmed result, but the page guard correctly prevented even the native action. It now uses a shadow email field to exercise the later scope refusal. That corrected test passes.

The full browser suite then exposed a public-HTTP startup regression: the new constructor used secure-context-only `randomUUID`. The fix reuses the existing `getRandomValues` identifier code through a shared helper. Tests cover both provider rejection and the new presentation fallback on public HTTP origins. This was a product regression, not an incorrect browser observation.

Reviews are static; they do not certify live-site coverage. Complete measured results are in VALIDATION.md.

---

# Independent audits

## Version 1.2.1

Claude reviewed the optional adblock prompt change through its authenticated CLI, with tools disabled.
The [initial review](docs/audits/1.2.1-initial.md) led to these corrections:

- Visible text must identify an ad blocker. Generic phrases such as “Allow ads” cannot authorize the category.
- Forms and authentication requests remain protected. Incidental Sign in controls do not prevent a recognized refusal.
- One explicit decline takes priority over Close. Unrelated nested panels and ambiguous refusals remain untouched.
- Named adblock dialogs retain indirect user intent, including delayed prompts after Play or similar controls.
- Discovery uses a shared label vocabulary and includes native anchors without `href`.
- Bounded ancestor searches no longer share incomplete traversal results.

The observed Vox fixture includes its native anchor handler, which activates the site's hidden Close control.
Negative fixtures wait for a successful cookie rejection as evidence that the extension scanned the page.
Audits remain separate from browser tests and live verification.

The [follow-up](docs/audits/1.2.1-followup.md) found that authentication instructions in landmarks or after the text sample could escape the veto.
The corrected veto scans the full prompt, exempts only exact short sign-in controls, and refuses action when its budget expires.
Regression cases include footers, headers, asides, longer links, late instructions, and words split across text nodes.
The [final targeted review](docs/audits/1.2.1-final.md) cleared this correction, conditional on the final browser suite.
Its uncertainty about the authentication regex was checked against the source: ordinary “Sign in to continue” does not match `REQUIRED_AUTH`.
Those fixtures therefore exercise the new veto. A final whitespace normalization also preserves instructions split across text nodes.

## Version 1.2.0

Claude reviewed the [plan](docs/audits/1.2.0-plan.md), [implementation](docs/audits/1.2.0-initial.md), and three follow-ups through its authenticated CLI. Reviews used read-only snapshots. The auditor could not execute commands, edit files, or test websites.

The reviews led to these corrections:

- Structural discovery applies to promotional dismissal only. It does not widen cookie acceptance.
- CookieYes category cookies no longer count as proof of a completed save.
- Hidden or absent provider panels do not block unrelated consent flows.
- Unknown visible preferences still prevent fallback actions.
- Older settings controls, selected-save buttons, and fragment links retain guarded compatibility.
- Public HTTP pages use an available random-ID API for rejection flows.
- Guard stops retain their status and reason. Delayed receipt evidence belongs to its original action.
- Navigation and control text cannot supply the evidence for an unfamiliar registration invitation.
- Duplicate provider roots prevent actions and generic fallback.

The [follow-up](docs/audits/1.2.0-follow-up.md) and [final review](docs/audits/1.2.0-final.md) record the intermediate findings. The [last correction review](docs/audits/1.2.0-links.md) found no blocking issues. Its suggested diagnostic assertion was added to the duplicate-root test.

A later live Cookiebot visit exposed a shared attempt-key collision during hydration. The [hydration review](docs/audits/1.2.0-hydration.md) found no blocker in the correction. Its optional reverse-order hardening was applied: semantic handling retires the matching legacy recipe. Two regression cases cover both ordering directions.

These reviews do not certify security or establish live coverage. Generic detection has bounded scans and English category patterns. Some provider variants remain unsupported. Fragment controls that depend on default hash navigation can remain open. See [validation](VALIDATION.md) for separate browser evidence.

## Version 1.1.2

Claude reviewed the Sourcepoint US provider adapter in three read-only passes. The [initial review](docs/audits/1.1.2-audit.md) identified a fallback risk: an older GDPR rule could act after the US adapter refused a panel. The implementation now owns the US manager frame exclusively, checks preferences across the document, and requires the shared click guard.

The [follow-up](docs/audits/1.1.2-followup.md) found no remaining blocker. Its notice-frame hardening suggestion was also implemented: manager controls trigger exclusive handling even under a notice URL. The [final delta review](docs/audits/1.1.2-delta.md) found no new actionable blocker.

The adapter uses provider markup and explicit opt-out semantics, with no Futurism-specific hostname rule. Tests cover refusal, cancellation, inherited guards, provider identity, and the notice-to-manager transition. Live tests separately verified the native On segment, saved sale/sharing opt-out, and persistence after reload in both cookie modes. See [validation](VALIDATION.md).

The auditor read code only. It did not run browser checks or certify security. Unrecognized provider variants remain unsupported. Sourcepoint iframe removal can prevent a success badge update even when the choice was saved.

## Version 1.1.1

Claude reviewed the registration plan, implementation, and corrections through the authenticated CLI in read-only snapshots. It found and helped resolve four concrete issues:

- Reading invitations could be confused with session-expiry warnings. The detector now requires reading context and vetoes required authentication.
- Save or Comment actions could open sign-in without an explicit sign-in label. Recent interactions now protect the resulting prompt.
- A busy scanner or delayed hydration could lose that intent. Mutation-time markers preserve it until classification.
- A matching body class could protect the entire page. Intent markers now exclude html and body.

The [initial review](docs/audits/1.1.1-initial.md), [follow-up](docs/audits/1.1.1-follow-up.md), [timing review](docs/audits/1.1.1-delayed-intent.md), and [final sign-off](docs/audits/1.1.1-signoff.md) are retained. The final review found no remaining code blocker. Full tests and a live Guardian check are separate acceptance gates; see [validation](VALIDATION.md).

The reviewed design uses a shared category detector and executor. See [adding prompt categories](docs/ADDING-PROMPT-CATEGORIES.md). Claude did not run commands, change files, or test the browser.

## Version 1.1.0

Claude reviewed the plan and source through its CLI in a separate, read-only snapshot. The initial audit used Claude Opus 5. It could read snapshot files but could not execute commands, edit files, use connectors, or start other agents.

The initial review found release blockers. The implementation changed before the follow-up review.

| Finding | Resolution |
| --- | --- |
| URL changes erased user intent and reset budgets | Protections and promotion budgets now last for the document, including hash and client-side routes. |
| Delayed user-opened dialogs could close | Trusted interactions retain controlled element IDs and recognized intent categories. Unrelated gestures defer actions. |
| Checkout and login protection only blocked cookie acceptance | Sensitive fields, payment frames, and protected paths also block promotional actions. |
| Restored chats and previously started media could close | Conversation logs, composers, and playing or previously played media prevent dismissal. |
| Guardian rule could choose a different close control | The rule requires the exact Collapse banner label and confirms Expand banner. A successful rule stops for the document. |
| Nested generic candidates could duplicate a site rule | Known rule containers exclude generic ancestors and descendants. |
| Navigation links and nested form controls could activate | Promotional actions reject anchors and controls within unsafe form, link, label, or summary contexts. |
| Foreign frames could hide useful embedded widgets | Promotion actions are limited to top-level and same-hostname frames. Cookie frames retain their existing support. |
| Settings changes could repeatedly restore and hide elements | Cosmetic changes restore only when automation is paused or unavailable. Native action budgets persist. |
| Outcome counts could claim unverified success | Actions poll for disappearance or a collapse transition. No-op and replacement handlers have bounded retries. |
| Repeated DOM traversal could be expensive | Guard results are cached per mutation revision. Scans use changed scopes. Inserted subtrees and mutation targets are deduplicated. |
| Product descriptions covered only cookies | Listing, privacy policy, popup, about page, and website now describe promotional actions and interaction protection. |

Behavior tests cover these changes using the actual extension. A realistic Guardian fixture reproduces its inline custom element and hidden button label with original synthetic text.

Remaining limits: ambiguous user intent without a meaningful control relationship can be missed. A consent flow can delay promotional work. Some late shadow roots are unobservable. Generic promotion labels are English. Local scam heuristics do not certify websites. These limits are also described in the implementation plan and user documentation.

The [follow-up audit](docs/audits/1.1.0-follow-up.md) gave a **conditional go**, with no remaining code blockers. The [initial report](docs/audits/1.1.0-initial.md) remains available for comparison.

The follow-up caught a chat-intent test that used a foreign frame and could pass without exercising inheritance. It now uses the same host. Another test verifies controls linked to inner or outer dialog elements; the implementation now preserves both. Build output is cleared before each build, and NOTICE.txt is included. Wording now distinguishes recognized generic prompts from unsupported cases.

Manual checks confirmed the personal-profile Guardian collapse, preserved navigation/search, and no automatic actions on observed login and cart pages. A scripted-scroll trace supplements the three idle traces. These samples do not prove universal coverage. Test evidence is recorded in [VALIDATION.md](VALIDATION.md). No initial-audit finding is treated as resolved solely because Claude suggested a fix.

The [final delta review](docs/audits/1.1.0-release-delta.md) confirmed that the corrections introduced no blocking issues. Its remaining store-copy clarification was applied. Package identity was checked after the final build; the checksum in VALIDATION.md includes NOTICE.txt and the controlled-target fix. Hosted CI and the dashboard status are verified separately from the audit.

A late report on E4E Africa exposed a CookieYes legacy dialog whose visible state retains aria-hidden=true. A provider-specific compatibility fix now saves only after necessary cookies are enabled and every optional category is off. Four focused tests passed, and the real site retained necessary-only preferences after reload. Claude gave the [targeted fix a go](docs/audits/1.1.0-cookieyes.md), with no blockers; all other visibility and page safeguards remain in place.

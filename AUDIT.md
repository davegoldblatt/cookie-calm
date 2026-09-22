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

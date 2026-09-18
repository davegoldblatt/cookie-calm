# Independent audit: Cookie Calm 1.1.0

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

# Recovering from failed optional dismissal

Status: candidate implementation, with independent plan review. This supersedes the assumption that native controls are the only permissible strategy.

## What the user wants

Read or use the existing page without unsolicited interruptions. Preserve privacy choices, useful workflows, and the ability to undo an incorrect cosmetic decision.

A cookie preference is a state-changing decision. A promotional obstruction is a presentation problem. A required purchase or login may represent missing access. These outcomes need different evidence and strategies. Hiding one element does not prove that any of them has been resolved.

## Assumptions challenged

| Assumption | What the code or research shows | Consequence |
| --- | --- | --- |
| Every popup is a single element | A component can own a surface, backdrop, document overflow, inert state, focus trap, and remote state. | Verify the affected component and page usability, not just a click or disappearance. |
| A Close label identifies a safe operation | Labels can belong to nested panels, active workflows, or navigation. JavaScript handlers can do arbitrary work. | Combine independent purpose evidence, scope, current user intent, and control semantics. |
| A visible refusal always works | The observed Vox refusal targeted a Close selector with zero matches. | Native failure is a strategy failure, not an impossible user outcome. |
| A provider name determines purpose | Admiral supports dismissible and blocking journeys, plus other revenue and consent products. | Classify the current request. Do not hide everything from one vendor. |
| More selectors solve every miss | Our discovery, classifier, runner, guards, and verifier can each independently stop an action. | Diagnose the failed stage before extending rules. |
| A hidden panel means the page works | Overflow can remain locked. Native modal dialogs make other content inert. | Require effect-specific verification and rollback. |
| Repeating the same click increases confidence | The runner already waits 2.2 seconds; a broken handler can remain a no-op forever. | Select another justified strategy after a bounded attempt. |
| Broad visual heuristics are harmless | Fixed positioning and high z-index also describe navigation, editors, and useful dialogs. | Geometry scopes a known request; it never establishes purpose on its own. |
| Perfect generic classification is achievable | DOM evidence is partial, layouts change, and untrusted pages can mislabel controls. | Keep uncertainty explicit and measure false actions as well as coverage. |

## Strategies compared

| Strategy | Useful when | Main tradeoff | Decision |
| --- | --- | --- | --- |
| Native refusal | A recognized visible action describes the desired effect | Handler can fail; side effects belong to the site | Keep first for supported prompts; verify its result |
| Reversible presentation transaction | An optional obstruction remains after native failure and its effects can be isolated | Shared scroll/focus state needs ownership and rollback | Add this capability to the shared execution path |
| Provider-specific API | A stable documented API exposes the desired operation | Private APIs, main-world code, and provider drift create coupling | Use only with concrete evidence; not necessary for this DOM obstruction |
| Network/script prevention | The unwanted component is known before rendering | A shared script may also supply login, payment, or consent behavior; requires a different permission/maintenance model | Separate product decision, not this repair |
| Maintained cosmetic lists | Broad known website coverage is the priority | List maintenance, compatibility, licensing, and bounded specificity remain necessary | Useful future complement; do not pretend a semantic classifier replaces established lists |
| Remote visual or language model | Local evidence cannot interpret an unfamiliar interface | Privacy, latency, nondeterminism, and validation cost | Not needed for an explicit visible refusal |

## Architecture

Keep the existing separation: discovery -> purpose and intent -> desired outcome -> guarded strategy -> observed result.

Add an effect transaction that describes exact elements and properties, verifies postconditions, and owns its rollback. Categories supply evidence and capabilities. They do not acquire separate click loops or broad style reset functions.

The first application is a fixed optional adblock request with a unique explicit refusal. The transaction has no hostname or Admiral selector. Other categories can use the same mechanism after their evidence supports the same effect contract. This is an explicit rollout choice, not a claim that other categories cannot be handled.

The contract must state what is proven and what is inferred. A visible optional refusal supports dismissal. It does not by itself prove that this component owns every scroll lock on the document. Before automatic scroll repair, resolve that ownership question or make the inference narrow, reversible, and tested against competing overlays.

Preserve consent results separately. A presentation-only result must never claim that optional tracking was rejected or that preferences were saved.

## Selected mechanism and review changes

The [independent plan review](audits/1.2.2-plan.md) challenged our style ownership and lifecycle assumptions. The implementation uses a small reusable primitive, not a new category framework.

The background service inserts fixed CSS with Chrome's `USER` origin. A document-specific token scopes the rules. The content script only adds or removes its attributes. No website class or inline style is rewritten. The new `scripting` permission supplies this CSS operation; the background rejects arbitrary CSS, foreign frames, and caller-supplied document targets.

After a failed native decline, the runner rechecks the same request, control, text, user intent, and page guard. It can hide a fixed surface that contains the recognized request and its backdrop. Shared portal text, native modal state, forms, embedded frames, suppressed article content, and competing dialogs prevent takeover.

The primitive samples nine points inside visible article or main content. Hit testing must reach that content, with an allowance for small sticky navigation. It also checks large document pseudo-element dimmers. These checks are explicit engineering limits, not proof that every visual layout is understood. Primary content visibility and accessibility state must remain available.

Overflow overrides apply only when the viewport is locked and content overflows. Body-only locks preserve viewport propagation. When both roots are locked, body horizontal clipping uses `clip` to avoid introducing a scroll container that breaks sticky positioning. The website's rules remain underneath. A mutation check coalesced at 100 milliseconds probes those rules. It releases the override after site cleanup, yields during a true modal, and resumes after the modal closes. Non-modal menus and inert carousel slides do not own the viewport lock. Committed hiding survives a same-document route change. Pause removes our effects. A detached, changed, or replaced surface loses its override; the same request does not receive another fallback in that document. Changed or replaced prompts receive a `presentation-reverted` diagnostic. Pause and resume do not reset that fallback budget. Shadow-containing surfaces are excluded until their full scope can be verified.

The `hidden` result means the scoped presentation change passed those checks. Runtime code cannot prove that arbitrary wheel or focus listeners are harmless. Tests use trusted wheel input. Cosmetic recovery does not save a publisher dismissal preference, reject consent, or create missing article access.

This increment enables the capability for recognized optional adblock requests with an explicit decline. Other categories need evidence for the same contract before adoption. Native handling for their existing controls continues.

## Observed Vox case

On the original personal-profile visit, a visible href-less “Continue without support” link called a missing Close selector. The updated 1.2.1 scanner found and activated it, but correctly recorded unconfirmed outcomes. A fixed ancestor contained the obstruction; both document roots had hidden vertical overflow.

A subsequent clean-URL visit did not show the adblock request. Its absence proves neither a fix nor a regression. Do not clear browser data to manufacture a result. Validate the observed failure in a faithful fixture, then report whether a live obstruction was actually encountered.

## Evidence required

- Native success does not invoke cosmetic recovery.
- Broken optional refusal hides the scoped obstruction and preserves article content.
- Trusted wheel input works after repair; script-driven scrolling alone is insufficient evidence.
- A changed control, changed purpose, user interaction, protected form, unrelated modal, or incomplete backdrop ownership prevents an unsafe change.
- Pause, navigation, unload, replacement, and later site style changes do not leave stale overrides or overwrite newer site state.
- Results distinguish native closure, cosmetic recovery, consent receipt, and unconfirmed operation.
- The installed personal Chrome build matches the tested package. Store publication remains separate.

## Sources and code inspected

- [Admiral recovery journeys](https://blog.getadmiral.com/3-pro-tips-to-optimize-your-adblock-recovery-increase-revenue-now): dismissal can be allowed a limited number of times before a blocking request.
- [Admiral FAQ](https://learn.getadmiral.com/faqs-adblock-recovery): multiple journeys, subscriber targeting, and browser state.
- [uBlock resource library](https://github.com/gorhill/uBlock/wiki/Resources-Library#overlay-busterjs-): scoped cosmetic filtering and style injection are preferred over its experimental generic overlay remover.
- [uBlock filter syntax](https://github.com/gorhill/uBlock/wiki/Static-filter-syntax): distinct hiding, removal, style, and attribute actions.
- [Admiral Sucks source](https://github.com/jlumbroso/admiral-sucks/blob/main/admiral-sucks/content.js): manual high-z-index hiding and broad overflow changes illustrate a different risk/interaction model.
- [HTML modal dialogs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal): top-layer backdrop and outside inertness.
- [CSS overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow): hidden overflow can still support programmatic scrolling.
- [Chrome isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): shared DOM, separate JavaScript state.
- Local code: `dom.js`, `promotions.js`, `promotion-controls.js`, `prompt-engine.js`, `prompt-model.js`, `interactions.js`, `content.js`, `page-guard.js`, `background.js`, and the installed-extension test harness.

Chrome API reference: [CSS injection and style origin](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-CSSInjection).

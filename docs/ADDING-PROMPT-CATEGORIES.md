# Add support for a prompt category

Cookie Calm uses a shared pipeline:

1. Find a candidate container.
2. Classify the prompt from its structure and text.
3. Check page safety, user intent, site pause, frame scope, and attempt limits.
4. Prefer a safe native close or collapse control. A stronger fallback needs independent evidence and effect verification.
5. Verify the result before recording success.

A detector identifies a category. It does not click controls or change the article.
The runner in `src/prompt-engine.js` owns native actions, waits, repeated safety checks, and entry to presentation recovery.
Use the reusable primitive in `src/presentation.js` for an authorized cosmetic effect. Do not add category-specific style-reset loops.
See [presentation recovery](PRESENTATION-RECOVERY.md) before extending that capability to another category.
`src/promotions.js` supplies category detection, interaction checks, budgets, and result observations.
`src/interactions.js` protects prompts that the user opens or touches.

## Extend a common category first

Simple categories use the text patterns in `src/annoyance-rules.js`.
A category with structural requirements can use a separate detector module.

For example, `src/registration-prompts.js` recognizes optional reading invitations.
It requires invitation text, a visible sign-in control, and an overlay or a recognized gate container.
It rejects containers with forms, fields, embedded frames, or editable content.
The same detector handles Guardian and other sites. It has no hostname condition.
Session-expiry notices and paid-access requests are excluded.
Nodes added or changed within ten seconds of a trusted control interaction retain an intent marker.
The marker stays with the document, even if a busy scanner or delayed hydration postpones classification.
This covers actions such as Save or Comment that can lead to sign-in.
The shared executor still requires a safe close control and checks the dismissal.

Add candidate selectors and user-intent patterns with the detector.
Do not copy safety checks into separate site implementations.

## Use a site adapter for unusual controls

The `RULES` array holds small declarative adapters.
Each adapter defines its host scope, container, category, native control, and expected result.
The Guardian support adapter, for example, uses the banner's collapse and expand labels.

Use this path when a site's control differs from a common category.
Keep any exception narrow, and include a source for the observed structure.

## Add a reviewed informational notice

A privacy notice requires handler evidence before its Close control can receive automatic activation.
Use `src/privacy-notices.js` for a reviewed contract, then register it through `PRIVACY_NOTICE_RULES`.
Keep the contract separate from generic promotional classification and consent preference handling.
Require the reviewed component, copy, controls, and link destinations. Refuse changed instructions or unknown controls.
Use the shared runner and report closure without a consent claim.
Do not enable cosmetic recovery for an unresolved notice.
See [provider evidence and limits](PRIVACY-NOTICES.md).

## Add a consent provider

Sourcepoint US, CookieYes legacy, and Cookiebot use the same semantic planner and runner.
Other bundled providers retain the Consent-O-Matic interpreter.

1. Add an observation adapter to `src/consent-adapters.js` or a separate module.
2. Identify the provider through its visible structure or verified frame origin and path.
3. Describe each preference with an ID, purpose, current value, and `grantsWhen` value.
4. Describe the activation as `toggle` or `set` with an explicit target value.
5. Identify the settings, reject, and save controls that the provider actually exposes.
6. Register the adapter and add browser fixtures for its variants and refusal cases.

The planner rejects optional permissions. An opt-out switch therefore turns on, while an analytics permission switch turns off.
Adapters observe controls. They do not click, wait, retry, or bypass the page guard.
The runner reads the controls again after the guard and before each click.
Unknown preferences stop the flow. Existing recipes cannot take over an attempted flow.
Hidden provider leftovers do not own unrelated consent banners.

CookieYes retains one scoped exception for its stale `aria-hidden` flag.
Cookiebot permits verified settings links with local fragment targets. The runner prevents their default navigation and activates their event handlers. Other navigation links remain unavailable.
Provider-specific exceptions need positive and negative fixtures.

A panel that disappears receives the `closed` result.
A submitted action without observed completion receives `unconfirmed`.
Only a supported, changed receipt can establish `saved`.
Category cookies that change before Save do not establish a completed save.
The Sourcepoint reader watches its named receipt for eight seconds and cancels on pause or navigation.

## Discover unfamiliar layouts

Structural discovery examines labelled close controls and their fixed or sticky containers.
It supplements selectors for promotional prompts. It does not widen cookie acceptance detection.
Category evidence excludes navigation and control text. Protected forms and user-opened prompts still prevent action.
Discovery is bounded per search root. Large pages, unfamiliar languages, and unlabelled controls can remain unsupported.

`src/promotion-controls.js` supplies the same labels and control types to discovery and action selection.
Buttons and anchors without `href` can expose native dismissal handlers. Navigating anchors remain excluded.
Discovery examines up to ten ancestors for each recognized control.

The `adblock` category requires a visible request to disable an ad blocker, outside links, buttons, and navigation text.
It permits an incidental Sign in button only when the prompt contains no authentication request, form, field, or embedded frame.
It prefers one explicit decline control and excludes unrelated nested panels. Multiple eligible refusals prevent action.
The shared engine checks this choice again before activation and verifies disappearance. It never selects Allow ads.
Indirect user actions also protect named adblock dialogs after their initial appearance.

## Verify the boundary

Tests must load the actual extension and prove that it ran.
Use a successful cookie rejection as a witness for negative prompt tests when possible.
Include a positive case, user-opened behavior, real forms, unsafe controls, and failed dismissal.
For common categories, include multiple hostnames and different markup.

Live checks must identify the profile and extension version.
A missing extension, old version, blocked page, or absent prompt is not a failed product test.
A synthetic fixture proves behavior for its markup. It does not prove live coverage of that domain.

The extension ships local rules. New rules require a reviewed package update.
It does not download code or send page content to an AI service.

# Add support for a prompt category

Cookie Calm uses a shared pipeline:

1. Find a candidate container.
2. Classify the prompt from its structure and text.
3. Check page safety, user intent, site pause, frame scope, and attempt limits.
4. Use a safe native close or collapse control.
5. Verify the result before recording success.

A detector identifies a category. It does not click controls or change the article.
The executor in `src/promotions.js` owns those actions and checks.
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

## Verify the boundary

Tests must load the actual extension and prove that it ran.
Use a successful cookie rejection as a witness for negative prompt tests when possible.
Include a positive case, user-opened behavior, real forms, unsafe controls, and failed dismissal.
For common categories, include multiple hostnames and different markup.

Live checks must identify the profile and extension version.
A missing extension, old version, blocked page, or absent prompt is not a failed product test.
A synthetic fixture proves behavior for its markup; it does not prove live coverage of that domain.

The extension ships local rules. New rules require a reviewed package update.
It does not download code or send page content to an AI service.

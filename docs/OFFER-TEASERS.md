# Promotional teasers

Tracked in [GitHub #10](https://github.com/davegoldblatt/cookie-calm/issues/10).

## Observation and cause

On September 22, 2026, Soylent displayed a fixed, rotated `25% OFF` tab.
Its opener was a span with `role="button"`. A separate native button had the label `Close teaser`.
The component contained no fields. A larger newsletter form existed elsewhere.

The 1.2.5 baseline missed the tab in a fresh disposable Chrome profile.
Two independent fixture layouts reproduced the miss.
Structural discovery did not recognize `Close teaser`.
Also, structural classification excluded button text, which contained the entire offer.
Adding a close label alone would therefore leave one path unsupported.

The user's Store installation was version 1.2.2 and enabled.
It was inspected separately and was not used to score the 1.2.5 baseline.

## Provider evidence

[Klaviyo's teaser documentation](https://help.klaviyo.com/hc/en-us/articles/4411540984859) describes teasers before a form, after its dismissal, or both.
The teaser opens or reopens that form. Its optional close button dismisses the teaser.
[Display settings](https://help.klaviyo.com/hc/en-us/articles/4413544555547) control later appearances.

The reported page loaded these public bundles:

- [Render.61504eca64b0f.js](https://static.klaviyo.com/onsite/js/Render.61504eca64b0f.js?cb=2)
- [default~Render~ClientStore~.b5518805aef72.js](https://static.klaviyo.com/onsite/js/default~Render~ClientStore~.b5518805aef72.js?cb=2)

The opener and X have separate handlers. The X calls module 10282's `YW` export.
That handler starts closure, records dismissal timestamps, and clears the current teaser identifiers.
It can send the site's ordinary dismissal analytics. It does not submit form fields.
This supports a native dismissal action, not a consent-saving claim.

## Decision

Keep `Close teaser` separate from the generic close vocabulary.
Only the contract in [teaser-prompts.js](../src/teaser-prompts.js) can authorize this action.
It requires a compact fixed or sticky container, one short offer opener, and one separate close button.
Both controls must be visible and usable. Neither may submit a form or navigate.
Fields, embedded frames, shadow content, extra controls, generated text, and contradictory instructions prevent action.
Hidden instructions count. The contract examines at most 80 component elements.

Supported offer text includes `25% OFF`, `Save 20%`, and `Get $10 off`.
The contract has no hostname or Klaviyo class selector.
It accepts this narrow source of evidence without allowing arbitrary button text to classify other prompts.

Structural discovery retains its ordinary 160-control limit.
An additional cheap query considers up to 40 explicitly labelled teaser buttons.
Discovery still emits at most 40 containers per root.
This lets late product-page teasers enter classification without increasing ordinary layout work.

The shared runner owns clicks and completion checks.
It rechecks the contract and user intent immediately before acting.
Named and structurally discovered teasers both respect persistent mutation-time intent markers.
The change does not add a document-wide `offer` intent veto.
Teaser retry keys include the offer text, keeping unrelated generic offer budgets separate.
Identical offers can still share a conservative budget or protection key.
A control gesture can conservatively protect a later teaser even when the two events are unrelated.
Mutation-time markers persist for the document. Asynchronous site changes are not hidden from this guard.

No opener activation, field entry, CSS hiding, or scroll override is permitted.
Closure is credited only after observed absence. A no-op or replacement remains unconfirmed.
A changed fixed teaser with its close label still present blocks completion even if it moves to another corner.
This obstruction evidence cannot authorize an action on changed instructions.

## Audit adjudication

[Claude's plan review](audits/1.2.6-research-plan.md) confirmed both causes.
Its separate-label recommendation replaced the proposed shared close-pattern change.
Its intent warning removed the proposed broad persistent `offer` guard.
Hidden forms, alternate named containers, repeated nodes, late controls, rotation, and multiple teasers received regression coverage.

The review suggested untransformed dimensions. We retained the transformed visible footprint instead.
The actual 90-degree tab and a rotated fixture both fit the compactness limit and close successfully.
The runner uses native activation, so the hypothetical center-point hit-testing issue does not apply.

The completion observer remains conservative about new overlapping obstructions.
An unrelated changed fixed surface can withhold success credit. It cannot authorize another click.
Moving a retained node offscreen also remains unconfirmed under the current visibility model.
Those limits are not solved by the new detector.

[The implementation review](audits/1.2.6-implementation.md) found a moved-replacement verification gap and unchecked instruction attributes.
The completion observer now recognizes structural teaser replacements independently of position.
Nonempty alternate-description attributes, unknown control roles, and generated instructions prevent action.
Actual DOM captures and two executed live checks resolve the review's concern that the contract might miss Soylent itself.
The runtime has no teaser class selector; fixtures use an opaque class for structural cases.
No broad asynchronous intent suppression was added.

[The follow-up review](audits/1.2.6-followup.md) confirmed the moved-replacement fix preserves action boundaries.
It also identified a possible shared-wrapper exemption. Only full-contract independent teasers now enter that baseline.
A dedicated fixture covers a replacement inside an existing shared fixed wrapper.
Potential observation gaps around newly attached shadow roots and repurposed sibling identities are tracked in [GitHub #11](https://github.com/davegoldblatt/cookie-calm/issues/11).
These are broader audit hypotheses, not reproduced live failures or solved guarantees.

## Remaining coverage limits

Signup-worded teasers, navigation-link openers, unlabelled X controls, and embedded full forms remain unsupported.
The explicit-label supplement does not cover every `aria-labelledby` variation beyond the ordinary scan budget.
Large pages can exceed discovery limits. Unknown languages and new provider layouts need further evidence.
Synthetic host variation demonstrates structural reuse, not verified support for every provider.

The live check uses a fresh profile because Klaviyo can suppress a previously dismissed teaser.
It must observe the teaser before crediting its disappearance.
See [VALIDATION.md](../VALIDATION.md) for executed tests, live outcomes, and release status.

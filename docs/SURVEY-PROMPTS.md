# Survey prompts: research and design

## Report and evidence

Issue [#7](https://github.com/davegoldblatt/cookie-calm/issues/7) tracks the Epoch survey reported on September 22, 2026.
The personal Chrome profile had Store 1.2.2 enabled and its unpacked duplicate disabled during inspection.
The survey was no longer present in the user's tab. No action was taken in that tab.
A disposable-profile check must establish the result for 1.2.4 and the candidate separately.

Primary sources retrieved on September 22:

- [Epoch article](https://epoch.ai/publications/the-plunging-price-of-thought)
- [SurveyWrapper JavaScript](https://epoch.ai/_astro/SurveyWrapper.pZaKRRcT.js)
- [Button JavaScript](https://epoch.ai/_astro/Button.D6ZZQRP4.js)
- [Survey CSS](https://epoch.ai/_astro/SurveyWrapper.Cs1W94lD.css)
- [ARIA label semantics](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label)

The public React component mounts a fixed `.survey-popup` after 45 seconds of session time.
Each page has a minimum delay of ten seconds. A suppression cookie prevents repeat invitations for 30 days.
The first screen requests a 1–7 website rating. Selecting an answer advances the survey and records answer data.
The header X uses `aria-label="Close cookie popup"`, although this component is a survey.
Its reviewed handler records `dismissed`, writes the suppression cookie, and removes the panel.
The shared Button component emits `type="button"` for this control.
An untouched first screen has no responses to send. Subsequent screens can contain prior answers.
A separate Feedback widget opens a message form; it is not this automatic survey.

There are two independent coverage gaps. Existing survey phrases do not match the invitation or question.
The shared close matcher also rejects the stale cookie label. Expanding survey text alone cannot fix both.
Accessible names are evidence about a control, not proof of its effect. A conflicting label requires handler research.

## Implementation plan

1. Add a shared survey detector. Keep established invitation phrases, and recognize website-improvement invitations combined with satisfaction questions and a visible numeric rating group. Require independent prose outside action controls. Do not infer a survey from a class name or numbers alone.
2. Use existing structural discovery for unknown layouts and the existing runner for native dismissal. Keep the general close vocabulary unchanged.
3. Add a narrow, reviewed Epoch control contract for its misleading cookie label. Require the observed host, component class, first-screen copy, question progress, exact seven rating controls, and the sole header X. Reject extra controls, forms, fields, nested prompts, hidden instructions, and changed semantics. Recheck this contract immediately before activation. No cookie-consent exclusion is removed.
4. Protect surveys opened through a trusted gesture and surveys the user has started, including delayed mounts and replaced nodes. Preserve existing interaction tracking; do not capture answers. No automatic rating, submission, or cosmetic hiding.
5. Test multiple hosts and layouts, the exact reported variant, unsupported consent labels, changed contracts, navigation/submission controls, protected fields, started/user-opened surveys, and unsuccessful closure. Prove the extension ran in negative fixtures.
6. Obtain Claude review of this research/plan, then of the implementation. Run focused tests, a full suite, and live Epoch comparison in isolated profiles. Package, publish, and record Store status separately. Keep the everyday installation enabled and preserve pending Store review.

## Limits

The detector supports bounded English survey invitations and numeric rating controls. It is not a universal survey classifier.
A reviewed host/component contract can become stale. Changed evidence must stop that exception.
A native Close may record the site's dismissal event. This change does not add extension telemetry or send page content elsewhere.

## Research and plan audit resolution

Claude's [review](audits/1.2.5-research-plan.md) confirmed the two independent causes and flagged incomplete intent protection.
The category is `survey`. Add it to the shared ten-second intent guard, which already checks retained `openedByUser` markers on all candidate paths.
This protects both named containers and reviewed rules; no duplicate rule-specific gesture mechanism is needed.
Use a separate `reviewedDismissal` predicate after the ordinary consent, protected-form, authentication and media vetoes.
Do not reuse `reviewedNotice`, which intentionally has different consent semantics. Limit reviewed dismissal to one attempt.

The source excludes the homepage and paths starting with `/about`, `/contact`, or `/test`.
Reproduction uses the reported article in a fresh profile, with no suppression cookie or session-start state.
The first question is numeric; the two later questions are single-choice. Require exactly `Question 1 of 3` for the exception.
The thank-you state has a no-op X and removes itself after 1600 ms. It must not match or receive success credit.
The native dismissal suppresses the survey across this site for 30 days. That is part of the site's Close behavior.
The vanished survey in the user's existing tab has no established cause; do not infer a manual action from absence.
Button and CSS artifacts were captured before the audit but omitted from its input; both confirm the stated type and positioning.

Post-transaction feedback is not automatically a protected transaction. Checkout routes and payment fields stay protected by the existing guard.
An unsolicited rating invitation on a normal article remains eligible. A user-opened or answered survey remains protected.
The exception must pass normal known-acceptance vetoes. `Close cookie popup` is not itself a `grantsAll` match.
Publish the reviewed GitHub package; submit to the Store only when it permits a new upload. Preserve pending review.

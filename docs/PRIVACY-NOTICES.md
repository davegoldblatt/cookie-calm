# Reviewed privacy notices

## Observed behavior

On September 22, 2026, Cookie Calm 1.2.2 left the Big Blue View privacy notice visible.
The enabled Store installation and a separate clean test profile reproduced the miss.
The notice contains cookie text, so the generic promotion classifier correctly refused it.
Its Close label also falls outside the generic dismissal vocabulary.

This notice is a shared Duet/PMC component. It contains a separate link to the OneTrust privacy choices.
Its native Close handler sets a display marker, removes the component, and emits a website analytics event.
The storage helper tries localStorage, then sessionStorage. The marker does not establish cookie rejection or a saved privacy choice.
The literal marker value is `accepted`. The reviewed handler uses it to control banner visibility.
This observation makes no claim about the legal effect of the notice or downstream tracking.

## Source evidence

The following public bundles contained identical bytes on September 22, 2026:

- [Big Blue View component bundle](https://www.bigblueview.com/_next/static/chunks/2n1ahgw_35r8n.js)
- [Bleeding Green Nation component bundle](https://www.bleedinggreennation.com/_next/static/chunks/2n1ahgw_35r8n.js)
- [SB Nation component bundle](https://www.sbnation.com/_next/static/chunks/2n1ahgw_35r8n.js)

SHA-256: `e7046599a02f5aae1c098797ffa1ba14f169090bd5959c924f7c70f103e53c32`.
The bundle contains one occurrence of the marker key, `duet-pmc-privacy-banner`.
The component reads that key during mount and writes it from the Close handler.
The separate privacy link calls the consent drawer toggle.

Equivalent pseudocode for the observed handler:

```js
setStorageValue('duet-pmc-privacy-banner', 'accepted');
setNoticeVisible(false);
analytics.emit({event: 'footer_click', footer_click: {name: 'PMC Privacy Banner Dismiss'}});
```

Cookie Calm activates this native control. It does not write the marker or replace the handler.
The fixture preserves the observed structure and reproduces the marker behavior without website analytics or article content.

## Adapter boundary

`src/privacy-notices.js` contains reviewed notice contracts. They feed the existing guarded action runner through the declarative rule registry.
The first adapter recognizes the Duet/PMC component across hostnames.
Its exact copy, control, link destinations, structure, and position must match the reviewed contract.
Whitespace normalization preserves punctuation. New instructions, hidden choices, forms, custom elements, shadow controls, and unknown focus targets prevent action.

The adapter permits one native dismissal attempt per document configuration.
A visible replacement or failed handler produces an unconfirmed result. Cosmetic recovery is unavailable.
Disappearance establishes only `privacy-notice / closed`. It does not establish rejection, acceptance, or saved consent.
Storage failure can prevent persistence without preventing native closure.
The popup therefore reports closure without a persistence claim.

Page safety, site pause, user interaction, navigation, and extension lifecycle checks remain active.
The adapter only operates in the top frame.
Other cookie notices retain the existing consent rules.

## Remaining limits and audit decisions

Identical markup can acquire a different handler. Static provider recognition cannot prove arbitrary website behavior at runtime.
This limitation also applies to existing consent adapters. It requires renewed source review when reports or provider changes indicate drift.
A post-click cookie snapshot cannot prevent an earlier grant or prove server-side consent state.
Unrelated consent scripts can also change their own state during the observation window.
For these reasons, this release does not present a cookie snapshot as a safety guarantee or collect additional consent data.

Claude requested source provenance, broader publisher evidence, stricter control enumeration, and bounded retries. This release includes those changes.
Claude also proposed an adapter expiry date and mandatory persistence proof for closure. Those proposals are not part of this release.
Expiry does not detect a handler change before the date. A failed storage write does not negate an observed native closure.
The existing per-site pause and global pause controls remain available.

Additional notice providers need their own handler evidence and contract tests.
A label such as Close, OK, or Got it is insufficient on its own.
This adapter does not resolve every Close-only privacy notice in DAV-286.

# Shared prompt engine

## Goal and boundaries

Describe the user's desired outcome independently of a website's control layout.
Reject optional tracking and sale/sharing. Preserve required storage. Dismiss
unsolicited supported invitations and preserve protected or user-opened flows.
Existing acceptance fallback remains available only outside a claimed consent flow.

This increment migrates Sourcepoint US, CookieYes legacy, Cookiebot's supported
dialog variants, the researched OneTrust grouped panel, and native promotional dismissal. Other Consent-O-Matic
recipes remain available through the existing pipeline.
Adapters describe observed controls. They never click or implement their own loops.

## Contract

An adapter provides a stable ID, ownership predicate, and a fresh observation.
An observation includes a root, stage, purpose, preferences, and available controls.
Each preference has an ID, semantic purpose, current boolean state, and the state
that means permission is granted. The policy sets permission to false. The planner therefore disables a tracking switch and enables an inverse opt-out switch.
Required preferences must already be enabled and cannot be altered by this engine.
An observed-only preference constrains the final Save but has no activation target.
A parent toggle can update hidden children; each known child must reach its denial state before Save.
Unknown meanings or extra controls prevent committing the entire flow.

Controls identify a logical element and its native activation target. This permits
the Sourcepoint On segment and labelled checkboxes without pretending every outer
button has the same behavior. Provider-specific rendering exceptions remain narrow.

The shared runner observes the prompt, plans one action, and calls the current guard.
It reads the controls again, checks the same goal and target, activates the control, and waits for an observed transition.
Only the runner clicks. Every wait checks cancellation, navigation, and a deadline.
Attempts and click counts are bounded. Failed ownership remains exclusive: older
recipes and generic accept/reject fallbacks cannot take over half-completed choices.
Visible owned preferences with unknown meanings also stop. Notices without a settings
path retain the existing fallback policy. An absent panel releases ownership.
Document attempt history remains intact. Hidden provider remnants do not block unrelated banners. Unsupported visible variants can therefore have
less coverage than the older, more permissive recipes.

Promotions use the same runner through a dismissal observation. Existing category
detection, interaction protection, document budgets, and native outcome verification
remain authoritative. After an unchanged, explicit optional adblock refusal fails,
the runner can apply a reversible presentation override. The adapter describes its
scope; `presentation.js` owns CSS activation, verification, and release.
See [the research and decision](PRESENTATION-RECOVERY.md) for effect boundaries.

## Discovery and outcomes

Add bounded structural discovery around labelled controls and actual fixed/sticky
containers. Matching class names are helpful evidence, not a prerequisite. Discovery
never grants permission to click: category, user intent, and safe-control checks still
apply. Ordinary articles and navigation must not become prompt candidates.
Structural discovery applies only to promotional dismissal. It does not expand
cookie acceptance. Discovery examines up to 160 controls and 40 containers per root.
It searches up to ten ancestors per control. Discovery and action selection share exact close and decline labels.
Anchors without `href` can act as native controls. Anchors with navigation targets remain excluded from promotional actions.

Keep disappearance, submission, and stored preference evidence distinct. Only a
provider-specific receipt can establish a saved choice. An iframe disappearing alone
does not establish consent. A top-frame verifier may observe a changed first-party
Sourcepoint receipt after its child frame exits. It reads only the known consent key,
stores no raw values, expires promptly, and cancels on pause/navigation.
CookieYes category cookies can change before Save. They do not establish a saved
choice. CookieYes and Cookiebot currently report closure without receipt proof.

Temporary local diagnostics contain up to 12 results with enums and provider IDs.
They contain no page text, form values, cookie values, or full URLs.
Results distinguish unsupported, blocked, closed, saved, hidden, and unconfirmed actions.
`hidden` is restricted to promotional presentation. It cannot establish consent.
An opaque action ID correlates late receipt evidence with its original action.
No report is sent automatically. An absent prompt creates no failure record.

## Validation and rollout

Freeze the current 1.1.2 build as a baseline. Keep all 90 regression cases. Add
cross-provider tests for inverse semantics, changed/replaced controls, stuck toggles,
new preferences appearing before save, exclusive ownership, and cancellation.
Exercise structurally discovered prompts with unknown class names and protected
counterexamples. Test verified saved choices separately from mere disappearance.

Evaluate a fixed selection of public pages in isolated, version-verified profiles
against baseline and candidate. Record prompt presence, provider, observed actions,
outcome, and validity. Unseen sites are evaluation cases, not promises of support.
No prompt, bot blocks, wrong profiles, or missing extensions are not product failures.
Report misses and false actions alongside wins. Do not infer web-wide coverage.

Claude audits the design and implementation using read-only snapshots. Run the full
suite, live checks, and package identity checks before updating the Desktop install.
Publish the matching GitHub artifact. Chrome Web Store publication remains a separate
verified gate. Preserve any pending submission.

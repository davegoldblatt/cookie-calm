Cookie Calm: automatic annoyance removal

Research and implementation plan — September 18, 2026

Cookie Calm should automatically dismiss or minimize supported website interruptions. This behavior applies in both cookie modes. It needs no separate opt-in or category setup. Keep the existing global and per-site pause controls for recovery.

The immediate target is the Guardian support panel in the reported screenshot. Broader coverage should include unsolicited subscription, newsletter, donation, notification, app-install, survey, and chat prompts. Dismissible paywall prompts are included; subscription-only content still requires access.

**Implementation state (September 18):** Version 1.1.0 implements the first increment described below. The code has original Guardian and Smartbanner adapters, generic promotional dismissal, interaction protection, document-lifetime budgets, and verified outcomes. Automated checks, performance traces, the installed Gmail profile, and an independent Claude audit are release checks. See [VALIDATION.md](VALIDATION.md) and [AUDIT.md](AUDIT.md) for measured results and remaining limits. The dashboard showed the earlier release as Published - public on September 18. The 1.1.0 store update still requires review.

1. **What the research establishes**

   Annoyance blocking is an established category. These projects provide useful coverage and engineering lessons:

   | Primary source | Finding | Decision for Cookie Calm |
   | --- | --- | --- |
   | [AdGuard filter policy](https://adguard.com/kb/general/ad-filtering/filter-policy/) | Annoyance lists distinguish cookie notices, popups, app banners, widgets, and other interruptions. | Use separate internal categories so each action can have appropriate checks. Enable supported categories by default. |
   | [EasyList and Fanboy repository](https://github.com/easylist/easylist/blob/master/README.md) | The repository includes dedicated annoyance and notification lists. Base EasyList generally excludes direct targeting of a site's own promotions. | Ordinary ad blocking alone will not reliably address subscription and newsletter nags. |
   | [uBlock Origin Lite FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-%28FAQ%29) | This Chrome MV3 blocker compiles filters into packaged rules and scripts. Some filter syntax cannot be converted; filtering mode affects coverage. | Use versioned, bundled rules. Treat supported syntax explicitly instead of assuming any downloaded list will work. |
   | [PopUpOFF](https://github.com/RomanistHere/PopUpOFF) | Its design discusses aggressive removal of fixed or sticky elements and more selective handling of wanted popups. | Position and size can identify candidates, but cannot authorize removal. Login dialogs and useful controls can have the same layout. |
   | [Chrome content-filtering documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-filtering) | Chrome supports both DOM filtering and declarative network filtering. | Start with page controls and precise cosmetic rules. Add network blocking only for demonstrated cases. |

   uBlock Origin Lite with suitable annoyance rules is an existing alternative. Cookie Calm's proposed approach combines actual cookie rejection with automatic dismissal of other prompts. These are different actions: hiding a cookie dialog does not establish a rejection choice.

   I inspected the reported Guardian tab and its public component source. The support panel contains a native control labeled “Collapse banner.” Its collapsed state offers “Expand banner.” Use that state transition to verify success and prevent accidental reopening. Scope the rule to the Guardian's `StickyBottomBanner` island; avoid generated CSS class names. [Guardian component source](https://github.com/guardian/dotcom-rendering/blob/main/dotcom-rendering/src/components/marketing/banners/designableBanner/components/BannerCloseButton.tsx)

   A fresh isolated Guardian page did not reproduce the personalized promotion. It did contain unrelated section controls labeled “Hide.” The live tab and a reproduction fixture are therefore both needed for validation.

2. **Default behavior by interruption type**

   | Interruption | Automatic behavior | Protection |
   | --- | --- | --- |
   | Cookie consent | Run the existing rejection rules. Preserve the user's explicit acceptance-fallback setting. | Never count cosmetic removal as rejection. |
   | Donation, support, subscription, and newsletter prompts | Prefer native close, decline, or collapse controls. | Do not submit signup forms or activate payment links. |
   | Discounts, exit-intent offers, surveys, and rating requests | Dismiss recognized unsolicited prompts. | Preserve forms the user has started or intentionally opened. |
   | App-install and in-page notification requests | Close recognized prompts; use a tested cosmetic rule when necessary. | Never click install, allow, or download. |
   | Proactive chat greetings without a conversation or composer | Minimize the solicitation. Keep a usable way to open support. | Preserve an active conversation and user-opened chat. |
   | Inactive floating video prompts and sticky promotional widgets | Use provider-specific controls or tested hiding rules. | Preserve all playing or previously played media, navigation, and article content. Autoplay blocking is deferred. |
   | Subscription and anti-adblock overlays with a dismissal path | Use the site's dismissal path. | Do not treat a genuine content-access requirement as a removable promotion. |
   | Associated backdrops and scroll locks | Repair only the state associated with a verified dismissed panel. | Preserve any other open dialog and its focus behavior. |
   | Chrome's own notification requests | Address separately through browser settings, after the page features are stable. | Preserve existing grants; do not confuse browser UI with page DOM. |

   Security checks, CAPTCHA, two-factor authentication, checkout, cart controls, account forms, unsaved-work warnings, and file dialogs stay protected. An optional sign-in solicitation needs a specific rule that distinguishes it from a login flow the user requested.

3. **Build the action engine and Guardian fix first — proposed 1.1.0 foundation**

   Complete the current draft before widening its selectors. Put site-specific facts into a small rule registry, separate from the generic classifier. Each rule records its ID, category, host restrictions, container, control, action, success condition, and source provenance.

   A Guardian rule matches `theguardian.com` or `www.theguardian.com`, then `gu-island[name="StickyBottomBanner"]`. It selects the exact collapse control, acts once, and verifies the expanded content collapsed. It never selects “Expand banner” or a section's “Hide” control.

   Use one action sequence: detect, check context, check user interaction, act, verify, record. Recheck the target, visibility, host pause, navigation generation, and scam guard immediately before acting. For generic candidates, also recheck their overlay context and that the control belongs to the selected container.

   The draft tracks individual buttons and limits attempts. Add a rule-and-document action record so a site cannot restart the loop by replacing its buttons. Permit at most two attempts per rule or generic fingerprint per document, with backoff after an unconfirmed action. Limit the document to twelve actions and each category to four. Successful site rules stop for that document. Hash changes and client-side routes never reset user protections or budgets. Failed or ambiguous actions remain unconfirmed.

   Run cookie and promotion handling through the same scheduler, with separate outcomes and budgets. Neither handler should indefinitely delay the other. Keep top-page pause and guard decisions effective inside frames and shadow roots. Generic promotion actions run only in the top frame or frames with the same hostname. Existing cookie handling still supports foreign consent frames.

   Add interaction tracking early in the document. Observe trusted clicks, key events, focus, and input events without recording field values. Protect the relevant dialog or widget once the user opens or edits it, including after focus moves elsewhere. A short gesture grace period can defer classification; it must not suppress every prompt that follows scrolling or an unrelated click.

   The current scam heuristic stops clicks on suspicious pages. Retain that behavior and test it against the new actions. An unfamiliar close button can execute arbitrary page code, so its label alone is insufficient. Describe these checks as local safeguards, not a website-safety verdict.

4. **Add broad coverage through shared providers and precise rules**

   Start with generic handling of clear promotional overlays that offer an explicit close or decline action. Require promotional context, an overlay or known container, a safe control, and no protected interaction. Initial text matching is English; add other languages through explicit tested patterns.

   Then build adapters for repeated newsletter, commerce-promotion, survey, app-banner, and chat implementations. Choose providers from observed missed cases and maintained annoyance lists. A shared adapter should cover multiple sites; add host exceptions where behavior differs.

   Add reversible cosmetic suppression for known cases without a usable native dismissal. Keep the element in the DOM and apply an extension-owned marker or stylesheet. Restore only changes owned by the extension. Do not remove arbitrary page nodes or reset every `overflow`, `inert`, or `aria-hidden` value.

   Early cosmetic rules need a settings-aware bootstrap at `document_start`. Default to no suppression until the top-level site's enabled state is known. This prevents an early rule from ignoring a site pause. Apply only rules whose exact target and user-triggered variants have been tested.

   Existing lists provide research material and possible rule data. Choose a small licensed subset only after a coverage trial. AdGuard's filter repository uses GPLv3; EasyList documents GPL and Creative Commons ShareAlike licensing options. Preserve the chosen files' actual licenses, attribution, version, and modifications. Do not relabel imported rules as MIT. [AdGuard license](https://github.com/AdguardTeam/AdguardFilters/blob/master/LICENSE), [EasyList license](https://easylist.to/pages/licence.html)

   For imports, support a documented subset of domain-scoped CSS rules and their exceptions. Reject unsupported syntax during the build and report skipped rules. Do not silently interpret scriptlets or procedural filters as CSS. Author Cookie Calm's own rules where import complexity exceeds the coverage benefit.

   Keep executable code packaged with the extension. Remote executable updates conflict with Chrome's MV3 rules. Bundled data also keeps releases reproducible and permits rollback. [Chrome remote-code guidance](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)

5. **Keep pages responsive and recovery simple**

   Reuse the existing observer, frame support, navigation cancellation, and pause controls. Route mutation records to affected containers and active host rules. Avoid repeated full-page text extraction for every mutation. Cache stable findings, debounce work, and stop scanning hidden documents.

   Replace the current unconditional four-second full scan with bounded fallback discovery. The implementation uses mutation-scoped scans and fallback discovery at 0.5, 1.5, 5, 15, and 45 seconds. It discovers delayed prompts, roots in newly inserted subtrees, and client-side routes. A shadow root attached later to an existing host without an observable mutation can be missed. A one-second timer only compares the URL; it does not scan an unchanged DOM.

   Report cookie outcomes separately from promotion outcomes. Show a removal count only after the result is verified. Serialize background status updates so concurrent frame reports cannot overwrite one another.

   Keep one master switch and one site pause. Add restoration for extension-owned cosmetic changes. Native close actions may set website preferences that the extension cannot undo; do not label those actions reversible. A user who reopens a collapsed panel should keep it open for the document's lifetime.

   Process content locally. Store only settings and temporary action metadata. Any future issue report must be user-initiated and previewable, with query strings and page content excluded by default.

6. **Validate coverage and breakage before release**

   Extend the existing Playwright tests using the actual built extension. Add behavior tests rather than tests that repeat selector strings.

   | Test group | Required evidence |
   | --- | --- |
   | Guardian | Expanded panel collapses once; already-collapsed panel stays collapsed; rerender does not cause a loop; article section controls remain untouched. |
   | Common prompts | Newsletter, donation, discount, survey, and app prompts disappear through verified controls in both cookie modes. |
   | Protected flows | Login, payment, CAPTCHA, form submission, navigation, active chat, user-started media, and edited forms receive no automatic action. |
   | Ambiguous controls | A submit button labeled close, a navigational link, unrelated modal text, and a no-op close handler produce no false success. |
   | Lifecycle | Delayed prompts, shadow DOM, cross-origin frames, repeated insertion, navigation, back-forward cache, and pause during an action behave correctly. |
   | Recovery | Site pause applies before early CSS; cosmetic restore preserves other dialogs; page scrolling and keyboard focus remain usable. |
   | Cookie regression | All existing consent tests pass; new suppression does not hide unresolved consent or change the acceptance setting. |

   Build a recorded corpus of 30 pages across news, commerce, productivity, and support sites, including the reported Guardian variant. Track the exact cases present, the expected action, observed result, date, and rule version. Pages with no prompt are not evidence of successful dismissal. Record unsupported cases too.

   Release checks for the first increment: every supported fixture passes; no unintended action occurs in the protected-flow fixture corpus; the reported Guardian variant works in the verified personal profile; and Claude findings are addressed or explicitly scoped. A 30-page exploratory sample was reviewed, but many pages had no prompt or a bot challenge. It cannot establish a dismissal percentage. The broader coverage target remains at least 90% of a future corpus with confirmed in-scope prompts. Publish the denominator and each miss before making that claim.

   Measure runtime on the development Mac and record browser, extension version, and profile type. Target dismissal within one second when no consent flow is running. A consent provider can occupy the shared scheduler for up to 18 seconds; promotion work runs between providers. Keep unchanged pages free of recurring full-DOM scans. Treat callbacks over 50 ms as performance findings and fix repeated subtree traversal before expanding coverage. Trace attribution does not measure all extension CPU or establish a universal latency guarantee.

7. **Release in two increments and maintain the rules**

   First ship the Guardian adapter, interaction protection, verified generic promotional dismissal, and regression tests as 1.1.0. This increment also includes fixture-validated proactive chat greetings, inactive floating players, and the reversible Smartbanner app rule. Broader widget adapters and cosmetic rules follow after separate coverage checks. All shipped categories operate automatically; this sequence is a validation order, not an opt-in feature menu.

   Update `README.md`, privacy documents, popup copy, store text, and screenshots to describe automatic website-interruption handling. Use one coherent product purpose. Chrome requires a narrow, understandable single purpose; approval remains Google's decision. [Chrome quality guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines)

   Run `npm test` and `npm run package`. Check that the package contains the intended version, notices, and root manifest. Preserve a rollback package. Update the installed Desktop extension, reload it, and confirm the reported Guardian panel in the real browser. Publish matching GitHub source and release artifacts with installation instructions.

   Check the current Web Store state before uploading the new package. The last verified submission is pending review; this plan does not imply approval or a submitted update. Choose the dashboard's available update path without silently withdrawing the existing submission.

   Follow with provider adapters, tested cosmetic rules, and performance improvements. Check upstream rule changes weekly during initial rollout, pin every imported revision, and rerun affected fixtures. Add a regression case for each reported miss or unintended dismissal.

   Browser-native notification prompts form a later implementation step. Chrome's `contentSettings` API supports notification blocking but needs an additional permission. A design must preserve existing grants, respect site pauses, and remove only extension-owned overrides. Standard page scripts cannot dismiss Chrome's UI. Native popup windows also differ from in-page overlays; preserve legitimate authentication and payment windows. [Chrome content settings](https://developer.chrome.com/docs/extensions/reference/api/contentSettings)

   Add declarative network rules only when a measured class of nuisance survives DOM handling and can be blocked without breaking core page code. Keep that work separate from the initial dismissal release so the first improvement needs no additional browser permission.

**Later increments:** provider-specific chat, autoplay, anti-adblock, and optional sign-in adapters need separate evidence. Native notification settings and network redirect protection remain deferred. Keep shipped dismissal automatic in both cookie modes. Record checks in the wrong Chrome profile or with an old extension version as invalid for the new release, never as product failures.

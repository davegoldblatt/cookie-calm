# Shared engine evaluation — September 19, 2026

## What this comparison measures

The baseline is the frozen 1.1.2 extension. Candidate profiles load the actual 1.2.0 extension and check its version through the service worker. Each live visit uses a fresh disposable Chromium profile. Personal Chrome installation checks are separate.

The eight-page list was fixed before candidate discovery results were inspected. Initial visits were sequential and used a 14-second observation window. Timing, region, and website experiments can affect the result. These visits are a small convenience sample, not an estimate of web-wide coverage.

A missing extension, wrong profile, absent prompt, or blocked page is not a product failure. A click alone does not establish success.

## Controlled comparison

The same 14 fixtures ran against both builds. Six fixtures contain unfamiliar prompt layouts with synthetic class names. Eight fixtures contain flows that must stay available.

| Cases | 1.1.2 | 1.2.0 |
| --- | --- | --- |
| Newsletter, registration, discount, support, survey, and French newsletter | 0 of 6 closed | 5 of 6 closed |
| Login, checkout, required authentication, navigation, active chat, unsaved work, user-opened prompt, ordinary article | 0 of 8 received automatic clicks | 0 of 8 received automatic clicks |

The French newsletter remained unsupported. Promotional category patterns currently use English. These handcrafted cases show the intended structural improvement. They do not establish a live success rate or false-positive rate.

An initial benchmark fixture omitted its UTF-8 charset and decoded the close symbol incorrectly. That run was discarded. Both builds used the corrected fixture for the results above.

## Public-page observations

| Page | Observation |
| --- | --- |
| Futurism article reported by the user | Both builds handle the Sourcepoint opt-out. The new build also reports the changed saved receipt after the iframe disappears. |
| E4E Africa jobs | Both builds open Cookie Settings and save the selected choices. The new runner reports closure without claiming receipt proof. |
| Cookiebot homepage | Most visits used Deny. A final visit exposed a hydration race between legacy rules and the new adapter. A controlled reproduction confirmed the shared attempt-key collision. The corrected runner separates those attempts. Two subsequent visits used Deny and reported closure. |
| Smithsonian homepage | The first short visit suggested an improvement. Longer interleaved repeats showed a native Close action in both builds. This is not counted as a new coverage win. |
| Popular Science homepage | Both builds left the visible privacy notice open. Its visible controls were privacy links and Close. |
| Lifehacker homepage | Both builds left the visible privacy notice open. Its visible controls were privacy links and Close. |
| wikiHow homepage | Both builds attempted close controls. A support banner remained visible. The new build recorded an unconfirmed result, not success. |
| ScienceAlert homepage | HTTP 403 in both profiles. This was excluded from product coverage. |

Smithsonian repeated in baseline, candidate, candidate, baseline order with a 22-second observation window. All four visits recorded Close. The broader initial timing difference therefore does not establish superiority.

The final provider checks use longer waits and a reload for Futurism. They separately check the saved sale/sharing opt-out. A stored choice does not prove downstream tracker compliance.

## Remaining coverage work

Unknown provider controls remain visible. Close-only privacy notices need a defined consent policy before automatic dismissal. Unfamiliar languages and unlabelled controls need additional detection support. Bounded discovery can miss controls beyond its scan limit.

New support belongs in reusable provider adapters or category detectors, with positive and protected fixtures. It must not require another page-wide click loop. The [contributor guide](ADDING-PROMPT-CATEGORIES.md) describes that boundary.

The comparison supports the new architecture and its tested structural cases. It does not establish broad superiority over other extensions.

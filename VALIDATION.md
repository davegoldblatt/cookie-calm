# Validation

## Release 1.0.1 — September 16, 2026

All 22 Playwright tests passed against the built Manifest V3 extension in Chromium. Each test used a separate browser profile.

The suite covers rejection, necessary cookies, acceptance fallback, French labels, provider settings, frames, shadow roots, and delayed banners.

It also checks pause controls, saved settings, unrelated forms, repeated clicks, failed category changes, cancellation, SVG graphics, and saved-choice acknowledgements.

Guard tests cover clear scam prompts, password and payment forms, wallet prompts, downloads, public HTTP pages, and internationalized domains.

The popup tests passed after removing the redundant `activeTab` permission. The extension requests `storage` and HTTP/HTTPS host access.

These tests show behavior on controlled fixtures. They do not establish universal coverage or prove that websites honor consent choices.

## Earlier live checks — September 11, 2026

| Site | Observed result |
| --- | --- |
| GOV.UK | Rejected additional cookies and dismissed the confirmation. |
| Cookiebot | Dismissed the consent dialog. Its exposed state showed necessary cookies enabled and optional categories disabled. |

These checks cover only the page variants served on that date. They have not been repeated for this publication preparation.

## Release artifacts

- The build contains 203 upstream rule files merged into 202 named definitions.
- Six upstream interpreter modules retain their original contents and MIT license.
- The Chrome Web Store ZIP has `manifest.json` at its root.
- ZIP integrity and file contents are checked against the installable folder.
- Release checksums are provided with the downloadable ZIP.
- Store screenshots show the actual popup on controlled demonstration pages.

The source, automated checks, installation guide, and privacy policy are public. Chrome Web Store availability requires submission and approval.

## Reproduce

Run the commands in [README.md](README.md#build-and-test). The [test suite](tests/extension.spec.js) and [CI workflow](.github/workflows/check.yml) are included.

Test logs and temporary browser profiles are not distributed with the source or extension.

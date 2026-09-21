# Cookie Calm distribution status

Verified September 21, 2026.

| Channel | Version | State |
| --- | --- | --- |
| GitHub source | 1.2.2 | PR #2 merged; all 142 browser tests passed locally and in CI |
| GitHub release | 1.2.2 | Release package and SHA-256 checksum published |
| Personal Chrome / Desktop | 1.2.2 | Enabled unpacked install; package files and local recovery checked |
| Chrome Web Store update | 1.2.2 | Submitted for review September 21 at 2:55 p.m. Pacific; automatic publication selected |
| Chrome Web Store public version | 1.2.0 | Remains published while Google reviews the update |

The dashboard confirmed “Your extension was submitted for review.” This is not approval or publication of 1.2.2.
The submission includes the updated description, test instructions, and justification for the new `scripting` permission.
The work Chrome profile was not changed.

Extension ID: `mlcplepgfaafffckbjbaekaekpphjccd`.
[Store listing](https://chromewebstore.google.com/detail/cookie-calm/mlcplepgfaafffckbjbaekaekpphjccd) · [GitHub release](https://github.com/davegoldblatt/cookie-calm/releases/tag/v1.2.2)

Package: `cookie-calm-1.2.2-chrome-web-store.zip`.
SHA-256: `1ff8e0e1ac831bebc75835e3fe17ef5dd61e377c5d88131ec59449034dfe68ee`.

The following steps remain available for later releases.

## Register the publisher account

1. Open https://chrome.google.com/webstore/devconsole.
2. Sign in to the Google account you want to use as publisher.
3. Complete Google's developer registration and account verification.
4. Pay the one-time registration fee shown by Google.
5. Complete any required two-step verification and email verification.

The account owner must complete payment and account declarations directly. The extension does not need payment details.

## Upload

1. Open the existing Cookie Calm item. Check its current review status before changing the submission.
2. If the dashboard permits an update, upload `cookie-calm-1.2.2-chrome-web-store.zip` from the release assets.
3. Enter the copy and links in [LISTING.md](LISTING.md).
4. Upload the 128-pixel icon and the images under `assets/`.
5. Complete the privacy fields using [PRIVACY-DISCLOSURES.md](PRIVACY-DISCLOSURES.md).
6. Complete the publisher and distribution declarations for your account.
7. Submit the item for Google's review.

Do not withdraw an existing pending submission just to upload this update. If uploads are locked during review, retain the new ZIP and listing assets until the dashboard allows the update.

Google controls review and approval. Submission does not guarantee approval or immediate publication.

The store ZIP has `manifest.json` at its root. It is different from the older desktop ZIP that contains an enclosing folder.

## After approval

Verify the newly published version on the public listing. Update this status record only after confirming it.

For future releases, increase the manifest version and upload a newly tested package.

## Official instructions

- https://developer.chrome.com/docs/webstore/register/
- https://developer.chrome.com/docs/webstore/set-up-account/
- https://developer.chrome.com/docs/webstore/publish/
- https://developer.chrome.com/docs/webstore/prepare/

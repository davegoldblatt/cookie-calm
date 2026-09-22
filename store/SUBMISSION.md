# Cookie Calm distribution status

Verified September 22, 2026.

| Channel | Version | State |
| --- | --- | --- |
| GitHub source | 1.2.3 | PR #3 merged as `0383d5d`; both final CI runs passed all 150 browser tests |
| GitHub release | 1.2.3 | Release ZIP and SHA-256 checksum published |
| Personal Chrome | 1.2.2 | Store installation enabled as the everyday copy |
| Desktop development installation | 1.2.2 | Unpacked extension remains disabled |
| Desktop release ZIP | 1.2.3 | Copied and verified in the Cookie Calm folder |
| Chrome Web Store update | 1.2.3 | Submitted September 22 at 12:26 p.m. Pacific; Pending review; automatic publication selected |
| Chrome Web Store published version | 1.2.2 | Confirmed in the developer dashboard |

The dashboard confirmed that the extension was submitted for review. This does not establish approval or publication of 1.2.3.
The submission includes the updated description and test instructions. It adds no permissions.
Development and live checks used disposable profiles. The everyday Store installation remained enabled. The work profile was not changed.

Extension ID: `mlcplepgfaafffckbjbaekaekpphjccd`.
[Store listing](https://chromewebstore.google.com/detail/cookie-calm/mlcplepgfaafffckbjbaekaekpphjccd) · [GitHub releases](https://github.com/davegoldblatt/cookie-calm/releases)

Package: `cookie-calm-1.2.3-chrome-web-store.zip`.
SHA-256: `d0ad45f4b7f9928cee71d6e5143b72c218f0f85362a68b1835ddaeeed3114613`.

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

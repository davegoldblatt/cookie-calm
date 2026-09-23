# Distribution status

Verified September 22, 2026. The final dashboard check was approximately 18:49 Pacific.

| Surface | Version | Status |
| --- | --- | --- |
| GitHub source and release | 1.2.6 | PR #12 merged; release ZIP published and verified |
| Desktop release ZIP | 1.2.6 | Copied and verified in the Cookie Calm folder |
| Everyday Chrome Store installation | 1.2.2 | Enabled in the personal Default profile; unchanged |
| Desktop development installation | 1.2.2 | Unpacked duplicate remains disabled; unchanged |
| Existing Chrome Web Store update | 1.2.3 | Pending review; automatic publication selected |
| Next Chrome Web Store package | 1.2.6 | Ready, not uploaded or submitted; preserve the pending review |
| Chrome Web Store published version | 1.2.2 | Last verified published version |

Version 1.2.6 is available through GitHub. It is not the published Store version.
The dashboard showed pending package 1.2.3, published package 1.2.2, and a disabled Upload new package button.
The existing submission was not withdrawn. Upload the matching 1.2.6 package when the dashboard allows a new update.
The next upload is tracked in [GitHub #6](https://github.com/davegoldblatt/cookie-calm/issues/6).
The final local 61-test focused run passed after the earlier 221-test full run. Hosted full checks were still running at release publication.
No permission changes were added. Development and live checks used disposable profiles.
The everyday Store installation remained enabled; the work profile was not changed.

Extension ID: `mlcplepgfaafffckbjbaekaekpphjccd`.
[Store listing](https://chromewebstore.google.com/detail/cookie-calm/mlcplepgfaafffckbjbaekaekpphjccd) · [GitHub release](https://github.com/davegoldblatt/cookie-calm/releases/tag/v1.2.6)

Package: `cookie-calm-1.2.6-chrome-web-store.zip`.
SHA-256: `13fc882d23e83d69c5f7e9e616ae3ae613706410c28498f5678f4850d62e1c55`.

## Register the publisher account

1. Open https://chrome.google.com/webstore/devconsole.
2. Sign in to the Google account you want to use as publisher.
3. Complete Google's developer registration and account verification.
4. Pay the one-time registration fee shown by Google.
5. Complete any required two-step verification and email verification.

The account owner must complete payment and account declarations directly. The extension does not need payment details.

## Upload

1. Open the existing Cookie Calm item. Check its current review status before changing the submission.
2. If the dashboard permits an update, upload `cookie-calm-1.2.6-chrome-web-store.zip` from the release assets.
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

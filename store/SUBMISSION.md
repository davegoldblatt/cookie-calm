# Submit Cookie Calm to the Chrome Web Store

The repository and release package are public. Version 1.2.0 adds the shared prompt engine, broader promotional discovery, and local result details. It is packaged separately and has not been uploaded to the Chrome Web Store.

The last verified dashboard state, September 18, showed 1.0.1 published and 1.1.0 pending review, with new uploads disabled. On September 19, the dashboard required Google account re-verification. Its current review status could not be checked. The pending submission has not been withdrawn.

Extension ID: `mlcplepgfaafffckbjbaekaekpphjccd`. The earlier release is live. This does not establish approval of the 1.1.0 update. The steps below remain useful for future submissions.

## Register the publisher account

1. Open https://chrome.google.com/webstore/devconsole.
2. Sign in to the Google account you want to use as publisher.
3. Complete Google's developer registration and account verification.
4. Pay the one-time registration fee shown by Google.
5. Complete any required two-step verification and email verification.

The account owner must complete payment and account declarations directly. The extension does not need payment details.

## Upload

1. Open the existing Cookie Calm item. Check its current review status before changing the submission.
2. If the dashboard permits an update, upload `cookie-calm-1.2.0-chrome-web-store.zip` from the release assets.
3. Enter the copy and links in [LISTING.md](LISTING.md).
4. Upload the 128-pixel icon and the images under `assets/`.
5. Complete the privacy fields using [PRIVACY-DISCLOSURES.md](PRIVACY-DISCLOSURES.md).
6. Complete the publisher and distribution declarations for your account.
7. Submit the item for Google's review.

Do not withdraw an existing pending submission just to upload this update. If uploads are locked during review, retain the new ZIP and listing assets until the dashboard allows the update.

Google controls review and approval. Submission does not guarantee approval or immediate publication.

The store ZIP has `manifest.json` at its root. It is different from the older desktop ZIP that contains an enclosing folder.

## After approval

Add the real store URL to the repository README and project website. Do not advertise a store listing before it is live.

For future releases, increase the manifest version and upload a newly tested package.

## Official instructions

- https://developer.chrome.com/docs/webstore/register/
- https://developer.chrome.com/docs/webstore/set-up-account/
- https://developer.chrome.com/docs/webstore/publish/
- https://developer.chrome.com/docs/webstore/prepare/

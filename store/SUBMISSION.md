# Submit Cookie Calm to the Chrome Web Store

The repository and release package are public. Version 1.0.1 was submitted on September 16, 2026, and its saved dashboard status was verified as **Pending review**.

Extension ID: `mlcplepgfaafffckbjbaekaekpphjccd`. The store listing is not live until Google approves it. The steps below remain useful for future submissions.

## Register the publisher account

1. Open https://chrome.google.com/webstore/devconsole.
2. Sign in to the Google account you want to use as publisher.
3. Complete Google's developer registration and account verification.
4. Pay the one-time registration fee shown by Google.
5. Complete any required two-step verification and email verification.

The account owner must complete payment and account declarations directly. The extension does not need payment details.

## Upload

1. Select the option to add a new item.
2. Upload `cookie-calm-1.0.1-chrome-web-store.zip` from the release assets.
3. Enter the copy and links in [LISTING.md](LISTING.md).
4. Upload the 128-pixel icon and the images under `assets/`.
5. Complete the privacy fields using [PRIVACY-DISCLOSURES.md](PRIVACY-DISCLOSURES.md).
6. Complete the publisher and distribution declarations for your account.
7. Submit the item for Google's review.

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

# Contributing

Issues and pull requests are welcome. Cookie Calm uses plain JavaScript and a pinned Consent-O-Matic rule snapshot.

## Local setup

```sh
git clone https://github.com/davegoldblatt/cookie-calm.git
cd cookie-calm
npm ci --ignore-scripts
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm test
npm run package
```

## Reports

For a missed banner, include the public page URL, browser version, and selected mode. Describe the expected and observed behavior.

Remove private information from screenshots. Do not include cookies, authentication tokens, payment details, or personal messages.

## Prompt categories

Read [adding prompt categories](docs/ADDING-PROMPT-CATEGORIES.md). Extend common detectors before adding a site adapter.

## Changes

Keep unknown consent forms visible. Rejection is the default. Acceptance requires the explicit fallback mode and its page checks.

Use fixture tests for new actions, rejection behavior, and false-positive risks. Live checks complement fixtures but do not establish universal coverage.

Preserve upstream licenses and attribution. Record any new upstream commit in `vendor/consent-o-matic/UPSTREAM.json`.

Avoid remote code, rule downloads, telemetry, and broad new permissions. Explain changes to privacy behavior in the pull request.

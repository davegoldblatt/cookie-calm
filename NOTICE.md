# Third-party software

Cookie Calm includes MIT-licensed code and rules from [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic).

The upstream authors are Janus Bager Kristensen and Rolf Bagge, CAVI, Aarhus University. Their copyright and license remain in `vendor/consent-o-matic/LICENSE`.

The pinned upstream commit is `8ca8500d26434c586039e126ad091e1bfccd205d`.

Six interpreter modules remain unchanged: `Action.js`, `CMP.js`, `Consent.js`, `Detector.js`, `Matcher.js`, and `Tools.js`.

The vendored directory also contains 203 referenced rule files and the upstream rule list. These merge into 202 named definitions.

Cookie Calm supplies `ConsentEngine.js` as a compatibility bridge. It replaces the upstream scheduler and UI with its own implementation.

Other additions include local packaging, rejection guards, cancellation, delayed detection, site controls, and an optional acceptance fallback.

Cookie Calm is an independent derivative. It is not affiliated with or endorsed by Aarhus University or the Consent-O-Matic authors.

The packaged extension includes both licenses. Build dependencies retain the licenses supplied by their authors.

# Dashboard privacy disclosures

These entries describe the code in this release. The account owner makes the final certifications in Google's dashboard.

## Single purpose

Automatically apply the user's cookie consent preference on supported websites, with controls and local checks that constrain those consent clicks.

## Permission justification

`storage`: save the selected mode, enabled state, and site pauses locally. Store temporary per-tab outcomes and guard reasons in session storage.

HTTP and HTTPS host access: recognize and interact with consent forms across visited websites and frames. Read the current hostname for site pauses.

The extension runs automatically across supported sites. Access to only the active tab after a click would not provide this behavior.

There is no cookies, history, clipboard, downloads, webRequest, or nativeMessaging permission. The public release removes the redundant activeTab permission.

## Remote code

No. All executable code and consent rules are included in the package. There is no eval, remote script loading, or remote rule update.

## Data categories

Declare website content, web history/browsing activity, and user activity for the local processing described here.

Website content: page text, DOM attributes, and consent-control state, used for detection and click guards.

Web history/browsing activity: addresses and hostnames of current pages. The extension does not access Chrome's history database or retain a navigation history.

User activity: consent preference settings and temporary status of automatic consent actions. No general click or keystroke log is recorded.

Page text can incidentally include personal information or communications. It is processed transiently, not extracted into separate records or sent elsewhere.

Do not claim that the extension handles no user data merely because processing stays local.

## Data use

Used only for cookie-consent automation, site pauses, status, and the associated click checks.

No sale of user data. No advertising use. No unrelated transfer. No creditworthiness or lending use.

The extension does not transmit page content or settings to the maintainer. Website controls can send their own consent requests after clicks.

## Reviewer notes

No account or login is required. Load the extension and visit a supported consent page.

The default is rejection. Acceptance requires selecting the second mode in the popup and passing the local guards.

Fixture tests are public in the repository. The test server and browser checks run through `npm test`.

The project is a disclosed derivative of Consent-O-Matic. Original copyright notices and MIT licenses are included in the ZIP.

## Policy references

- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/privacy

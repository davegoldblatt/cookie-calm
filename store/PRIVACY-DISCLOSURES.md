# Dashboard privacy disclosures

These entries describe the code in this release. The account owner makes the final certifications in Google's dashboard.

## Single purpose

Automatically handle repetitive website interruptions through the user's cookie preferences and dismissal of supported promotional prompts, with local interaction safeguards and site pauses.

## Permission justification

`storage`: save the selected mode, enabled state, and site pauses locally. Store temporary per-tab outcomes and guard reasons in session storage.

HTTP and HTTPS host access: recognize consent forms and promotional interruptions and use their controls across visited websites and frames. Read the current hostname for site pauses.

The extension runs automatically across supported sites. Access to only the active tab after a click would not provide this behavior.

There is no cookies, history, clipboard, downloads, webRequest, or nativeMessaging permission. The public release removes the redundant activeTab permission.

## Remote code

No. All executable code and consent rules are included in the package. There is no eval, remote script loading, or remote rule update.

## Data categories

Declare website content, web history/browsing activity, and user activity for the local processing described here.

Website content: page text, DOM attributes, and control state, used for detection and action guards.

Web history/browsing activity: addresses and hostnames of current pages. The extension does not access Chrome's history database or retain a navigation history.

User activity: consent settings, temporary action status, and interaction events used to preserve active forms and user-opened prompts. No typed values or general interaction history are recorded.

Supported Sourcepoint flows temporarily read a named local consent receipt to check the saved opt-out. Raw receipt values stay in memory for at most eight seconds. Session storage holds up to 12 fixed result records and an opaque action ID. These records contain no page text, full addresses, or receipt values.

Page text can incidentally include personal information or communications. It is processed transiently, not extracted into separate records or sent elsewhere.

Do not claim that the extension handles no user data merely because processing stays local.

## Data use

Used only for consent automation, promotional dismissal, interaction protection, site pauses, and action status.

No sale of user data. No advertising use. No unrelated transfer. No creditworthiness or lending use.

The extension does not transmit page content or settings to the maintainer. Website controls can send their own requests after automatic actions.

## Reviewer notes

No account or login is required. Load the extension and visit a supported consent page.

Promotional dismissal is automatic in both modes. Site pause also restores extension-hidden elements.

The default cookie behavior is rejection. Acceptance requires selecting the second mode in the popup and passing the local guards.

Fixture tests are public in the repository. The test server and browser checks run through `npm test`.

The project is a disclosed derivative of Consent-O-Matic. Original copyright notices and MIT licenses are included in the ZIP.

## Policy references

- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/privacy

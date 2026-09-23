# Safari for Mac: direct distribution

This path packages Cookie Calm as a Mac app for GitHub distribution.
It requires macOS 26 or later and supports Apple silicon and Intel Macs.
The intended installation persists across Safari restarts. Updates require a new download; there is no automatic updater.

**Current status:** packaging and signing tooling is under validation. No signed, notarized installer has been released.
The development Mac has no valid code-signing identity. Apple Developer Program membership is unconfirmed.
The existing Safari preview remains temporary. Chrome Store review is separate.

## Build an unsigned candidate

The `Safari Mac app candidate` GitHub workflow uses Xcode 26.6 on `macos-26`.
It needs no signing keys or Apple account secrets.

1. Review the source commit and the workflow changes.
2. Run the workflow with `workflow_dispatch` on that commit in the canonical repository. Pull-request runs validate packaging but cannot be signed by the release script.
3. Check the packager and Xcode build logs.
4. Download the `safari-UNSIGNED-candidate` artifact.
5. Compare the inner ZIP's SHA-256 with the hash printed in the build log.

The workflow uses Apple's packager to generate the app project. It then archives both CPU architectures.
The app's native-message handler completes requests without logging or returning page data. The web extension requests no native messaging permission.
Bundle identifiers are `com.davegoldblatt.cookiecalm.direct` and `com.davegoldblatt.cookiecalm.direct.Extension`.
Both bundle versions must equal the web manifest version. Both deployment targets must be macOS 26.0.

The candidate includes the checked-in entitlement values and file hashes.
The app keeps the packager's sandbox and outgoing-client permissions for its WebKit setup window. The native extension has only the sandbox permission.
Both targets omit the template's unused user-selected-file access. The local signer reads the entitlement files from the reviewed commit and checks candidate metadata against them.
The app is zipped with `ditto` before artifact upload so executable permissions survive the transfer.
**An unsigned CI candidate is not a public installer.**

## Prepare local Apple credentials

Direct distribution requires an active Apple Developer Program membership.
The Account Holder must create a **Developer ID Application** certificate with its private key on the signing Mac.
An Apple Development certificate or Developer ID Installer certificate does not replace it.
Keep private keys on the Mac; do not put them in GitHub, source files, or chat.

List valid signing identities:

```sh
security find-identity -v -p codesigning
```

Save notarization credentials in Keychain using Apple's interactive tool:

```sh
xcrun notarytool store-credentials CookieCalm-notary
```

Enter the requested credentials in the local terminal. Do not add passwords to a shell command or share them in chat.
Record the certificate fingerprint, Team ID, and Keychain profile name. These identify the intended signing account.

## Sign and notarize locally

Check out the exact reviewed commit and install its dependencies with `npm ci --ignore-scripts`.
Use the SHA-256 from the trusted CI build log, not a checksum from an unknown download.
The signer independently checks the canonical repository, successful manual run, workflow path, exact commit, and logged checksum through GitHub's API.
Pull-request artifacts and runs from forks are refused. This trusts the reviewed canonical CI toolchain; it is not an independent native reproducible build or a cryptographic build attestation.

```sh
python3 scripts/release-safari-app.py \
  --candidate /path/to/cookie-calm-1.2.6-safari-UNSIGNED.zip \
  --sha256 CI_ZIP_SHA256 \
  --source-commit REVIEWED_COMMIT_SHA \
  --run-id SUCCESSFUL_MANUAL_RUN_ID \
  --identity DEVELOPER_ID_APPLICATION_SHA1 \
  --team-id APPLE_TEAM_ID \
  --notary-profile CookieCalm-notary \
  --work-dir /private/path/to/cookie-calm-signing-1.2.6
```

The script validates the candidate and compares embedded resources with a fresh build of the reviewed source.
It signs the extension first, then the app, with explicit sandbox entitlements, a secure timestamp, and hardened runtime.
It submits the app ZIP to Apple, checks the log, staples the accepted ticket, and checks Gatekeeper.
It then builds, signs, notarizes, and staples the DMG.

If notarization times out, repeat the command with the same staging directory.
The script retains known submission IDs and immutable submitted artifacts instead of resubmitting them.
If an interruption occurs during upload before an ID is saved, it stops for manual recovery with `notarytool history`; it does not guess or submit again.
DMG stapling operates on a copy, so a crash cannot modify the recorded submission.
If a partial archive or DMG exists without a saved hash, the script stops for manual inspection. It does not overwrite unknown staging files.
Rejected submissions and all reported issues, including warnings, require investigation. Never bypass these checks.

Outputs include the candidate DMG, `MACOS-SHA256SUMS.txt`, notarization logs, and `release-evidence.json`.
The evidence initially records `native_installation_verified: false`. Successful notarization does not establish Safari runtime correctness.
The script does not publish to GitHub.

## Verify the durable installation

Use a controlled Mac account or Safari test profile. Keep the everyday Chrome extension enabled.
Do not quit the user's Safari or change unrelated tabs. Arrange any required restart with the user.

1. Download the DMG through a browser so macOS applies quarantine.
2. Test opening the stapled download offline. Check that Gatekeeper accepts it without bypasses.
3. Drag Cookie Calm to `/Applications` and launch it once.
4. Confirm that Safari lists the app-contained extension and that the host app opens its settings.
5. Disable the temporary preview for this test, and turn off **Allow unsigned extensions**. Avoid two active copies.
6. Enable the signed extension and allow website access in the test profile.
7. Verify cookie rejection, promotional dismissal, scam refusal, protected forms, frames, closed roots, per-site pause, and restoration.
8. Verify again after a user-controlled Safari restart and Mac restart. Record the exact app version and signing identity.

Preview settings do not automatically migrate to the app-contained extension.
Record runtime results separately from WebKit tests, which mock extension APIs.
Publish the verified DMG, checksum, and release notes on GitHub only after these checks pass.

## Research and independent review

Apple documents Developer ID signing and notarization as the route for Safari web extensions distributed outside the Mac App Store.
App Store Connect's web packager serves the Store/TestFlight route; it does not replace Developer ID distribution.
The Xcode command-line packager is available on the GitHub Mac runner, avoiding a full local Xcode installation.

- [Apple: Safari distribution options](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
- [Apple: Xcode packager](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)
- [Apple: notarization requirements](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [Apple: notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow)
- [Apple: Developer ID certificates](https://developer.apple.com/help/account/certificates/create-developer-id-certificates)
- [GitHub: Mac runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
- [Claude plan review](audits/safari-direct-plan-claude.md)
- [Claude implementation review](audits/safari-direct-implementation-claude.md)
- [Claude follow-up review](audits/safari-direct-followup-claude.md)

Accepted audit findings: preserve executable permissions with an outer ZIP; supply entitlements when re-signing; sign inside-out with `--force`; pin Xcode; verify identifiers, versions, and architectures; keep credentials local; distinguish compiled, notarized, and runtime-verified states.

The first native run reproduced a packager mismatch: the host identifier used the app name, while the extension used the requested identifier.
The builder now sets both target identifiers before archiving. The second run compiled the universal app and passed bundle/resource checks, then stopped because the template expresses entitlements through build settings rather than `.entitlements` files.
Checked-in entitlement files now define signing authority explicitly. These failures were packaging observations, not installed-extension behavior failures.

The packager also warns about `match_about_blank` and `match_origin_as_fallback`.
Those warnings do not establish support or failure in installed Safari. Retain them in build evidence and verify inherited-origin frames during native acceptance.
The app's generated settings UI, entitlement behavior, signing, and notarization still require native validation.

# Cookie Calm Safari direct-distribution plan: audit

The plan is structurally sound. Developer ID plus notarization is the documented path, and splitting unsigned CI from local signing is reasonable. The items below are ordered by severity. Items marked **[verify]** need actual build or runtime evidence, not docs.

## Concrete blockers

**1. `upload-artifact` will corrupt the bundle.**
`actions/upload-artifact` does not preserve Unix permissions and does not reliably preserve symlinks. The downloaded `.app` and `.appex` Mach-Os can lose `+x`, and re-signing won't catch every such breakage.
- Before upload, wrap the `.xcarchive` or `.app` into a single `ditto -c -k --sequesterRsrc --keepParent` zip or a tar.
- Upload that one file and record its SHA256 in the CI log.
- Verify the hash locally before signing.

**2. Entitlements disappear when you build with `CODE_SIGNING_ALLOWED=NO`.**
Entitlements are embedded at signing time, not build time. The unsigned archive will carry no entitlements, so a plain `codesign` locally produces a non-sandboxed appex.
- Your local signer must pass `--entitlements` explicitly for both the appex and the app.
- Source them from the generated project's `.entitlements` files, which should be committed or recorded as CI outputs.
- Resolve any `$(...)` build variables in those files yourself; nothing expands them outside Xcode.
- Then assert the result with `codesign -d --entitlements - --xml` on both bundles. Expect `com.apple.security.app-sandbox` = true on the appex, and nothing else unexpected.
- **[verify]** exactly which entitlements the Xcode 26 template generates. Don't assume.

**3. You must re-sign with `--force`, inside-out, without `--deep`.**
On arm64 the linker applies an ad-hoc signature even when signing is disabled, so `--force` is required. Sign the appex first, then the app. Using `--deep` only for verification, as planned, is correct.

**4. The Developer ID Application certificate can only be created by the Account Holder.**
Enrollment alone isn't enough. The person holding the Account Holder role must generate the certificate, and its private key must end up in this Mac's keychain. Your fingerprint and TeamID gate is right. Also check that the certificate is unexpired and has a valid chain; `security find-identity -v -p codesigning` filters out invalid identities.

## Answers to your specific questions

**Provisioning profile or extra entitlements?**
The docs don't establish any requirement beyond the App Sandbox for a Safari web extension that uses no App Groups, no nativeMessaging, and no restricted entitlements. Sandbox is not a restricted entitlement, so Developer ID needs no provisioning profile. The profile question only arises if the template adds App Groups or another team-prefixed or restricted entitlement.
- Sandbox on the appex is required for Safari to load it.
- Sandbox on the host app is template default and harmless; keep it.
- Keep `NSExtensionPrincipalClass` (`SafariWebExtensionHandler`) in the appex Info.plist even though it's inert. The handler should still call `completeRequest` rather than leave requests hanging.

**App Store Connect packager?**
No. That flow (upload a ZIP to App Store Connect, which generates and builds via Xcode Cloud) produces App Store/TestFlight builds. It is not a Developer ID path. `xcrun safari-web-extension-packager` is the right tool.

**CI success vs notarization.**
Agreed. CI proves only that an unsigned archive compiles. Notarization evidence is:
- `notarytool` status `Accepted`
- the `notarytool log` JSON reviewed for warnings, not just errors
- `stapler validate` passing
- `spctl` passing on the stapled artifacts

## Structural issues (not blockers)

- **Bundle ID collision risk.** If a Mac App Store Safari build is ever planned, pick now whether it shares `com.davegoldblatt.cookiecalm`. Two installed copies with the same ID confuse LaunchServices and Safari. Also confirm the "pending Store review" in `5df4fb0` refers to Chrome, not Safari.
- **Deployment target of macOS 26.** This excludes Sequoia and earlier users. That's fine if intentional; say so in the README. **[verify]** that the packager honours it, or set `MACOSX_DEPLOYMENT_TARGET` explicitly in the `xcodebuild` invocation.
- **Version stamping.** **[verify]** that `CFBundleShortVersionString` and `CFBundleVersion` come out as 1.2.6 on both bundles. Don't rely on packager defaults; pass `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` explicitly.
- **Universal build.** Set `ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO` explicitly and gate with `lipo -archs` on both executables.
- **Pin Xcode on the runner.** Use `xcode-select` with an exact path, and log `xcodebuild -version` and the packager version. Runner images rotate their default Xcode.
- **Provenance is weak.** A `contents: read`-only workflow can't produce build attestations, which need `id-token` and `attestations` write. Hash checking (blocker 1) is the minimum. Consider attestations later.
- **No update channel.** Direct distribution has no auto-update, so users must download each new DMG. That's acceptable, but document it. It also affects what "durable" means.
- **DMG details.** Sign the DMG with Developer ID Application, not Installer. The `spctl -a -t open --context context:primary-signature` check is correct. Stapling the app before building the DMG is fine; the DMG ticket also covers the contents.
- **Notarytool resilience.** Use `--wait --timeout`. On timeout, record the submission ID and resume with `notarytool info` and `notarytool log`. Never resubmit blindly.

## Needs actual runtime verification

1. Safari discovers the extension only after the host app has launched once from `/Applications`. Confirm with `pluginkit -mAvvv -p com.apple.Safari.web-extension` and in Safari's Settings → Extensions.
2. Coexistence with the temporary preview. They have different identities, so both may appear and both may act on pages. Disable the preview during acceptance.
3. Also ensure Develop → "Allow unsigned extensions" is off, so the signed build is actually what's being tested.
4. Storage and consent state won't migrate from the preview to the app-contained extension. Test the first-run consent path.
5. Website-permission prompts, the popup, background lifetime, closed shadow roots, promotions and restore behavior. Test these after a Safari restart and again after a reboot; that is your "durable" proof.
6. Gatekeeper with a real quarantined download: fetch the DMG from GitHub in a browser rather than `curl`, which doesn't set quarantine. Then test first launch offline to prove the stapled ticket works.
7. `showPreferencesForExtension` from the sandboxed host app opens the correct pane on Safari 26.x.
8. Signed-build acceptance should use a separate macOS user or a Safari profile you control. Don't quit the user's Safari without arranging a user-controlled restart first.

## Bottom line

Fix the artifact-permissions and explicit-entitlements issues in the pipeline design now. Everything else is refinement. Nothing can be signed, notarized or claimed until the Account Holder issues the Developer ID Application certificate.

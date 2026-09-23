# Audit: Safari Mac direct distribution

The design is sound in outline. You never publish unsigned output, credentials stay local, signing goes inside-out with explicit entitlements, and a single resumable state file anchors the run. The findings below are ordered by severity. Items marked **[unverified]** are hypotheses that I could not confirm without running tools.

## Blockers (must fix before the first signed release)

### B1. Entitlement sourcing will probably fail on real packager output, and it is not a reviewed source
`scripts/build-safari-app.py:60-69`, `scripts/safari_native.py:12,28-32`

- **[unverified, high likelihood]** Xcode's macOS app templates, including the Safari web extension template, usually add `com.apple.security.files.user-selected.read-only` to both targets. `check_entitlements` would then reject them and the CI build would stop.
- **[unverified]** Newer Xcode templates may express the sandbox through build settings (`ENABLE_APP_SANDBOX`, `ENABLE_USER_SELECTED_FILES`) instead of `.entitlements` files. In that case line 68 would exit with "Both app and extension entitlement sources are required."
- The app/extension split at line 64 tests `'Extension' in file.as_posix()` against the absolute path. A checkout path containing "Extension" would classify both files as extension and trigger the "Ambiguous" exit.
- The docs (line 27) call these "reviewed entitlement sources." They are actually generated at build time, and nothing binds them to the targets that used them.

**Fix:** Check in `native/app.entitlements` and `native/extension.entitlements`, containing only `app-sandbox`. Add `network.client` only if a concrete need appears, since the handler and host app need no network. Have `release-safari-app.py` sign with these repo files at the verified commit. Drop the `entitlements` field from `candidate.json`, or keep it as informational only. This removes a CI-controlled input from the signing decision.

### B2. Candidate provenance is self-asserted by the build that produced it
`scripts/release-safari-app.py:64-66,124-128`, `docs/SAFARI-DIRECT-DISTRIBUTION.md:20,56`

- `candidate.json.commit` and the hash printed in the log are both produced by whatever code ran in that workflow run.
- A run from another branch or a fork PR (the `pull_request` trigger at `.github/workflows/safari-macos.yml:4`) can print `commit=<reviewed sha>` while building different native binaries.
- Your local checks only cover web resources, through `check_bundle(..., source)`. The Swift host app and the appex executables are signed with no independent verification.
- The only defence is the operator choosing the correct run.

**Fix:**
1. Produce release candidates only from `workflow_dispatch` on the canonical repo.
2. Before signing, verify the run with `gh run view <id> --json headSha,event,workflowName,headRepository`, and pass `--run-id` to the script so it checks the run itself.
3. Better still, add `actions/attest-build-provenance` (with `id-token: write` and `attestations: write`, on dispatch runs only). Then run `gh attestation verify <zip> --repo davegoldblatt/cookie-calm --signer-workflow .github/workflows/safari-macos.yml` and compare the attested commit.

## Should fix (correctness and resumability)

### S1. The DMG staple step can leave state unrecoverable, and the "immutable" claim is false for the DMG
`release-safari-app.py:175-180`

`stapler staple` rewrites the DMG in place. If the process dies after line 177 but before `save()` at line 180, the next run sees a stapled file whose hash differs from `dmg_sha256`. It then stops permanently at line 174 with "DMG changed outside the signing workflow."

**Fix:** Staple a copy (`dmg.stapling`), record its hash, then `os.replace` it onto the final name. Alternatively, on a hash mismatch, accept the file only if `stapler validate` and `codesign --verify` pass and the notarization record matches. Update the wording at docs line 75.

### S2. The submit and record steps are not atomic
`release-safari-app.py:95-99`

A crash or Ctrl-C between `notarytool submit` returning and `save()` loses the submission ID, and the next run resubmits. This is harmless to Apple but contradicts docs line 75.

**Fix:** Before submitting, save `{'sha256': ..., 'submitting': True}` to state. If that marker exists without an `id`, run `notarytool history` and match the submission by name and time instead of resubmitting.

### S3. `notarytool wait` failure handling assumes timeout is the only failure mode
`release-safari-app.py:103-108` **[unverified]**

If `wait` exits non-zero for `Invalid` or `Rejected`, not just timeouts, the script reports "did not finish, resume." A resume then loops through `info` → `Invalid` → log → raise, which is correct but only after a misleading first message.

**Fix:** In the `except` block, re-run `notarytool info` and branch on its `status`. Only raise the resume message when the status is still `In Progress`.

### S4. The resource comparison is one-directional
`safari_native.py:73-79`

The check confirms every source file appears in the bundle, but not that the bundle has no extra files. `bundle_hashes` only proves CI integrity, not agreement with the source.

**Fix:** Also compare the set of files under `manifests[0].parent` with the set under `source`, excluding `_CodeSignature`. Add a unit test for an injected extra file.

**[unverified]** Xcode's Copy Bundle Resources may flatten subdirectories (groups instead of folder references) or transform some files, such as `.plist` or PNG. Either would make this check fail on real output. That fails safe, but it would block CI.

### S5. The "fresh build" may not match CI's build
`release-safari-app.py:76`

CI runs `npm run build:safari` on Node 22. The release script runs `node scripts/build.mjs --browser=safari` with any local Node.

- **[unverified]** If the npm script passes other flags or environment variables, the two builds diverge.
- **[unverified]** If `build.mjs` does not clean `build/safari` first, stale files cause false mismatches, and the comment at line 75 overstates the guarantee.
- `git status --untracked-files=no` ignores untracked files under `src/` that the build might pick up.

**Fix:** Call the same npm script. Check `node --version` against CI. Use `git status --porcelain` including untracked files, or at least for `src`, `static`, and `vendor`.

### S6. Signature validation: real Developer ID output passes, but the checks are weak
`release-safari-app.py:40-48`

Real `codesign -d --verbose=4` output (on stderr) contains:
- `CodeDirectory … flags=0x10000(runtime)`
- `Authority=Developer ID Application: Name (TEAMID)`
- `Timestamp=…` (only present with a secure timestamp; otherwise it shows `Signed Time=`)
- `TeamIdentifier=TEAMID\n` (not the last line)

All four substring checks pass on genuine output, and `--entitlements - --xml` emits clean plist XML on stdout. The weaknesses are:

- `'runtime' in info` would match any path or identifier containing "runtime."
- The script never checks that the leaf certificate is the `--identity` fingerprint, or that the chain ends in Apple's Developer ID anchor. It relies on text matching.
- The bundle `Identifier=` is not checked.

**Fix:** Replace the text checks with a designated-requirement test:
```
codesign --verify --strict -R='anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = "TEAM" and identifier "<bundle id>"' <bundle>
```
Parse the flags with `re.search(r'flags=0x[0-9a-f]+\([^)]*\bruntime\b', info)`.

Also add a unit test that feeds a captured real `codesign -d` transcript to a mocked `subprocess.run`. Currently no test covers this parser or the notarization state machine.

### S7. Tool availability on a machine with only the Command Line Tools
`release-safari-app.py:96-183` **[unverified]**

`notarytool` ships with the CLT. I am not certain `stapler` does. If it is missing, the script fails *after* app notarization. Resume handles that, but it is avoidable.

**Fix:** Preflight with `xcrun --find notarytool` and `xcrun --find stapler` next to the identity check at line 67.

## Optional improvements

- **O1.** `release-safari-app.py:78`: `mkdir(mode=0o700, exist_ok=True)` does not tighten a directory that already exists. Check `st_mode & 0o077 == 0` and the owner.
- **O2.** `release-safari-app.py:64,119`: the candidate is hashed and validated, then re-read by `ditto` later (a TOCTOU gap). Copy it into `work` first and use only the copy.
- **O3.** `release-safari-app.py:112`: any `issues` entry blocks release, including `severity: warning`. Keep this strict if you like, but document it. Otherwise block only on `error`.
- **O4.** `release-safari-app.py:195`: `KeyError` and `json.JSONDecodeError` (for example, a missing `CFBundleExecutable` at `safari_native.py:49`, or malformed `candidate.json`) escape as raw tracebacks. Validate the keys or add them to the caught exceptions.
- **O5.** `safari_native.py:12`: `network.client` is allowed but unused. Removing it shrinks the reviewed surface. This becomes moot under B1.
- **O6.** Evidence at `release-safari-app.py:184-186` omits the app's cdhash, notary profile, Xcode version from metadata, and the CI run ID. Add them so the runtime-verification step can confirm it tested the exact binary.
- **O7.** Notarizing both the app ZIP and the DMG is redundant, since notarizing the DMG also covers the nested app. The current order does let the app be stapled before DMG creation, so keep it if you want a stapled app inside the DMG.
- **O8.** `build-safari-app.py:26`: move `import subprocess` up with the other imports.

## Claims in the docs to correct

- **Line 27**, "reviewed entitlement sources": they are generated, not reviewed (see B1).
- **Line 69**, "compares embedded resources with a fresh build": the comparison is one-directional and may not be the same build (S4, S5).
- **Line 75**, "immutable submitted artifact": the DMG is mutated by stapling, and a crash can force a resubmission (S1, S2).
- **Lines 20 and 56**: the build log hash identifies the artifact, not the commit it was built from (B2).

## Checks I did not confirm

These need CI or Apple's documentation to confirm:
- `Xcode_26.6.app` exists at that path on `macos-26` (workflow line 22).
- The pinned action SHAs are the intended releases.
- The packager's flag set, in particular `--macos-only` together with `--copy-resources`.

The CI run will settle most of these, along with B1 and S4.

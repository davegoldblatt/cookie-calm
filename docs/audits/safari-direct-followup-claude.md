# Follow-up review: Safari Developer ID pipeline (as of afa0fa2)

**Verdict: I found no remaining code-level release blockers in the supplied files.** The earlier findings B1–B2 and S1–S7 look correctly addressed, and I found no regressions. Everything below is either a should-fix that fails closed or a check that can only be done on a real platform.

## Should-fix (non-blocking; each fails closed)

1. **The notary profile is not checked before signing** (`release-safari-app.py:124-125`, `:75-80`).
   - A mistyped or missing `--notary-profile` is only discovered when `notarytool submit` runs.
   - By then the app has been signed with a timestamp, `signed_zip_sha256` is saved, and `submitting=True` is saved.
   - The next run then refuses with "submission may already exist", even though nothing was sent.
   - There is also no supported way to enter a recovered submission ID. The operator has to hand-edit `state.json`.
   - Suggested fix: run a read-only check before signing, for example `xcrun notarytool history --keychain-profile <p> --output-format json`. Optionally, add a `--recovered-<phase>-id` flag that validates the ID with `notarytool info` before it writes state.

2. **A half-finished artifact blocks the next run** (`:181-183`, `:206-210`).
   - If `codesign` on the DMG fails (for example, the timestamp server is unreachable) or the run stops after `ditto`/`hdiutil` but before `save()`, the file stays in the work directory.
   - The next run then stops with "Untracked … exists", and the operator must delete it by hand.
   - Suggested fix: build and sign in `scratch`, hash the result, save the state, then move it into `work`.

3. **The DMG signature is not tied to the requested identity** (`:219`).
   - `codesign --verify --strict` has no `--test-requirement`.
   - The risk is low because the script signed the file itself and the hash is pinned in state.
   - Reusing the anchor, leaf, and OU requirement (without `identifier`) would make this consistent with the app check.

4. **Test gaps** in `check_ci_run`: no negative tests for a checksum missing from the log, a wrong `path`, or a wrong `repository`. These are small to add.

## Platform checks still needed (none have been done yet)

**Can be done now, without credentials:**
- Run `check_ci_run` against a real `workflow_dispatch` run of `safari-macos.yml` at the candidate commit. If the afa0fa2 build was a PR run, dispatch one first. This confirms:
  - the real API values for `path`, `event`, and `head_repository`;
  - that `gh run view --log` actually contains the ZIP hash.

**Need a signing identity:**
- The output formats the script parses on real signed bundles:
  - `codesign -d --entitlements - --xml` (must parse and match the source plists exactly, with nothing injected);
  - the `codesign -dvvvv` lines the regexes rely on (`flags=…(runtime)`, `Timestamp=`, `TeamIdentifier=`).
- The designated-requirement test (`certificate leaf = H"…"`) passes against the real Developer ID leaf certificate.
- The candidate's restored xattrs (from `ditto -x -k`) do not trip `codesign --strict`.

**Need notarization credentials:**
- The `notarytool` JSON fields (`id`, `status`, log `issues`).
- How `wait` exits on timeout.
- Stapling the app, then the DMG.
- `spctl` assessment of both.

**Native runtime (the release gate):**
- Download the DMG so it is quarantined, pass Gatekeeper on first launch from `/Applications`, and confirm the sandboxed host app with `network.client` works.
- The extension appears in Safari 26, can be enabled, and website access can be granted.
- The resources in Safari match the web build.
- The x86_64 slice only runs on Intel hardware. On Apple silicon, the extension runs arm64, so Rosetta does not exercise it.
- Install alongside the pending App Store build (`com.davegoldblatt.cookiecalm` vs `.direct`) and check how Safari presents two Cookie Calm extensions.

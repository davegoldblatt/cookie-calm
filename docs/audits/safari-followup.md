## Verdict

No blockers in what you sent. The capability guard is correctly fail-closed and inert on Chrome, the harness's self-description matches what it actually exercises, and packaging isolation holds. Four concrete issues, ranked, plus what I couldn't verify.

## Capability guard — correct, with one weakness

`src/content.js:configure()` gates on `browser_specific_settings?.safari`, which the packaging test proves is absent from the Chrome manifest (`assert.equal(manifest.minimum_chrome_version, undefined)` / `delete manifest.browser_specific_settings` round-trip). So Chrome never evaluates the second clause. Fail-closed ordering is right: `enabled = false` → `promotions.restore()` → blocked status, and it returns before `interval`/`fallbacks` are armed, so nothing is scheduled afterward. `receipts` and `schedule()` are both gated on `enabled`, and the pre-bootstrap window is already `enabled = false`. The blocked reason reaches the popup through the existing `status === 'blocked'` branch.

**Issue 1 (highest value): it is a feature check, not a behavior check.** `typeof chrome.dom?.openOrClosedShadowRoot !== 'function'` passes if Safari ships the symbol but returns `null` for closed roots — exactly the failure mode you cannot rule out until native install. You'd then run open-roots-only silently, with no blocked status and no signal in diagnostics. A one-time behavioral probe at configure time is cheap and strictly stronger: attach a closed root to a detached element, call the API, require it returns that root. Given the native path is still pending, I'd make this change before native testing rather than after.

Secondary: the reason string attributes the failure to Safari version, but `strict_min_version: 26.0` means an installed build is already ≥26, so in practice this string will only ever appear for a cause it misnames. Reword to describe the capability, not the version.

## Tests — honest, one racy assertion

The scoping comments in `playwright.safari.config.js` and the init script are accurate: the bridge echoes `{...request.local}` for `guard`, so background guard logic, CSS origin, service worker, permissions and the privileged closed-root API are all unexercised, and `openOrClosedShadowRoot: element => element.shadowRoot` is open-roots-only by construction. `background.js` gets `node --check` syntax validation only — never executed in JSC. All of that is stated rather than implied.

The negative test does show blocked + no click, with the exact reason string and both prompts still visible.

**Issue 2: the negative test doesn't settle.** It returns as soon as the blocked message appears, then asserts `choices` is empty. The positive-negative tests elsewhere (`waitForTimeout(2200)`) correctly wait out the delayed passes; this one doesn't, so it would not catch a regression where something acts on a later mutation-driven or fallback tick. Add the same ~2.2s settle before the `choices` and visibility assertions.

**Issue 3: nothing locks the Chrome popup string.** `safari.spec` asserts the Safari hint, but no test asserts the non-Safari branch still reads "Open a website to use Cookie Calm." One assertion in the existing Chrome popup test would make the browser-neutrality claim enforced rather than reviewed. Minor: with no host permission and a site open, Safari shows "outside our reach" in `#hostname` alongside the allow-access hint — mildly contradictory, polish only.

## Packaging — isolation good, completeness gap

`package-safari.py` is correctly scoped: asserts version pinning both directions, writes only `SAFARI-SHA256SUMS.txt`, and the sentinel test proves Chrome's `SHA256SUMS.txt` survives. Determinism inputs are all there (sorted walk, fixed timestamp, `create_system = 3`, fixed `external_attr`), and the test's double-run byte comparison validates same-toolchain reproducibility — which is the only claim made. Dotfile filtering is enforced at every path component and verified via the `.DS_Store` fixture and the set-equality check against the tree. No Apple publication is claimed anywhere; the docstring and trailing print both say so.

**Issue 4: nothing asserts `build/safari` is complete.** The test does a full listing comparison on `extension/` (proving Chrome is untouched) and byte-compares five named shared files, but there is no assertion that `build/safari` contains everything Chrome ships. The zip check only proves zip == tree. A build regression that drops icons or `_locales` produces a valid, reproducible, correctly-named zip and the suite stays green. Compare the two listings modulo `{manifest.json, *.js}` — that's the assertion the "complete Chrome listing comparison" framing implies but doesn't currently make.

Two smaller ones: the guardrails are bare `assert`, so `python3 -O` strips the version-drift and integrity checks silently — use explicit `raise` in a script whose job is guardrails. And there's no freshness check on `build/safari`, so a stale tree from a prior version packages silently; either stat against the source or have CI always build immediately before packaging.

## Not verified

`static/about.html`, `docs/privacy.html`, `src/background.js`, `scripts/build.mjs` and `.github/workflows/safari-preview.yml` weren't in scope of what you sent, so the browser-neutral about/privacy copy and the CI wiring (including the `python3` dependency on the runner) are unreviewed — I'm not inferring them from the test assertions. Native API conformance stays on the acceptance checklist as agreed; Issue 1 is the one item I'd move ahead of the native run rather than alongside it.

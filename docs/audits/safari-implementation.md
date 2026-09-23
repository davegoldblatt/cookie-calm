## Verdict

The isolation story holds. The packaging, manifest-preservation, and ZIP logic do what the docs claim, and the docs are unusually honest about what is unproven. The real gaps are in the **test oracle**, not the build: the WebKit suite is structurally incapable of failing on the two things the Safari 26 floor exists to protect, and one of those is testable today without native Safari.

I'm not asking for an engine rewrite or speculative Safari API shims. Everything below is either an assertion, a filter, or a one-line hardening.

---

## Verified correct

- `build.mjs` validates `options` **before** `rm(out)`, and rejects both unknown values and extra args. The docs' claim on this is accurate.
- Output paths are genuinely disjoint: `extension/` vs `build/safari/`. The Chrome-preservation test would catch a regression that redirected the Safari build into `extension/`.
- The manifest deep-equality check (after deleting exactly the two intended keys) is the right shape — it covers permissions, CSP, `web_accessible_resources`, content-script matches, and worker registration in one assertion, rather than enumerating a list that drifts.
- `package-safari.py` writes only `dist/cookie-calm-*-safari-preview.zip` and `dist/SAFARI-SHA256SUMS.txt`; the sentinel test on `dist/SHA256SUMS.txt` is a legitimate guard.
- ZIP is verified structurally (`testzip()`, `manifest.json` at root, full content equality against the build tree) rather than by filename inspection.
- CI actions are SHA-pinned with `permissions: contents: read`, and `--ignore-scripts` is correctly paired with an explicit `playwright install`.
- The background.js string change is browser-neutral and doesn't fork the bundle.

---

## Findings

### 1. The Safari 26 floor is a declaration, not an enforcement boundary — and the fallback is unasserted (high)

`browser_specific_settings.safari.strict_min_version` is metadata. Once the resources are wrapped in an Apple app, what actually gates installation is the app's deployment target, not the manifest key. So the argument in `docs/SAFARI.md` — "retaining 26 preserves a safety capability" — currently rests on a declaration nothing enforces at runtime.

The decisive question is: **when `chrome.dom.openOrClosedShadowRoot` is absent, do the guards fail closed or fail open?**

`safari-tests/engine.spec.js` deliberately installs no fake `chrome.dom`. That means all five tests already run in the degraded state — and they pass with `expect(errors).toEqual([])`. That tells you the code doesn't throw. It tells you nothing about whether a guard that cannot inspect a closed root refuses to act or proceeds anyway.

This is testable right now in WebKit:

```js
test('Missing dom.openOrClosedShadowRoot refuses guarded action rather than proceeding', ...)
```

Assert the specific refusal, not just the absence of a page error. Pair it with an explicit capability check at startup if one isn't already present in `src/content.js` (not supplied — see "Not verifiable" below). That converts the strict_min_version claim from advisory to defended, and it costs one test.

### 2. The WebKit suite's bridge makes two assertions tautological (high)

In `load()`:

```js
if(request.type==='guard')return {...request.local};
if(request.type==='presentation-css')return {ok:false};
outcomes.push(request);return {ok:true};
```

Three problems:

- **`guard` echoes the content script's own local decision.** No background-side guard logic is exercised. "Refusal to accept by default" passes because the content script decided so and the stub agreed. The native checklist does list "real guard messages," so this is acknowledged — but `docs/SAFARI.md` should say the WebKit tests validate the *scanner and WebKit DOM behavior*, not the safety architecture. As written, "refusal to accept by default" reads as a validated safety property.
- **Every test runs the `presentation-css` failure path.** `{ok:false}` is returned unconditionally, so the production success path is never executed in WebKit at all. Add at least one test with `{ok:true}`, and one asserting the *failure* path actually withholds the cosmetic success the docs say it withholds.
- **`outcomes` is populated and never read.** Dead signal. Either assert what the content script reports to the background (the one piece of message-shape validation available here) or delete it.

### 3. ZIP reproducibility is under-specified and over-claimed (medium)

`package-safari.py` fixes the timestamp and `external_attr`, but not:

- **`compresslevel`** — `ZIP_DEFLATED` uses zlib's default, which is not contractually stable across zlib builds. CI runs on ubuntu-latest; you build on macOS. Byte-identical output across those two is not guaranteed.
- **`create_system`** — `ZipInfo` sets it from `sys.platform` at construction. POSIX-only in practice here, but set it explicitly (`info.create_system = 3`) for a one-line guarantee.

The test only proves same-machine, same-run stability (it re-zips an unchanged tree). It does not demonstrate reproducibility in the sense the docs imply. Either set both fields explicitly and keep the claim, or downgrade the wording in `docs/SAFARI.md` to "stable for a given build tree."

### 4. Stray macOS files flow into the archive unfiltered (medium)

`build.mjs` does `cp(static → out, {recursive:true})` with no filter, and `package-safari.py` zips `source.rglob('*')` with no exclusion. A `.DS_Store` inside `static/` — gitignored, so invisible in review, but routinely created by Finder on this exact platform — lands in `build/safari/` and then inside the ZIP you hand to Apple's packager. It also silently breaks any cross-machine reproducibility claim.

Add a filter at the zip step (and ideally a `filter` on the `cp`). The existing content-equality test won't catch this, because it asserts ZIP == build tree, and the stray file is in both.

### 5. Safari and Chrome artifacts share `dist/` (medium)

The filenames are distinct and the sentinel test protects `SHA256SUMS.txt`, so today this is safe. But `docs/LEARNINGS.md` now states the rule as "Keep each browser's output and release checksums separate," and the implementation keeps them in one directory. Any release step using a `dist/*` glob would publish an unsigned, unvalidated preview ZIP as a release asset. I can't see the release workflow, so I can't tell you whether that glob exists — check it, or move to `dist/safari/`.

### 6. Nothing checks the shipped text for Chrome-specific language (medium)

`background.js` was correctly de-Chrome'd. But `PRIVACY.txt`, `NOTICE.txt`, `popup.html`, and any popup strings are copied verbatim into `build/safari/` and shipped inside the Safari ZIP — and the package test asserts they are **byte-identical to the Chrome build**, which locks in whatever Chrome-specific wording they contain. If `PRIVACY.txt` says "Chrome extension," that text is now a shipped Safari artifact and an App Store review surface.

Grep the shipped set for `chrome://` and user-facing "Chrome". This is a content review, not a code change, but it should happen before any Apple submission.

### 7. Lower severity

- **Chrome preservation doesn't detect additions.** The test iterates the pre-Safari snapshot and checks each entry survives. A Safari build that *added* a file to `extension/` would pass. Compare directory listings both ways.
- **Stale-build risk.** `package-safari.py` reads `build/safari` unconditionally. `npm run package:safari` chains the build, but invoking the script directly silently archives a stale tree. Worth a freshness assertion if the ZIP is ever produced by hand.
- **Hardcoded version in docs.** `docs/SAFARI.md` names `cookie-calm-1.2.5-safari-preview.zip`; the script derives it from the manifest. This will drift at 1.2.6.
- **`waitForTimeout(2200)`** backs two negative assertions ("banner stays visible"). Inherently weak and slow; acceptable for a negative, but it sets your suite floor at ~4.4s of pure sleep.
- **Bundle path is CWD-relative.** `readFile('build/safari/content.js')` at module top level — fine under the npm script, fragile if anyone runs Playwright from elsewhere. Resolve from `import.meta.url` like the package test does.
- **CI**: `on: [push, pull_request]` double-runs same-repo PRs; no artifact upload, so the job builds a preview ZIP and discards it; `python3` comes from the runner image unpinned.

---

## Not verifiable from the supplied source

These are gaps in what I was given, not defects:

- `src/content.js`, `src/popup.js`, and the guard/discovery/prompt code that consumes `chrome.dom.openOrClosedShadowRoot`. Finding #1 is the direct consequence — I can see the API is unmocked in tests, but not what the code does when it's missing.
- `static/manifest.json`. The deep-equality test makes the *preservation* argument sound regardless of contents, but I can't confirm the Safari-relevant keys (worker registration, CSP, `web_accessible_resources`) are themselves Safari-appropriate.
- `playwright.config.js` (Chrome). **Confirm its `testDir` excludes `safari-tests/`** — if it defaults to the repo root, `npm test` will run the Safari specs in Chromium against `build/safari`. Given the ENOENT you just fixed came from config overlap, this is worth an explicit check.
- The release workflow, for finding #5.

---

## Recommended order

1. Add the missing-`chrome.dom` fail-closed test and, if absent, a startup capability check (#1).
2. Add a `presentation-css: {ok:true}` test and assert `outcomes`; reword the WebKit coverage claim in `docs/SAFARI.md` to exclude guard logic (#2).
3. Pin `compresslevel` and `create_system`; filter dotfiles from the archive (#3, #4).
4. Grep shipped text for Chrome-specific wording (#6).
5. Decide on `dist/safari/` vs. auditing the release glob (#5).

None of these block the preview from being called a preview. #1 and #6 should block anything submitted to Apple.

One editorial note on `docs/SAFARI.md`: the "Independent review" section argues with the prior reviewer rather than recording decisions. The substance is right, but "Claims about rejected badge calls, ignored frame IDs or incorrect CSS origin were hypotheses, not reproduced failures" will age poorly as a permanent document. Consider reducing it to the retained decisions and their rationale.

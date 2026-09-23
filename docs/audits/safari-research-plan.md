## Blockers

**1. The App Store Connect "web packager" claim is the one I'd verify before anything else.** I am fairly confident no such thing exists: Safari web extension distribution requires an Xcode-built container app (`.app` / `.ipa`) submitted via Xcode Organizer or Transporter, and `xcrun safari-web-extension-converter` ships with **full Xcode, not CLT**. If that's right, your research has two mutually reinforcing errors and the entire "ship to Mac first" path is gated on installing Xcode + a paid Developer membership — not on a ZIP upload. Treat this as the top open question; everything downstream of packaging is unplanned until it's resolved.

**2. Safari's per-site permission model is absent from the plan, and the code fails silently under it.** Safari does not grant host permissions declaratively; users must grant per-site access from the toolbar. Until granted: content scripts don't inject, and `sender.tab.url` / `tab.url` are empty. Trace that through your code:

- `hostname(undefined)` → `''` → `isEnabled(settings, '')` → `false` → every message branch returns `{ok:false}` with no diagnosis.
- `popup.js` renders `"This page is outside our reach"` and disables `#pause`.

To a user this is indistinguishable from "the extension is broken." This is a required feature, not a polish item: detect the ungranted state (empty `tab.url` with an `http(s)` tab, or `chrome.permissions.contains`) and render distinct copy pointing at Safari's toolbar menu. None of your proposed tests can catch this.

## Corrections

**3. `strict_min_version: 26.0` is unjustified — 18.4 is the real floor.** The only 26-gated API is `chrome.dom.openOrClosedShadowRoot`, used solely in `privacy-notices.js`, and the first line of `pmcNotice` already fails closed when it's missing:

```js
if (!chrome.dom?.openOrClosedShadowRoot || chrome.dom.openOrClosedShadowRoot(container)) return false;
```

18.4 is what you genuinely need (`sender.documentId` + `insertCSS` `documentIds`, `match_origin_as_fallback`). Dropping to 18.4 buys three Safari releases at the cost of one optional adapter self-disabling. One caveat that makes the guard load-bearing: later in the same function, `node.shadowRoot || chrome.dom?.openOrClosedShadowRoot?.(node)` evaluates to `undefined` when the API is absent, so a *closed* child shadow root would go undetected. That's only safe because the early return kills the adapter first. Add a test pinning that ordering before you lower the floor.

**4. `setBadgeBackgroundColor` is unawaited-unsafe.** In the `prompt-outcome` branch it's `await`ed with no `.catch()`. Docs say the API "has no effect" in Safari — no-op vs. rejection is unverified. If it rejects, the whole handler rejects and the content script gets `"The extension could not load. Reload it in chrome://extensions."` for a purely cosmetic failure. Wrap both `setBadgeText`/`setBadgeBackgroundColor` call sites in the status branches with `.catch(() => {})`, as the `onUpdated` path already does. Also verify Safari renders `'✓'`, `'·'`, `'!'` badge text at all — Safari's badge is numerically biased.

**5. `origin: 'USER'` insertCSS needs verification before the recovery path ships.** If Safari ignores user-origin precedence and falls back to author origin, `runPrompt` still returns `result('hidden')` and the popup tells the user the prompt was hidden when the page can trivially override it. That's a false claim to the user, not a degraded feature. Gate the `adapter.recovery()` branch off on Safari until precedence is observed on a real page.

**6. `{frameId: 0}` on `sendMessage` is a security-relevant dependency.** The `guard` branch asks the top frame to `assess-page` and trusts the reply. If Safari ignores the `frameId` option, a subframe could answer in place of the top document. Cheap fix regardless of browser: have the responder assert `window.top === window` in its reply and have the background reject replies lacking that assertion.

**7. Pre-existing bug, worse on Safari:** `const rules = fetch(...)` at module scope caches a *permanently rejected* promise if the fetch fails. Safari terminates and restarts service workers more aggressively, so you'll hit this. Make it a lazy loader that retries on failure.

**8. Browser-neutral copy — two concrete strings:** `background.js` `"Reload it in chrome://extensions."` and `popup.js` `"reload the extension"`.

## Build / test

**Yes — minimal shared build, no polyfill.** Safari's `chrome` namespace + promises make `webextension-polyfill` pure overhead. But your plan's `target: 'safari26'` vs `chrome120` will emit *different bytes*, so you cannot claim engine parity or share a checksum. Use one target (`es2022`) for both outputs; then the only diff is `manifest.json` and the Safari build is trivially auditable.

`build.mjs` does `rm(out, {recursive:true, force:true})` on a path derived from the flag. Validate `--browser` against a literal allowlist and **exit non-zero on anything unrecognized** — don't let a typo fall through to deleting `extension/`.

Your framing that Playwright WebKit ≠ Safari WebExtension APIs is correct; go further and state that Playwright's WebKit is a different build from shipping Safari, so a pass there is weak evidence. One thing it *can* usefully cover: WebKit's serialization of `getComputedStyle(node, '::before').content`. Your allowlist `['none','normal','""',"''"]` may not match WebKit's output, which would silently disable the PMC adapter (fail-safe, but a real feature loss).

Unverifiable until native install — say so explicitly in the docs: per-site permission grant flow, badge rendering, service-worker lifetime, `USER` origin precedence, `frameId` targeting, whether `storage.session` `onChanged` fires in the popup (if it doesn't, the popup won't live-update).

## Uncertain, flagged as such

`chrome.dom` availability in Safari 26, `sender.origin` population, `frameId` option support, `storage.session` change events in popups, and Develop ▸ "Add Temporary Extension" in 26.6.2 — I'd call the temporary-extension UI likely present, the rest genuinely unknown. The App Store Connect packager I'd call likely false.

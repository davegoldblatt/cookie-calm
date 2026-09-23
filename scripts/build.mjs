import { build } from 'esbuild';
import { readFile, writeFile, cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const options = process.argv.slice(2);
if (options.length > 1 || (options.length && !['--browser=chrome', '--browser=safari'].includes(options[0]))) {
  throw new Error('Usage: node scripts/build.mjs [--browser=chrome|--browser=safari]');
}
const browser = options[0] === '--browser=safari' ? 'safari' : 'chrome';
const vendor = path.join(root, 'vendor/consent-o-matic');
const out = path.join(root, browser === 'safari' ? 'build/safari' : 'extension');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'static'), out, { recursive: true });
if (browser === 'safari') {
  const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
  delete manifest.minimum_chrome_version;
  // Safari 26 adds closed-shadow-root inspection used by our safety checks.
  manifest.browser_specific_settings = { safari: { strict_min_version: '26.0' } };
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
const list = JSON.parse(await readFile(path.join(vendor, 'rules-list.json'), 'utf8'));
const rules = {};
for (const reference of [...new Set(list.references)]) {
  const filename = path.basename(new URL(reference).pathname);
  const content = JSON.parse(await readFile(path.join(vendor, 'rules', filename), 'utf8'));
  delete content.$schema;
  Object.assign(rules, content);
}
await writeFile(path.join(out, 'rules.json'), JSON.stringify(rules));
await cp(path.join(vendor, 'LICENSE'), path.join(out, 'CONSENT-O-MATIC-LICENSE.txt'));
await cp(path.join(vendor, 'UPSTREAM.json'), path.join(out, 'UPSTREAM.json'));
await cp(path.join(root, 'LICENSE'), path.join(out, 'LICENSE.txt'));
await cp(path.join(root, 'NOTICE.md'), path.join(out, 'NOTICE.txt'));
await cp(path.join(root, 'PRIVACY.md'), path.join(out, 'PRIVACY.txt'));
await build({
  entryPoints: ['content', 'background', 'popup'].map(name => path.join(root, `src/${name}.js`)),
  bundle: true, outdir: out, format: 'iife', target: browser === 'safari' ? 'safari26' : 'chrome120', minify: false,
  legalComments: 'inline', banner: { js: '/* Cookie Calm. Includes MIT-licensed Consent-O-Matic modules. See CONSENT-O-MATIC-LICENSE.txt. */' }
});
await writeFile(path.join(out, 'coverage.json'), JSON.stringify({ ruleFiles: new Set(list.references).size, ruleDefinitions: Object.keys(rules).length }));
console.log(`Built Cookie Calm for ${browser} with ${Object.keys(rules).length} bundled rule definitions from ${new Set(list.references).size} files in ${path.relative(root, out)}.`);

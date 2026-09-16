import { build } from 'esbuild';
import { readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const vendor = path.join(root, 'vendor/consent-o-matic');
const out = path.join(root, 'extension');
await mkdir(out, { recursive: true });
await cp(path.join(root, 'static'), out, { recursive: true });
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
await cp(path.join(root, 'PRIVACY.md'), path.join(out, 'PRIVACY.txt'));
await build({
  entryPoints: ['content', 'background', 'popup'].map(name => path.join(root, `src/${name}.js`)),
  bundle: true, outdir: out, format: 'iife', target: 'chrome120', minify: false,
  legalComments: 'inline', banner: { js: '/* Cookie Calm. Includes MIT-licensed Consent-O-Matic modules. See CONSENT-O-MATIC-LICENSE.txt. */' }
});
await writeFile(path.join(out, 'coverage.json'), JSON.stringify({ ruleFiles: new Set(list.references).size, ruleDefinitions: Object.keys(rules).length }));
console.log(`Built Cookie Calm with ${Object.keys(rules).length} bundled rule definitions from ${new Set(list.references).size} files.`);

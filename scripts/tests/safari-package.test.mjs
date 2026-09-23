import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdtemp, readFile, readdir, rm, symlink, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
test('Safari build preserves Chrome, guards and offline resources; ZIP is complete and reproducible', async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'cookie-calm-package-'));
  try {
    for (const name of ['static','scripts','src','vendor','LICENSE','NOTICE.md','PRIVACY.md','package.json']) {
      await cp(path.join(root, name), path.join(workspace, name), {recursive:true});
    }
    await symlink(path.join(root,'node_modules'),path.join(workspace,'node_modules'),'dir');
    const run = (...args) => execFileSync(process.execPath, args, {cwd:workspace,stdio:'pipe'});
    run('scripts/build.mjs');
    const chrome = new Map();
    const chromeListing = await readdir(path.join(workspace,'extension'),{recursive:true});
    for (const name of chromeListing) {
      try { chrome.set(name,await readFile(path.join(workspace,'extension',name))); } catch (error) {if(error.code!=='EISDIR')throw error;}
    }
    run('scripts/build.mjs','--browser=safari');
    assert.deepEqual(await readdir(path.join(workspace,'extension'),{recursive:true}),chromeListing);
    assert.deepEqual(await readdir(path.join(workspace,'build/safari'),{recursive:true}),chromeListing,'Safari must include every Chrome resource');
    for (const [name,bytes] of chrome) assert.deepEqual(await readFile(path.join(workspace,'extension',name)),bytes);
    const manifest = JSON.parse(await readFile(path.join(workspace,'build/safari/manifest.json')));
    assert.equal(manifest.browser_specific_settings.safari.strict_min_version,'26.0');
    assert.equal(manifest.minimum_chrome_version,undefined);
    delete manifest.browser_specific_settings;
    const original = JSON.parse(chrome.get('manifest.json'));
    delete original.minimum_chrome_version;
    assert.deepEqual(manifest,original,'No permission, injection or CSP drift between targets');
    for (const name of ['rules.json','coverage.json','popup.html','CONSENT-O-MATIC-LICENSE.txt','PRIVACY.txt']) {
      assert.deepEqual(await readFile(path.join(workspace,'build/safari',name)),chrome.get(name));
    }
    for (const name of ['content','background','popup']) run('--check',`build/safari/${name}.js`);
    const packageSafari = () => execFileSync('python3',['scripts/package-safari.py'],{cwd:workspace,stdio:'pipe'});
    await writeFile(path.join(workspace,'build/safari/.DS_Store'),'Finder metadata must not ship');
    packageSafari();
    const zip = path.join(workspace,`dist/cookie-calm-${manifest.version}-safari-preview.zip`);
    const first = await readFile(zip);
    await writeFile(path.join(workspace,'dist/SHA256SUMS.txt'),'Chrome checksum sentinel\n');
    packageSafari();
    assert.deepEqual(await readFile(zip),first);
    assert.equal(await readFile(path.join(workspace,'dist/SHA256SUMS.txt'),'utf8'),'Chrome checksum sentinel\n');
    execFileSync('python3',['-c',`from pathlib import Path
from zipfile import ZipFile
import sys
root=Path(sys.argv[1])
with ZipFile(sys.argv[2]) as z:
 assert z.testzip() is None
 expected={p.relative_to(root).as_posix():p.read_bytes() for p in root.rglob('*') if p.is_file() and not any(part.startswith('.') for part in p.relative_to(root).parts)}
 assert {n:z.read(n) for n in z.namelist()}==expected
 assert 'manifest.json' in expected`,path.join(workspace,'build/safari'),zip]);
    assert.throws(()=>run('scripts/build.mjs','--browser=unknown'));
    assert.deepEqual(await readFile(path.join(workspace,'extension/manifest.json')),chrome.get('manifest.json'));
  } finally { await rm(workspace,{recursive:true,force:true}); }
});

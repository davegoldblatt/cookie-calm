import { readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const policy = (await readFile(path.join(root, 'PRIVACY.md'), 'utf8')).trim().split(/\n\n+/).map(block => {
  const heading = block.match(/^(#{1,2}) (.*)$/);
  return heading ? `<h${heading[1].length}>${escape(heading[2])}</h${heading[1].length}>` : `<p>${escape(block).replaceAll('\n', ' ')}</p>`;
}).join('\n');
await mkdir(path.join(root, 'docs/assets'), { recursive: true });
await cp(path.join(root, 'static/icons/128.png'), path.join(root, 'docs/assets/icon.png'));
await cp(path.join(root, 'store/assets/screenshot-1.png'), path.join(root, 'docs/assets/screenshot.png'));
await writeFile(path.join(root, 'docs/.nojekyll'), '');
await writeFile(path.join(root, 'docs/privacy.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cookie Calm privacy policy</title><link rel="icon" href="assets/icon.png"><link rel="stylesheet" href="style.css"></head><body><header><a class="brand" href="./"><img src="assets/icon.png" alt="">Cookie Calm</a><nav><a href="https://github.com/davegoldblatt/cookie-calm">Source</a></nav></header><main class="policy">${policy}</main><footer><a href="./">Cookie Calm</a> · <a href="mailto:dave@davegoldblatt.com">dave@davegoldblatt.com</a></footer></body></html>\n`);
console.log('Generated the public privacy policy and copied website assets.');

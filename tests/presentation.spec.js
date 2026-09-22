import {test,expect} from './fixtures.js';
const host='https://presentation.example/article';
const panel=`<div id="surface" style="position:fixed;inset:0;background:#0009;z-index:1000">
  <div style="margin:30px;padding:30px;background:white"><h2>Disable your adblocker</h2>
  <p>Please support our journalism by allowing ads.</p><a id="decline" onclick="document.querySelectorAll('.missing-close').forEach(el=>el.click())">Continue without support</a>
  <button type="button">Allow ads</button><button type="button">Sign in</button></div></div>`;
async function visit(page,script='',extra='',surface=panel,url=host) {
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html style="overflow:hidden!important"><head><style>body{margin:0}main{min-height:4000px}[hidden]{display:none!important}</style></head><body style="overflow:hidden!important">
  <main><article><h1>Keep this article</h1><p id="text">The original story stays unchanged.</p><button id="useful" type="button">Useful action</button></article></main>
  ${surface}${extra}<script>window.clicks=0;document.querySelector('#decline')?.addEventListener('click',()=>clicks++);${script}</script></body></html>`}));
  await page.goto(url);
}
async function hidden(page) {await expect(page.locator('#surface')).toBeHidden({timeout:10000});}
async function results(worker) {return worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).flatMap(s=>s.diagnostics||[]));}

test('presentation recovery starts and applies bundled CSS on a public HTTP origin',async({extension:{page,worker}})=>{
  await visit(page,'','',panel,'http://presentation.example/article');await hidden(page);
  expect(await page.evaluate(()=>window.isSecureContext)).toBe(false);
  await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='hidden')).toBe(true);
  expect(await page.evaluate(()=>clicks)).toBe(1);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
});

test('broken optional decline hides backdrop, preserves CSS/content and allows trusted wheel scrolling',async({extension:{page,worker}})=>{
  await visit(page);await hidden(page);
  await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='hidden')).toBe(true);
  await expect(page.locator('#text')).toHaveText('The original story stays unchanged.');
  expect(await page.evaluate(()=>[document.documentElement.style.cssText,document.body.style.cssText])).toEqual(['overflow: hidden !important;','overflow: hidden !important;']);
  await page.mouse.move(500,350);await page.mouse.wheel(0,700);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(()=>clicks)).toBe(1);
  expect((await results(worker)).some(r=>r.outcome==='saved')).toBe(false);
});

test('pause removes our effects and reveals current site styles without clobbering them',async({extension:{page,settings}})=>{
  await visit(page);await hidden(page);
  await page.evaluate(()=>{document.body.style.backgroundColor='pink';document.documentElement.style.setProperty('overflow-y','scroll','important');});
  await settings({enabled:false});await expect(page.locator('#surface')).toBeVisible();
  expect(await page.evaluate(()=>({overflow:document.documentElement.style.overflowY,color:document.body.style.backgroundColor,attributes:document.querySelectorAll('[data-cookie-calm-unlock],[data-cookie-calm-hide]').length}))).toEqual({overflow:'scroll',color:'pink',attributes:0});
});

test('body classes and SPA navigation preserve a committed effect; new modal owns its lock',async({extension:{page}})=>{
  await visit(page);await hidden(page);
  await page.evaluate(()=>{document.body.classList.add('scrolled');history.pushState({},'','/next');});
  await page.waitForTimeout(1100);await hidden(page);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
  await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<div id="modal" role="dialog" aria-modal="true" style="position:fixed;inset:50px;z-index:3000">Your useful dialog</div>'));
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
  await hidden(page);
  await page.evaluate(()=>document.querySelector('#modal').remove());
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
});

test('a slow native close releases overrides after the website cleans up',async({extension:{page,worker}})=>{
  await visit(page,`document.querySelector('#decline').addEventListener('click',()=>setTimeout(()=>{document.querySelector('#surface').remove();document.documentElement.style.overflow='visible';document.body.style.overflow='visible';},3400));`);
  await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='hidden')).toBe(true);
  await expect(page.locator('#surface')).toHaveCount(0,{timeout:7000});
  await expect.poll(()=>page.evaluate(()=>document.querySelectorAll('[data-cookie-calm-unlock]').length)).toBe(0);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('visible');
});

test('a competing backdrop prevents claiming recovery',async({extension:{page,worker}})=>{
  await visit(page,'','<div id="other" style="position:fixed;inset:0;background:#0008;z-index:900"></div>');
  await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='unconfirmed'),{timeout:9000}).toBe(true);
  await expect(page.locator('#surface')).toBeVisible();await expect(page.locator('#other')).toBeVisible();
  expect(await page.evaluate(()=>document.querySelectorAll('[data-cookie-calm-hide],[data-cookie-calm-unlock]').length)).toBe(0);
});

test('changed purpose during a failed native attempt cannot authorize presentation recovery',async({extension:{page,worker}})=>{
  await visit(page,`document.querySelector('#decline').addEventListener('click',()=>setTimeout(()=>document.querySelector('#surface').insertAdjacentHTML('beforeend','<p>Sign in to continue.</p><input type="password">'),300));`);
  await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
  await page.waitForTimeout(2600);await expect(page.locator('#surface')).toBeVisible();
  expect((await results(worker)).some(r=>r.outcome==='hidden')).toBe(false);
});

test('user interaction during native wait cancels recovery',async({extension:{page,worker}})=>{
  await visit(page);await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
  await page.locator('#decline').click();await page.waitForTimeout(2600);
  await expect(page.locator('#surface')).toBeVisible();
  expect((await results(worker)).some(r=>r.outcome==='hidden')).toBe(false);
});

test('suppressed article and competing dialog refuse recovery despite a valid decline',async({extension:{page,worker}})=>{
  for(const [script,extra] of [
    ["document.querySelector('main').style.filter='blur(3px)'",''],
    ["document.querySelector('main').setAttribute('aria-hidden','true')",''],
    ['', '<div role="dialog" style="position:fixed;bottom:0;z-index:4000">An unrelated dialog</div>']
  ]) {
    await visit(page,script,extra);
    await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='unconfirmed'),{timeout:9000}).toBe(true);
    await expect(page.locator('#surface')).toBeVisible();
    expect((await results(worker)).some(r=>r.outcome==='hidden')).toBe(false);
  }
});

test('shared portal text and native modal state prevent cosmetic takeover',async({extension:{page,worker}})=>{
  for(const [surface,script] of [
    [panel.replace('</div></div>','</div><aside>Helpful chat message</aside></div>'),''],
    [panel.replace('<div id="surface"','<dialog id="surface"').replace('</div></div>','</div></dialog>'),"document.querySelector('#surface').showModal()"]
  ]) {
    await visit(page,script,'',surface);
    await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='unconfirmed'),{timeout:9000}).toBe(true);
    await expect(page.locator('#surface')).toBeVisible();
    expect((await results(worker)).some(r=>r.outcome==='hidden')).toBe(false);
  }
});

test('initial autofocus releases into the document and a removed marker yields to the site',async({extension:{page,worker}})=>{
  await visit(page,"document.querySelector('#decline').tabIndex=0;document.querySelector('#decline').focus()");
  await hidden(page);
  expect(await page.evaluate(()=>document.querySelector('#surface').contains(document.activeElement))).toBe(false);
  await page.evaluate(()=>document.querySelector('#surface').removeAttribute('data-cookie-calm-hide'));
  await expect(page.locator('#surface')).toBeVisible();
  expect(await page.evaluate(()=>document.querySelectorAll('[data-cookie-calm-unlock]').length)).toBe(0);
  await page.waitForTimeout(4500);expect((await results(worker)).filter(r=>r.outcome==='hidden')).toHaveLength(1);
});

test('site replaces a hidden component without inheriting our override or receiving another fallback',async({extension:{page,worker}})=>{
  await visit(page);await hidden(page);
  await page.evaluate(()=>{const old=document.querySelector('#surface');old.replaceWith(old.cloneNode(true));});
  await expect(page.locator('#surface')).toBeVisible();await page.waitForTimeout(5000);
  await expect(page.locator('#surface')).toBeVisible();
  expect((await results(worker)).filter(r=>r.outcome==='hidden')).toHaveLength(1);
  await expect.poll(async()=>(await results(worker)).some(r=>r.reason==='presentation-reverted')).toBe(true);
});

test('body-only scroll locks retain viewport scrolling and sticky headers',async({extension:{page}})=>{
  for(const lock of ['height:auto','height:100vh']) {
    await visit(page,`document.documentElement.style.overflow='visible';document.body.style.cssText='overflow:hidden!important;${lock}';document.querySelector('main').insertAdjacentHTML('afterbegin','<header id="sticky" style="position:sticky;top:0;height:30px;background:white">Sticky header</header>');`);
    await hidden(page);await page.mouse.move(500,350);await page.mouse.wheel(0,700);
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
    expect(await page.locator('#sticky').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBe(0);
  }
});

test('non-modal menus, absolute article images and inert slides do not re-lock reading',async({extension:{page}})=>{
  await visit(page);await hidden(page);
  await page.evaluate(()=>{document.body.insertAdjacentHTML('beforeend','<div id="menu" role="dialog">Share options</div><div inert hidden>Slide two</div>');document.querySelector('main').insertAdjacentHTML('beforeend','<div style="position:relative;height:600px"><div style="position:absolute;inset:0">Article image</div></div>');});
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
  await page.evaluate(()=>document.querySelector('#menu').remove());await page.mouse.move(500,350);await page.mouse.wheel(0,700);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
});

test('blurred main with a clear related article and pseudo-element backdrops refuse recovery',async({extension:{page,worker}})=>{
  for(const script of [
    `document.querySelector('main').style.filter='blur(4px)';document.body.insertAdjacentHTML('beforeend','<aside><article>Related story</article></aside>')`,
    `document.head.insertAdjacentHTML('beforeend','<style>body::after{content:"";position:fixed;inset:0;background:#000c;z-index:900}</style>')`,
    `document.head.insertAdjacentHTML('beforeend','<style>body::after{content:"";position:fixed;inset:0;background:#000c;z-index:900;pointer-events:none}</style>')`
  ]) {
    await visit(page,script);
    await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='unconfirmed'),{timeout:9000}).toBe(true);
    await expect(page.locator('#surface')).toBeVisible();
    expect((await results(worker)).some(r=>r.outcome==='hidden')).toBe(false);
  }
});

test('shadow forms refuse recovery and post-commit surface mutations release with a truthful outcome',async({extension:{page,worker}})=>{
  // Passwords already stop promotions in the page guard. An email field
  // exercises the presentation scope check itself, after a native attempt.
  await visit(page,`const host=document.createElement('div');document.querySelector('#surface').append(host);host.attachShadow({mode:'closed'}).innerHTML='<input type="email">';`);
  await expect.poll(async()=>(await results(worker)).some(r=>r.outcome==='unconfirmed'),{timeout:9000}).toBe(true);
  await expect(page.locator('#surface')).toBeVisible();
  for(const change of [
    ()=>document.querySelector('#surface').style.setProperty('display','block','important'),
    ()=>document.querySelector('#surface p').hidden=true
  ]) {
    await visit(page);await hidden(page);await page.evaluate(change);
    await expect(page.locator('#surface')).toBeVisible();
    await expect.poll(async()=>(await results(worker)).some(r=>r.reason==='presentation-reverted')).toBe(true);
  }
});

test('native modal close and fullscreen exit wake scroll recovery without unrelated mutations',async({extension:{page}})=>{
  await visit(page);await hidden(page);
  await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='native';dialog.textContent='Useful dialog';document.body.append(dialog);dialog.showModal();});
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
  await page.evaluate(()=>document.querySelector('#native').close());
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
  await page.evaluate(()=>{const button=document.createElement('button');button.id='fullscreen';button.textContent='Fullscreen';button.onclick=()=>document.querySelector('article').requestFullscreen();document.querySelector('article').append(button);});
  await page.locator('#fullscreen').click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
  await page.evaluate(()=>document.exitFullscreen());
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe('auto');
  await page.mouse.move(500,350);await page.mouse.wheel(0,700);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
});

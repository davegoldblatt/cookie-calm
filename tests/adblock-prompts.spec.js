import {test, expect} from './fixtures.js';

// Synthetic publisher markup reproduces the native Admiral/Vox control shape:
// unnamed, deeply nested fixed overlay; href-less decline link; hidden Close.
const decline='<a id="decline" data-dismiss><u>Continue without support</u></a>';
const prompt=(control=decline,extra='',heading='Support independent journalism: Disable your adblocker')=>`
<div id="x71" style="position:fixed;inset:30px;background:white">
  <div><div><div><div><div><div>
    <h2>${heading}</h2><p>Please consider allowing ads or becoming a member to support our journalism.</p>
    ${control}<button id="allow" type="button">Allow ads</button><button data-dismiss hidden aria-label="Close"></button>
    <p>Already a member? <button id="signin" type="button">Sign in</button></p>${extra}
  </div></div></div></div></div></div>
</div>`;
async function visit(page, markup, script='', url='https://publisher-one.example/article') {
  await page.route(url, r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>[hidden]{display:none!important}</style></head><body>
    <article><h1>Article</h1><p id="reading">Keep reading.</p></article>${markup}
    <section id="cookie-banner" style="position:fixed;bottom:0"><p>Optional cookies</p><button id="reject" onclick="this.parentElement.remove()">Reject all</button></section>
    <script>window.actions=[];document.addEventListener('click',e=>{const c=e.target.closest('a,button,[role="button"]');if(!c||c.id==='reject')return;actions.push(c.id);if(c.hasAttribute('data-dismiss'))c.closest('#x71').remove();});${script}</script>
    </body></html>`}));
  await page.goto(url);
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
}
const state=worker=>worker.evaluate(()=>chrome.storage.session.get(null));
const count=async worker=>Object.values(await state(worker)).reduce((n,s)=>n+(s.promotionsDismissed||0),0);

test('optional adblock requests dismiss through native controls across publishers and markup',async({extension:{page,worker,settings}})=>{
  for(const [mode,control,url] of [
    ['reject',decline,'https://publisher-one.example/article'],
    ['dismiss','<button id="decline" type="button" data-dismiss>Continue without support</button>','https://publisher-two.example/story'],
    ['reject','<a id="decline" role="button" data-dismiss>Not now</a>','https://publisher-three.example/news']
  ]) {
    await settings({mode});await visit(page,prompt(control),'',url);
    await expect(page.locator('#x71')).toHaveCount(0);
    expect(await page.evaluate(()=>actions)).toEqual(['decline']);
    expect(page.url()).toBe(url);await expect(page.locator('#reading')).toBeVisible();
    await expect.poll(()=>count(worker)).toBe(1);
    expect(Object.values(await state(worker)).some(s=>s.host===new URL(url).hostname&&s.diagnostics?.some(r=>r.category==='adblock'&&r.outcome==='closed'))).toBe(true);
  }
});

test('a late href-less decline link triggers discovery without named dialog selectors',async({extension:{page}})=>{
  await visit(page,prompt(''),`setTimeout(()=>document.querySelector('#allow').insertAdjacentHTML('beforebegin',${JSON.stringify(decline)}),2400);`);
  await expect(page.locator('#x71')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['decline']);
});

test('href-less close controls also work for other promotional categories',async({extension:{page}})=>{
  await visit(page,'<div id="x71" style="position:fixed;inset:30px"><h2>Get our newsletter</h2><a id="decline" data-dismiss>Close</a></div>');
  await expect(page.locator('#x71')).toHaveCount(0);expect(await page.evaluate(()=>actions)).toEqual(['decline']);
});

test('no automatic ad opt-in when a safe decline control is absent',async({extension:{page,worker}})=>{
  for(const control of ['',
    '<a href="/subscribe" id="decline">Continue without support</a>',
    '<a href="javascript:void(0)" id="decline">Continue without support</a>',
    '<a id="decline" aria-disabled="true" data-dismiss>Continue without support</a>',
    '<button type="submit" form="external" id="decline" data-dismiss>Continue without support</button>',
    '<label><a id="decline" data-dismiss>Continue without support</a></label>'
  ]) {
    await visit(page,prompt(control)+'<form id="external"></form>');await page.waitForTimeout(900);
    await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);expect(await count(worker)).toBe(0);
  }
});

test('adblock wording cannot override authentication, forms, payment or consent protection',async({extension:{page}})=>{
  for(const extra of ['<p>Your session expired.</p>','<p>Sign in to continue.</p>','<input type="email">',
    '<footer><p>Sign in to continue.</p></footer>','<header>Log in to keep reading</header>',
    '<aside>Sign in to continue.</aside>','<p><a href="/login">Sign in to continue reading</a></p>',
    '<p>Sign <b>in</b> to continue.</p>',
    '<i> </i>'.repeat(300)+'<p>Sign in to continue.</p>',
    '<form><button type="button">Sign in</button></form>','<input type="password">',
    '<p>Continue to checkout</p>','<p>We use cookies.</p>','<p>Unsaved changes</p>']) {
    await visit(page,prompt(decline,extra));await page.waitForTimeout(900);
    await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  await visit(page,prompt(),'', 'https://publisher-one.example/checkout');await page.waitForTimeout(900);
  expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('adblock request evidence must come from the prompt, not its links or buttons',async({extension:{page}})=>{
  await visit(page,'<div id="x71" style="position:fixed;inset:30px"><h2>Navigation</h2><a href="/help">Disable your adblocker</a><button>Allow ads</button>'+decline+'</div>');
  await page.waitForTimeout(1100);await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('user-opened adblock requests and per-site pause stay protected',async({extension:{page,settings}})=>{
  await visit(page,'<a id="open" aria-controls="x71">Ad support options</a><div id="mount"></div>',
    `document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(prompt())},2200);`);
  await page.locator('#open').click();await page.waitForTimeout(3900);
  await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual(['open']);
  await settings({disabledSites:['publisher-one.example']});
  // No cookie sentinel while this site is paused.
  await page.reload();await page.evaluate(html=>document.querySelector('#mount').innerHTML=html,prompt());
  await page.waitForTimeout(1100);await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('a broken optional decline uses a distinct presentation fallback once',async({extension:{page,worker}})=>{
  const broken='<a id="decline" onclick="document.querySelectorAll(\'.missing-close\').forEach(el=>el.click())">Continue without support</a>';
  await visit(page,prompt(broken));
  await expect(page.locator('#x71')).toBeHidden();
  await expect.poll(()=>count(worker)).toBe(1);
  expect(await page.evaluate(()=>actions)).toEqual(['decline']);
  expect(Object.values(await state(worker)).some(s=>s.diagnostics?.some(r=>r.category==='adblock'&&r.outcome==='hidden'))).toBe(true);
});

test('observed Vox decline handler activates its hidden native Close',async({extension:{page,worker}})=>{
  const control='<a id="decline" onclick="document.querySelectorAll(\'.native-close\').forEach(el=>el.click())"><u>Continue without support</u></a>';
  const markup=prompt(control,'','Support Independent Journalism: Disable Your Adblocker')
    .replace('data-dismiss hidden aria-label="Close"','id="native-close" class="native-close" data-dismiss hidden aria-label="Close"');
  await visit(page,markup,'','https://www.vox.com/advice/test-article');
  await expect(page.locator('#x71')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['native-close','decline']);
  await expect.poll(()=>count(worker)).toBe(1);
});

test('generic ad language and hidden adblock text never authorize the sign-in exception',async({extension:{page}})=>{
  for(const [heading,extra] of [
    ['Enable ads on your channel?',''],['Allow ads personalization','<div role="switch" aria-checked="true">Personalized ads</div>'],
    ["We do not allow ads here",''],['Member options','<h2 hidden>Disable your adblocker</h2>']
  ]) {
    await visit(page,prompt(decline,extra,heading));await page.waitForTimeout(1100);
    await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});

test('adblock dismissal excludes nested unrelated controls and refuses ambiguous refusals',async({extension:{page}})=>{
  const nested='<section><h2>Reading settings</h2><button id="wrong" type="button">Close</button><button id="wrong-decline" type="button">No thanks</button></section>';
  await visit(page,prompt(decline,nested));await expect(page.locator('#x71')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['decline']);
  for(const markup of [prompt('',nested),prompt(decline,'<button id="second">Not now</button>')]) {
    await visit(page,markup);await page.waitForTimeout(1100);
    await expect(page.locator('#x71')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});

test('named adblock dialogs retain indirect user intent beyond the grace period',async({extension:{page}})=>{
  const markup=prompt().replace('id="x71"','id="x71" role="dialog"');
  await visit(page,'<button id="open">Play</button><div id="mount"></div>',
    `document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(markup)},2200);`);
  await page.locator('#open').click();await expect(page.locator('#x71')).toBeVisible();
  await page.waitForTimeout(10500);
  await page.evaluate(()=>document.querySelector('#x71').classList.add('changed'));
  await page.waitForTimeout(1000);await expect(page.locator('#x71')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual(['open']);
});

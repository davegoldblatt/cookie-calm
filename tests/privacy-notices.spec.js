import {readFileSync} from 'node:fs';
import {test,expect} from './fixtures.js';

// Public component observed on Big Blue View, 2026-09-22. No article/user data.
const notice=readFileSync(new URL('./markup/duet-pmc-notice.html',import.meta.url),'utf8');
const selector='.duet--navigation--pmc-privacy-banner';
const nativeHandler=`document.addEventListener('click',event=>{
  if(event.target.closest('button[aria-label="Dismiss privacy notice"]')) {
    actions.push('close');localStorage.setItem('duet-pmc-privacy-banner','accepted');
    document.querySelector('${selector}').remove();
  }
});`;
const witness='<section role="dialog" id="cookie-banner" style="position:fixed;top:0"><p>Optional cookies</p><button type="button" onclick="this.parentElement.remove()">Reject all</button></section>';
async function visit(page,markup=notice,script=nativeHandler,url='https://publisher.example/') {
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><main><h1>Article</h1><p id="article">Keep this article.</p><button id="open">Open details</button></main>${markup}${witness}<script>window.actions=[];document.cookie='privacy-choice=unchanged; path=/';${script}</script></body></html>`}));
  await page.goto(url);
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
}
const state=async worker=>Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).find(x=>x.host);

test('reviewed notice closes on different publishers, without a consent outcome',async({extension:{page,worker,settings}})=>{
  for(const [url,mode,markup] of [
    ['https://www.bigblueview.com/article','reject',notice],
    ['https://another-publisher.example/story','dismiss',notice.replace('role="dialog"','')]
  ]) {
    await settings({mode});
    await visit(page,markup,nativeHandler,url);
    await expect(page.locator(selector)).toHaveCount(0);
    await expect.poll(async()=> (await state(worker))?.diagnostics?.some(r=>r.category==='privacy-notice'&&r.outcome==='closed')).toBe(true);
    expect(await page.evaluate(()=>actions)).toEqual(['close']);
    expect(await page.evaluate(()=>localStorage.getItem('duet-pmc-privacy-banner'))).toBe('accepted');
    expect(await page.evaluate(()=>document.cookie)).toBe('privacy-choice=unchanged');
    const result=await state(worker);
    expect(result.consentOutcome).toBeUndefined();
    expect(result.accepted).toBe(false);
    expect(result.promotionsDismissed).toBe(1);
    await expect(page.locator('#article')).toBeVisible();
  }
});

test('changed notice contracts and unfamiliar notices remain visible',async({extension:{page,worker}})=>{
  const variants=[
    notice.replace('By continuing to use our services','By closing this notice'),
    notice.replace('</button>','<p>Closing accepts all cookies.</p></button>'),
    notice.replace('</button>','<span hidden>Closing accepts all cookies.</span></button>'),
    notice.replace('</aside>','<p>Closing accepts all cookies.</p></aside>'),
    notice.replace('</aside>','<p hidden>Closing accepts all cookies.</p></aside>'),
    notice.replace('</aside>','<button type="button" hidden>Accept all</button></aside>'),
    notice.replace('</aside>','<input type="checkbox" checked aria-label="Analytics"></aside>'),
    notice.replace('</aside>','<form><input type="email"></form></aside>'),
    notice.replace('</aside>','<div role="switch" aria-checked="true">Tracking</div></aside>'),
    notice.replace('type="button"','type="submit"'),
    notice.replace('type="button"','type="button" formaction="/agree"'),
    notice.replace('https://www.pmc.com/terms-of-use/','https://example.com/agree'),
    notice.replace('duet--navigation--pmc-privacy-banner','unknown-privacy-notice'),
    notice.replace('position:fixed','position:static'),
    notice.replace('</aside>','<privacy-options></privacy-options></aside>'),
    notice.replace('</aside>','<div tabindex="0"></div></aside>')
  ];
  for(const markup of variants) {
    await visit(page,markup);
    await page.waitForTimeout(850);
    expect(await page.evaluate(()=>actions)).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('duet-pmc-privacy-banner'))).toBeNull();
    expect((await state(worker))?.promotionsDismissed||0).toBe(0);
    await expect(page.getByText('Terms of Use/Your Privacy Rights',{exact:true})).toBeVisible();
  }
});

test('no-op notice close remains visible with an unconfirmed result',async({extension:{page,worker}})=>{
  await visit(page,notice,`document.querySelector('${selector} button').onclick=()=>actions.push('noop');`);
  await expect.poll(async()=> (await state(worker))?.diagnostics?.some(r=>r.category==='privacy-notice'&&r.outcome==='unconfirmed')).toBe(true);
  await page.waitForTimeout(5000);
  expect((await page.evaluate(()=>actions)).length).toBe(1);
  await expect(page.locator(selector)).toBeVisible();
  expect((await state(worker)).promotionsDismissed||0).toBe(0);
});

test('replacement with changed consent instructions is not recorded as closed',async({extension:{page,worker}})=>{
  await visit(page,notice,`document.querySelector('${selector} button').onclick=()=>{actions.push('replacement');const old=document.querySelector('${selector}');const next=old.cloneNode(true);next.querySelector('#pmc-privacy-banner-body').append(' Closing accepts tracking.');old.replaceWith(next);};`);
  await expect.poll(async()=> (await state(worker))?.diagnostics?.some(r=>r.category==='privacy-notice'&&r.outcome==='unconfirmed')).toBe(true);
  await expect(page.locator(selector)).toBeVisible();
  expect((await state(worker)).promotionsDismissed||0).toBe(0);
  expect(await page.evaluate(()=>actions)).toEqual(['replacement']);
});

test('user-opened notice remains available beyond the gesture delay',async({extension:{page,worker}})=>{
  await visit(page,'',nativeHandler);
  await page.evaluate(markup=>document.querySelector('#open').onclick=()=>document.body.insertAdjacentHTML('beforeend',markup),notice);
  await page.locator('#open').click();
  await page.waitForTimeout(11000);
  await expect(page.locator(selector)).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
  expect((await state(worker)).promotionsDismissed||0).toBe(0);
});

test('site pause and page safety block notice dismissal',async({extension:{page,settings}})=>{
  await settings({disabledSites:['publisher.example']});
  await page.route('https://publisher.example/',r=>r.fulfill({contentType:'text/html',body:`<body>${notice}<script>window.actions=[];${nativeHandler}</script></body>`}));
  await page.goto('https://publisher.example/');
  await page.waitForTimeout(1500);
  await expect(page.locator(selector)).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
  await settings({disabledSites:[]});
  await expect(page.locator(selector)).toHaveCount(0);
  // A normal cookie reject proves scanning while a payment field vetoes notices.
  await visit(page,notice+'<input type="password" aria-label="Password">');
  await page.waitForTimeout(1000);
  await expect(page.locator(selector)).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});


test('closed shadow controls inside a copied notice block automatic dismissal',async({extension:{page}})=>{
  await visit(page,notice,nativeHandler+`const host=document.createElement('div');document.querySelector('${selector}').append(host);host.attachShadow({mode:'closed'}).innerHTML='<input type="checkbox" checked>Tracking';`);
  await page.waitForTimeout(1200);
  await expect(page.locator(selector)).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('native closure still confirms when both website storage areas throw',async({extension:{page,worker}})=>{
  await visit(page,notice,`Storage.prototype.setItem=()=>{throw new Error('Storage unavailable')};document.querySelector('${selector} button').onclick=()=>{try{localStorage.setItem('duet-pmc-privacy-banner','accepted')}catch{}actions.push('close');document.querySelector('${selector}').remove()};`);
  await expect(page.locator(selector)).toHaveCount(0);
  await expect.poll(async()=> (await state(worker))?.diagnostics?.some(r=>r.category==='privacy-notice'&&r.outcome==='closed')).toBe(true);
  expect((await state(worker)).consentOutcome).toBeUndefined();
});

for(const pseudo of ['::before','::after'])test(`generated notice instructions in ${pseudo} block native closure`,async({extension:{page}})=>{
 await visit(page,notice+`<style>${selector} button${pseudo}{content:"Closing accepts all tracking"}</style>`);
 await page.waitForTimeout(1200);expect(await page.evaluate(()=>actions)).toEqual([]);
 await expect(page.locator(selector)).toBeVisible();
});

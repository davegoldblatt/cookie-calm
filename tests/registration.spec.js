import {test, expect} from './fixtures.js';

const url='https://www.theguardian.com/lifeandstyle/2026/sep/18/example';
const dismiss='<button type="button" aria-label="Dismiss sign-in gate" data-close>×</button>';
const gate=(control=dismiss,extra='')=>`<div id="sign-in-gate"><div data-testid="sign-in-gate-main" data-prompt><style>#reading{display:none}</style><h2>This is not a paywall</h2><p>Enter your email to keep reading for free.</p>${control}<a href="https://profile.theguardian.com/signin" id="signin">Sign in with email</a><a href="https://profile.theguardian.com/register">Create an account</a>${extra}</div></div>`;
const visit=async(page,markup,script='',address=url)=>{
  await page.route(address,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body><h1>Article</h1><p id="reading">Article remainder.</p>${markup}<section id="cookie-banner" style="position:fixed;bottom:0;left:0;background:white"><p>Optional cookies</p><button onclick="this.parentElement.remove()">Reject all</button></section><script>window.actions=[];document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b){actions.push('dismiss');b.closest('[data-prompt]').remove()}});${script}</script></body>`}));
  await page.goto(address);
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
};
const count=worker=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).reduce((n,v)=>n+(v.promotionsDismissed||0),0));

test('registration detector handles Guardian native dismissal in both modes',async({extension:{page,worker,settings}})=>{
  for(const mode of ['reject','dismiss']) {
    await settings({mode}); await visit(page,gate());
    await expect(page.locator('[data-prompt]')).toHaveCount(0);
    await expect(page.locator('#reading')).toBeVisible();
    expect(await page.evaluate(()=>actions)).toEqual(['dismiss']);expect(page.url()).toBe(url);
    await expect.poll(()=>count(worker)).toBe(1);
  }
});
test('same registration detector works on other domains and differently structured dialogs',async({extension:{page,worker}})=>{
  for(const [markup,address] of [
    [gate(),'https://another-news.example/article'],
    ['<section role="dialog" data-prompt><h2>Sign in to keep reading</h2><a href="/login">Sign in</a><button type="button" data-close>Close</button></section>','https://publication.example/story'],
    ['<aside class="registration-wall" data-prompt><h2>Create a free account to continue reading</h2><button type="button">Register</button><button type="button" data-close>No thanks</button></aside>','https://magazine.example/story']
  ]) {
    await visit(page,markup,'',address);await expect(page.locator('[data-prompt]')).toHaveCount(0);
    expect(await page.evaluate(()=>actions)).toEqual(['dismiss']);await expect.poll(()=>count(worker)).toBe(1);
  }
});
test('registration detector leaves mandatory and unsafe gates untouched',async({extension:{page,worker}})=>{
  for(const markup of [
    gate(''),gate(dismiss.replace('<button','<a href="/signin"').replace('</button>','</a>')),
    gate(dismiss.replace('type="button"','type="button" disabled')),
    gate(dismiss.replace('Dismiss sign-in gate','Continue reading')),
    gate(dismiss.replace('type="button"','type="submit" form="account"'))+'<form id="account"></form>',
    gate().replace('This is not a paywall','Verify your account').replace('Enter your email to keep reading for free.','Your session expired.'),
  ]) {
    await visit(page,markup);await page.waitForTimeout(800);
    expect(await page.evaluate(()=>actions)).toEqual([]);expect(await count(worker)).toBe(0);
  }
});
test('registration detector preserves real forms, critical dialogs and protected pages',async({extension:{page}})=>{
  for(const extra of ['<input type="email">','<form><button>Submit</button></form>','<input type="password">','<iframe title="Security verification"></iframe>','<p>Unsaved changes</p>','<p>Accept cookies</p>']) {
    await visit(page,gate(dismiss,extra));await page.waitForTimeout(800);expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  await visit(page,gate(),'','https://www.theguardian.com/account');await page.waitForTimeout(800);
  expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('user-opened registration is protected after a delayed mount',async({extension:{page}})=>{
  await visit(page,'<button id="open">Sign in</button><div id="mount"></div>',`document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(gate())},1800)`);
  await page.locator('#open').click();await expect(page.locator('[data-prompt]')).toBeVisible();
  await page.waitForTimeout(2000);expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('interaction inside a registration invitation and site pause prevent dismissal',async({extension:{page,settings}})=>{
  await settings({disabledSites:['www.theguardian.com']});
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<body>${gate()}<script>document.querySelector('#signin').onclick=e=>e.preventDefault();window.actions=[];document.querySelector('[data-close]').onclick=()=>actions.push('dismiss');</script></body>`}));
  await page.goto(url);await page.waitForTimeout(800);expect(await page.evaluate(()=>actions)).toEqual([]);
  await page.locator('#signin').click();await settings({disabledSites:[]});
  await page.waitForTimeout(2300);expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('ordinary article content and generic sign-in dialogs stay untouched',async({extension:{page}})=>{
  for(const markup of [gate().replace('id="sign-in-gate"','id="article-section"').replace('data-testid="sign-in-gate-main"',''),
    '<section role="dialog" data-prompt><h2>Sign in</h2><a href="/login">Sign in</a><button type="button" data-close>Close</button></section>']) {
    await visit(page,markup);await page.waitForTimeout(800);expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});
test('session expiry and required reauthentication never count as reading invitations',async({extension:{page}})=>{
  for(const text of ['Your session has expired. Please sign in again to continue.','Sign in again to continue reading for free.','You were signed out. Sign in to read the full article.','Confirm your identity. Sign in to keep reading.','Subscribe or sign in to keep reading.']) {
    const markup=`<section role="dialog" data-prompt><h2>${text}</h2><button>Sign in</button><button type="button" data-close>Close</button></section>`;
    await visit(page,markup);await page.waitForTimeout(800);expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});
test('Save and Comment initiated invitations stay protected after delayed mounts',async({extension:{page}})=>{
  for(const [label,delay] of [['Save',1800],['Comment',3000]]) {
    await visit(page,`<button id="open">${label}</button><div id="mount"></div>`,`document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(gate())},${delay})`);
    await page.locator('#open').click();await expect(page.locator('[data-prompt]')).toBeVisible();
    await page.waitForTimeout(2200);expect(await page.evaluate(()=>actions)).toEqual([]);
    // Protection survives the ten-second recognition window.
    await page.waitForTimeout(Math.max(0,10500-delay-2200));
    await page.evaluate(()=>document.querySelector('[data-prompt]').classList.add('changed'));
    await page.waitForTimeout(700);expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});

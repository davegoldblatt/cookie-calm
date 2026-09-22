import {test, expect} from './fixtures.js';

const pageHTML = (body, script = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:16px system-ui;margin:30px;min-height:1400px}button,input{padding:12px} [role=dialog],.promo{background:#eef;padding:25px;position:fixed;bottom:20px;right:20px;max-width:500px} [hidden]{display:none!important}
</style></head><body><main><h1>Article</h1><p id="reading">Keep this article and its controls.</p><button id="section-hide">Hide</button></main>${body}<script>
window.actions=[];document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b){actions.push(b.id||'close');b.closest('[data-prompt]').remove();}});${script}
</script></body></html>`;
const prompt = (text='Join our newsletter', buttons='<button type="button" data-close>Close</button>', extra='') => `<section class="promo" role="dialog" data-prompt><h2>${text}</h2>${extra}${buttons}</section>`;
const visit = async (page, body, script='', url='https://annoyance-test.example/') => {
  await page.route(url, route=>route.fulfill({contentType:'text/html',body:pageHTML(body,script)}));
  await page.goto(url);
};
const checkedVisit = async(page,body,script='',url) => {
  await visit(page,body+'<section id="cookie-banner" role="dialog" style="left:0;right:auto"><p>Optional cookies</p><button type="button" onclick="this.parentElement.remove()">Reject all</button></section>',script,url);
  await expect(page.locator('#cookie-banner')).toHaveCount(0); // Proves that the content script actually scanned.
};
const status = worker => worker.evaluate(()=>chrome.storage.session.get(null));
const count = async worker => Object.values(await status(worker)).reduce((sum,value)=>sum+(value.promotionsDismissed||0),0);
const guardian = `<gu-island name="StickyBottomBanner" style="display:contents"><aside role="alert" class="promo"><h2>Support the Guardian</h2><div id="offer">Ad-free reading with a subscription.</div><button type="button" id="collapse"><span>Collapse banner</span></button></aside></gu-island>`;
const guardianScript = `document.querySelector('#collapse').onclick=e=>{const b=e.currentTarget;actions.push(b.innerText);const collapsed=!document.querySelector('#offer').hidden;document.querySelector('#offer').hidden=collapsed;b.innerHTML='<span>'+(collapsed?'Expand banner':'Collapse banner')+'</span>';};`;

test('Guardian collapses once, keeps article controls, and respects manual reopening', async ({extension:{page,worker}})=>{
  await visit(page,guardian,guardianScript,'https://www.theguardian.com/us');
  await expect(page.locator('#collapse')).toHaveText('Expand banner');
  await expect.poll(()=>count(worker)).toBe(1);
  await expect(page.locator('#reading')).toBeVisible();
  await expect(page.locator('#section-hide')).toBeVisible();
  await page.locator('#collapse').click();
  await page.waitForTimeout(2600);
  await expect(page.locator('#collapse')).toHaveText('Collapse banner');
  expect(await page.evaluate(()=>actions)).toEqual(['Collapse banner','Expand banner']);
});
test('already collapsed Guardian panel stays collapsed', async ({extension:{page,worker}})=>{
  await checkedVisit(page,guardian.replace('id="offer"','id="offer" hidden').replace('Collapse banner','Expand banner'),guardianScript,'https://www.theguardian.com/us');
  await page.waitForTimeout(1600);
  expect(await page.evaluate(()=>actions)).toEqual([]);
  expect(await count(worker)).toBe(0);
});

test('Guardian inline custom element with hidden text label collapses without selecting an offer', async ({extension:{page,worker}})=>{
  // Structure observed in the live signed-in profile on 2026-09-18. Copy is synthetic.
  const markup = `<gu-island name="StickyBottomBanner" data-island-status="hydrated"><div role="alert" tabindex="-1" style="position:fixed;bottom:0;background:white;width:100%"><h2>Support the Guardian</h2><div id="offer"><p>Ad-free reading with a subscription.</p><label><input type="radio" name="support">Support monthly</label><a href="/contribute">Continue</a></div><button type="button" aria-live="polite" id="collapse"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Collapse banner</span><svg aria-hidden="true" width="24" height="24"></svg></button></div></gu-island>`;
  await visit(page,markup,guardianScript,'https://www.theguardian.com/us');
  await expect(page.locator('#collapse')).toHaveText('Expand banner');
  await expect.poll(()=>count(worker)).toBe(1);
  expect(await page.locator('input').isChecked()).toBe(false);
  expect(page.url()).toBe('https://www.theguardian.com/us');
});

for (const [category,text,control] of [
  ['newsletter','Get our newsletter','Close'], ['support','Support our journalism','Collapse banner'],
  ['subscription','Subscribe for ad-free reading','Continue without subscribing'], ['discount','Get an exclusive offer: 20% off','No thanks'],
  ['survey','Take our short survey','Maybe later'], ['app','Download our app','Not now'],
  ['notifications','Enable push notifications','No thanks'], ['chat','How can we help? Chat with us','Minimize chat']
]) test(`automatically handles ${category} in both consent modes`, async ({extension:{page,settings,worker}})=>{
  for (const mode of ['reject','dismiss']) {
    await settings({mode});
    await visit(page,prompt(text,`<button type="button" data-close>${control}</button><button id="accept">Accept</button>`));
    await expect(page.locator('[data-prompt]')).toHaveCount(0);
    await expect.poll(()=>count(worker)).toBe(1);
    expect(await page.evaluate(()=>actions)).toEqual(['close']);
  }
});

test('native dialog dismissal releases its backdrop and scroll lock', async ({extension:{page}})=>{
  await visit(page,'<dialog id="newsletter"><h2>Join our newsletter</h2><button type="button" id="close">Close</button></dialog>',
    `const d=document.querySelector('dialog');d.showModal();document.body.style.overflow='hidden';document.querySelector('#close').onclick=()=>{actions.push('close');d.close();document.body.style.overflow='';};`);
  await expect(page.locator('dialog')).not.toBeVisible();
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});
test('unresolved cookie choices are not hidden as promotional prompts', async ({extension:{page,worker}})=>{
  await checkedVisit(page,prompt('Subscribe to our newsletter and accept cookies'));
  await page.waitForTimeout(1700);
  expect(await page.evaluate(()=>actions)).toEqual([]);
  expect(await count(worker)).toBe(0);
});
test('no-op and replacement handlers have bounded retries and no false success', async ({extension:{page,worker}})=>{
  await visit(page,prompt('Join our newsletter','<button type="button" id="noop">Close</button>'),
    `document.addEventListener('click',e=>{if(e.target.id==='noop'){actions.push('noop');const s=e.target.closest('section');s.replaceWith(s.cloneNode(true));}});`);
  await page.waitForTimeout(6200);
  expect(await page.evaluate(()=>actions)).toEqual(['noop','noop']);
  expect(await count(worker)).toBe(0);
  await expect(page.locator('[data-prompt]')).toBeVisible();
});
test('does not click form submissions, navigation links, disabled controls, or download controls', async ({extension:{page}})=>{
  for (const control of [
    '<form><button id="unsafe">Close</button></form>',
    '<form><button id="unsafe" type="reset">Close</button></form>',
    '<button id="unsafe" type="button" formaction="/payment">Close</button>',
    '<a id="unsafe" href="https://annoyance-test.example/pay">Close</a>',
    '<a id="unsafe" href="javascript:void(0)">Close</a>',
    '<a id="unsafe" href="#" download>Close</a>',
    '<button id="unsafe" disabled>Close</button>'
  ]) {
    await checkedVisit(page,prompt('Join our newsletter',control),`document.querySelector('#unsafe').onclick=e=>{e.preventDefault();actions.push('unsafe');};`);
    await page.waitForTimeout(800);
    expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});
test('protects critical dialogs and ordinary page content', async ({extension:{page}})=>{
  for (const text of ['Newsletter payment details','Subscribe: checkout','Support: your cart','Survey: verification code','Newsletter: unsaved changes','Subscribe: CAPTCHA']) {
    await checkedVisit(page,prompt(text)); await page.waitForTimeout(750);
    expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  for (const field of ['<input type="password">','<input autocomplete="cc-number">','<input autocomplete="one-time-code">','<input type="file">','<iframe title="Payment checkout"></iframe>']) {
    await checkedVisit(page,prompt('Join our newsletter',undefined,field)); await page.waitForTimeout(750);
    expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  await visit(page,'<article class="newsletter"><h2>Newsletter subscriptions explained</h2><button data-close>Close</button></article>');
  await page.waitForTimeout(1000); expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('protects a user-opened form after typing, blur, and replacement', async ({extension:{page}})=>{
  await visit(page,'<button id="open">Open newsletter signup</button><div id="mount"></div>',
    `document.querySelector('#open').onclick=()=>{document.querySelector('#mount').innerHTML=${JSON.stringify(prompt('Join our newsletter',undefined,'<input type="email" aria-label="Email">'))};};`);
  await page.locator('#open').click();
  await page.locator('input').fill('example@example.test');
  await page.locator('#reading').click();
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{const s=document.querySelector('section');s.replaceWith(s.cloneNode(true));});
  await page.waitForTimeout(1800);
  await expect(page.locator('[data-prompt]')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('finds late and style-revealed promotions', async ({extension:{page}})=>{
  await visit(page,'<div id="mount"></div>',`setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(prompt())},6100)`);
  await expect.poll(()=>page.evaluate(()=>actions.length),{timeout:10000}).toBe(1);
  await visit(page,prompt().replace('class="promo"','class="promo" hidden'),`setTimeout(()=>document.querySelector('section').hidden=false,1800)`);
  await expect(page.locator('[data-prompt]')).toHaveCount(0);
});
test('handles a prompt in open and closed shadow DOM', async ({extension:{page}})=>{
  for (const mode of ['open','closed']) {
    await visit(page,'<div id="host"></div>',`const root=document.querySelector('#host').attachShadow({mode:'${mode}'});root.innerHTML=${JSON.stringify(prompt())};root.addEventListener('click',e=>{if(e.target.matches('button')){actions.push('shadow');root.querySelector('section').remove();}});`);
    await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['shadow']);
  }
});
test('same-host frames share top-level pause and report verified removals', async ({extension:{page,context,settings,worker}})=>{
  await settings({disabledSites:['annoyance-test.example']});
  await context.route('https://annoyance-test.example/frame/**',route=>route.fulfill({contentType:'text/html',body:pageHTML(prompt())}));
  await visit(page,'<iframe width="700" height="350" src="https://annoyance-test.example/frame/one"></iframe><iframe width="700" height="350" src="https://annoyance-test.example/frame/two"></iframe>');
  await page.waitForTimeout(1600);
  for (const frame of page.frames().slice(1)) expect(await frame.evaluate(()=>actions)).toEqual([]);
  await settings({enabled:true});
  await expect.poll(()=>count(worker)).toBe(2);
});
test('scam instructions prevent promotion clicks, including inside frames', async ({extension:{page,context}})=>{
  await context.route('https://frame-test.example/**',route=>route.fulfill({contentType:'text/html',body:pageHTML(prompt())}));
  await visit(page,'<h2>Your computer is infected</h2>'+prompt()+'<iframe width="700" height="350" src="https://frame-test.example/one"></iframe>');
  await page.waitForTimeout(1600);
  for (const frame of page.frames()) expect(await frame.evaluate(()=>actions)).toEqual([]);
});
test('known app-banner cosmetic fallback restores on pause and preserves later site style changes', async ({extension:{page,settings,worker}})=>{
  const app='<aside class="smartbanner smartbanner--ios" style="position:fixed;top:0;display:flex"><div class="smartbanner__info">Get our app on the App Store</div><a href="https://apps.apple.com/app/example/id12345">View</a></aside>';
  await settings({disabledSites:['annoyance-test.example']}); await visit(page,app);
  await page.waitForTimeout(900); await expect(page.locator('aside')).toBeVisible();
  await settings({}); await expect(page.locator('aside')).not.toBeVisible();
  await expect.poll(()=>count(worker)).toBe(1);
  await settings({enabled:false}); await expect(page.locator('aside')).toBeVisible();
  expect(await page.locator('aside').evaluate(e=>e.style.display)).toBe('flex');
  await settings({}); await expect(page.locator('aside')).not.toBeVisible();
  await page.locator('aside').evaluate(e=>e.style.setProperty('display','grid','important'));
  await settings({enabled:false});
  expect(await page.locator('aside').evaluate(e=>e.style.display)).toBe('grid');
});
test('floating video closes automatically but user-opened video stays', async ({extension:{page}})=>{
  const video='<aside class="floating-video promo" data-prompt><video></video><button type="button" data-close>Close video</button></aside>';
  await visit(page,video); await expect(page.locator('[data-prompt]')).toHaveCount(0);
  await visit(page,'<button id="play">Play video</button><div id="mount"></div>',`document.querySelector('#play').onclick=()=>document.querySelector('#mount').innerHTML=${JSON.stringify(video)};`);
  await page.locator('#play').click(); await page.waitForTimeout(1800);
  await expect(page.locator('video')).toBeVisible(); expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('client-side navigation keeps the document budget and can dismiss another prompt', async ({extension:{page}})=>{
  await visit(page,prompt()); await expect(page.locator('[data-prompt]')).toHaveCount(0);
  await page.evaluate(html=>{history.pushState({},'','/next');document.body.insertAdjacentHTML('beforeend',html);},prompt());
  await expect(page.locator('[data-prompt]')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['close','close']);
});
test('delayed user-opened prompts stay open after the gesture grace period', async ({extension:{page}})=>{
  await visit(page,'<button id="open" aria-controls="delayed-prompt">More</button><div id="mount"></div>',
    `document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(prompt().replace('data-prompt','id="delayed-prompt" data-prompt'))},2300);`);
  await page.locator('#open').click();
  await page.waitForTimeout(4000);
  await expect(page.locator('[data-prompt]')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('a delayed chat frame inherits the parent user intent', async ({extension:{page,context}})=>{
  await context.route('https://annoyance-test.example/chat',route=>route.fulfill({contentType:'text/html',body:pageHTML(prompt('How can we help?'))}));
  await visit(page,'<button id="open">Chat with us</button><div id="mount"></div>',`document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML='<iframe width="700" height="350" src="https://annoyance-test.example/chat"></iframe>',2300);`);
  await page.locator('#open').click();
  await page.waitForTimeout(4000);
  await expect(page.frameLocator('iframe').locator('[data-prompt]')).toBeVisible();
});
test('a pre-existing expand control cannot make a no-op collapse look successful', async ({extension:{page,worker}})=>{
  await visit(page,prompt('Support our journalism','<button id="noop" type="button">Collapse banner</button><button type="button">Expand chat</button>'),`document.querySelector('#noop').onclick=()=>actions.push('noop');`);
  await page.waitForTimeout(3200);
  expect(await count(worker)).toBe(0);
  await expect(page.locator('[data-prompt]')).toBeVisible();
});
test('Guardian only collapses, skips decoys and generic children, and waits for hydration', async ({extension:{page,worker}})=>{
  const markup=guardian.replace('name="StickyBottomBanner"','name="StickyBottomBanner" data-island-status="pending"')
    .replace('<h2>','<button type="button" id="decoy">Close</button><h2>');
  await visit(page,markup,guardianScript+`document.querySelector('#decoy').onclick=()=>actions.push('wrong-close');setTimeout(()=>document.querySelector('gu-island').setAttribute('data-island-status','hydrated'),2600);`,'https://www.theguardian.com/us');
  await expect(page.locator('#collapse')).toHaveText('Expand banner',{timeout:7000});
  await page.waitForTimeout(4400);
  expect(await page.evaluate(()=>actions)).toEqual(['Collapse banner']);
  expect(await count(worker)).toBe(1);
});
test('hash and replaceState changes preserve a user-opened edited form', async ({extension:{page}})=>{
  await visit(page,'<button id="open">Join our newsletter</button><div id="mount"></div>',`document.querySelector('#open').onclick=()=>document.querySelector('#mount').innerHTML=${JSON.stringify(prompt('Join our newsletter',undefined,'<input aria-label="Email" type="email">'))};`);
  await page.locator('#open').click(); await page.locator('input').fill('test@example.test');
  await page.evaluate(()=>{location.hash='comments';history.replaceState({},'','/another-article#comments');});
  await page.waitForTimeout(2200);
  await expect(page.locator('input')).toHaveValue('test@example.test');
  expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('route churn cannot reset the document retry budget', async ({extension:{page}})=>{
  await visit(page,prompt('Join our newsletter','<button id="noop" type="button">Close</button>'),
    `document.querySelector('#noop').onclick=()=>{actions.push('noop');history.replaceState({},'','/route-'+actions.length);};`);
  await expect.poll(()=>page.evaluate(()=>actions.length),{timeout:11000}).toBe(2);
  await page.evaluate(()=>history.pushState({},'','/third-route'));
  await page.waitForTimeout(2300);
  expect(await page.evaluate(()=>actions.length)).toBe(2);
});
test('an unrelated gesture only delays an unsolicited prompt', async ({extension:{page,worker}})=>{
  await visit(page,'<button id="unrelated">Expand article section</button><div id="mount"></div>',
    `document.querySelector('#unrelated').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(prompt())},100);`);
  await page.locator('#unrelated').click();
  await expect.poll(()=>count(worker)).toBe(1);
  await expect(page.locator('[data-prompt]')).toHaveCount(0);
});
test('page-level checkout and login contexts protect unrelated upsells', async ({extension:{page}})=>{
  for (const [path,field] of [['checkout',''],['login',''],['read','<input autocomplete="cc-number" aria-label="Card">'],['read','<input type="password" aria-label="Password">']]) {
    await checkedVisit(page,field+prompt('Get 20% off with this special offer'),'',`https://annoyance-test.example/${path}`);
    await page.waitForTimeout(900);
    expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  await checkedVisit(page,prompt('Sign in or create an account for newsletter updates'));
  expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('preserves restored chats and media with playback state', async ({extension:{page}})=>{
  for (const inner of ['<div role="log">Earlier conversation</div>','<textarea aria-label="Message"></textarea>','<input aria-label="Message">']) {
    await checkedVisit(page,prompt('How can we help?',undefined,inner));
    await page.waitForTimeout(700); expect(await page.evaluate(()=>actions)).toEqual([]);
  }
  await checkedVisit(page,'<aside class="floating-video promo"><video></video><button type="button" onclick="actions.push(\'video\')">Close video</button></aside>',`document.querySelector('video').currentTime=10;`);
  await page.waitForTimeout(900); expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('nested fake close buttons cannot navigate, submit, or toggle an opt-in', async ({extension:{page}})=>{
  for (const control of [
    '<a href="/buy"><span role="button" id="unsafe">×</span></a>',
    '<label><input type="checkbox"><span role="button" id="unsafe">×</span></label>',
    '<form><span role="button" id="unsafe">Close</span></form>',
    '<form><button type="submit"><span role="button" id="unsafe">Close</span></button></form>'
  ]) {
    await checkedVisit(page,prompt('Join our newsletter',control),`document.querySelector('#unsafe').onclick=e=>{e.preventDefault();actions.push('unsafe');};`);
    await page.waitForTimeout(700); expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});
test('foreign promotional frames stay untouched while top-page prompts close', async ({extension:{page,context,worker}})=>{
  await context.route('https://ads-test.example/**',route=>route.fulfill({contentType:'text/html',body:pageHTML(prompt())}));
  await visit(page,prompt()+'<iframe width="700" height="350" src="https://ads-test.example/promo"></iframe>');
  await expect.poll(()=>count(worker)).toBe(1);
  expect(await page.frames()[1].evaluate(()=>actions)).toEqual([]);
});
test('unrelated settings changes do not restore or exhaust a hidden app banner', async ({extension:{page,settings}})=>{
  await visit(page,'<aside class="smartbanner smartbanner--ios" style="position:fixed;top:0"><div class="smartbanner__info">Get our app on the App Store</div><a href="https://apps.apple.com/app/example/id12345">View</a></aside>');
  await expect(page.locator('aside')).not.toBeVisible();
  for (const mode of ['dismiss','reject','dismiss']) {
    await settings({mode,disabledSites:['other.example']});
    await page.waitForTimeout(500); await expect(page.locator('aside')).not.toBeVisible();
  }
});
test('verification waits for a native fade-out and never reports an unconfirmed pause', async ({extension:{page,worker,settings}})=>{
  await visit(page,prompt('Join our newsletter','<button id="fade" type="button">Close</button>'),
    `document.querySelector('#fade').onclick=()=>{actions.push('fade');setTimeout(()=>document.querySelector('section').remove(),1100);};`);
  await expect.poll(()=>count(worker)).toBe(1);
  await visit(page,prompt('Join our newsletter','<button id="fade" type="button">Close</button>'),
    `document.querySelector('#fade').onclick=()=>{actions.push('fade');setTimeout(()=>document.querySelector('section').remove(),1100);};`);
  await expect.poll(()=>page.evaluate(()=>actions.length)).toBe(1);
  await settings({enabled:false}); await page.waitForTimeout(1400);
  expect(await count(worker)).toBe(0);
});

test('a drawer stays open when its trigger controls an inner or outer element', async ({extension:{page}})=>{
  for(const target of ['inner','outer']) {
    const drawer='<div id="outer"><section class="modal" data-prompt style="position:fixed;top:100px;background:white"><div id="inner"><a href="/newsletters">Newsletters</a><a href="/subscribe">Subscribe</a></div><button data-close type="button">Close</button></section></div>';
    await visit(page,`<button id="menu" aria-controls="${target}">Menu</button><div id="mount"></div>`,`document.querySelector('#menu').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(drawer)},2100);`);
    await page.locator('#menu').click();
    await page.waitForTimeout(3800);
    await expect(page.locator('[data-prompt]')).toBeVisible();
    expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});

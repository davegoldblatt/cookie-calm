import {test,expect} from './fixtures.js';

const state = worker => worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)));
test('replacement verification follows the replacement discovery path',async({extension:{page,worker}})=>{
 const url='https://replacement-proof.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><body><main><h1>Article</h1></main><div id="q" style="position:fixed;bottom:0;background:white;padding:20px"><h2>Join our newsletter</h2><button type="button">Close</button></div><script>window.clicks=0;document.querySelector('#q button').onclick=()=>{clicks++;const a=document.createElement('aside');a.innerHTML='<section role="dialog" style="position:fixed;bottom:0;background:white;padding:20px"><h2>Join our newsletter</h2><button type="button" disabled>Close</button></section>';document.querySelector('#q').replaceWith(a);};</script></body></html>`}));
 await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>window.clicks)).toBe(1);
 await page.waitForTimeout(3000);
 await expect(page.locator('[role="dialog"]')).toBeVisible();
 expect((await state(worker)).reduce((n,s)=>n+(s.promotionsDismissed||0),0)).toBe(0);
});

test('a Close-labelled known acceptance control is never a promotional dismissal',async({extension:{page}})=>{
 const url='https://acceptance-proof.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body><section role="dialog" style="position:fixed;bottom:0" id="onetrust-banner-sdk"><h2>Newsletter updates</h2><p>We and our partners use trackers. Subject to your privacy choices.</p><button id="onetrust-accept-btn-handler" type="button" onclick="window.accepted++;this.parentElement.remove()">Close</button></section><section id="cookie-banner" role="dialog" style="position:fixed;top:0"><p>Optional cookies</p><button type="button" onclick="this.parentElement.remove()">Reject all</button></section><script>window.accepted=0;</script></body>`}));
 await page.goto(url);
 await expect(page.locator('#cookie-banner')).toHaveCount(0);
 await page.waitForTimeout(1200);
 expect(await page.evaluate(()=>window.accepted)).toBe(0);
});

for(const [name,replacement] of [
 ['changed copy and missing Close','<div style="position:fixed;bottom:0;background:white;padding:20px">Different offer. Still blocking.</div>'],
 ['protected replacement','<div role="dialog" style="position:fixed;bottom:0;background:white;padding:20px"><h2>Account verification</h2><input type="password"><button disabled>Close</button></div>'],
 ['delayed replacement','<div style="position:fixed;bottom:0;background:white;padding:20px;pointer-events:none">Still blocking</div>']
])test(`completion retains a visible ${name}`,async({extension:{page,worker}})=>{
 const url='https://completion-proof.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body><main><h1>Article</h1></main><section role="dialog" style="position:fixed;bottom:0;padding:20px"><h2>Join our newsletter</h2><button type="button">Close</button></section><script>window.clicks=0;document.querySelector('button').onclick=()=>{clicks++;document.querySelector('section').remove();setTimeout(()=>document.body.insertAdjacentHTML('beforeend',${JSON.stringify(replacement)}),${name==='delayed replacement'?180:0});};</script></body>`}));
 await page.goto(url);await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
 await expect.poll(async()=> (await state(worker)).some(s=>s.diagnostics?.some(x=>x.provider==='promotion'&&x.outcome==='unconfirmed'))).toBe(true);
 expect((await state(worker)).reduce((n,s)=>n+(s.promotionsDismissed||0),0)).toBe(0);
});

test('simultaneous same-key prompts close independently without false replacement evidence',async({extension:{page,worker}})=>{
 const url='https://simultaneous-proof.example/';
 const panel=side=>`<section role="dialog" style="position:fixed;bottom:0;${side}:0"><p>Join our newsletter</p><button type="button" onclick="this.parentElement.remove()">Close</button></section>`;
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main>Article</main>'+panel('left')+panel('right')}));await page.goto(url);
 await expect.poll(async()=> (await state(worker)).reduce((n,s)=>n+(s.promotionsDismissed||0),0),{timeout:8000}).toBe(2);
 await expect(page.locator('section')).toHaveCount(0);
});

test('changed-subtree exhaustion withholds a completion result',async({extension:{page,worker}})=>{
 const url='https://exhaustion-proof.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body><section role="dialog" style="position:fixed;bottom:0"><h2>Newsletter</h2><button type="button">Close</button></section><script>window.clicks=0;document.querySelector('button').onclick=()=>{clicks++;document.querySelector('section').remove();const d=document.createElement('div');d.innerHTML='<span>new</span>'.repeat(2600);document.body.append(d);};</script></body>`}));await page.goto(url);
 await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
 await expect.poll(async()=> (await state(worker)).some(s=>s.diagnostics?.some(x=>x.outcome==='unconfirmed'))).toBe(true);
 expect((await state(worker)).reduce((n,s)=>n+(s.promotionsDismissed||0),0)).toBe(0);
});

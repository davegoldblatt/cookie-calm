import {test,expect} from './fixtures.js';
import {groupedNotice} from './helpers/grouped-notice.js';
import {build} from 'esbuild';

const records=async worker=>Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).flatMap(x=>x.diagnostics||[]);
async function visit(page,options={}) {
 const url='https://audit-consent.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:groupedNotice(options)}));
 await page.goto(url);
}
for(const [name,setup] of [
 ['unknown custom element',`const el=document.createElement('x-consent');el.attachShadow({mode:'closed'}).innerHTML='<input type="checkbox" checked>';panel.append(el);`],
 ['shadow control on a standard element',`const el=document.createElement('div');el.attachShadow({mode:'closed'}).innerHTML='<input type="checkbox" checked>';panel.append(el);`],
 ['shadow control on the panel itself',`panel.attachShadow({mode:'closed'}).innerHTML='<slot></slot><input type="checkbox" checked>';`],
 ['Save carrying acceptance identity',`document.querySelector('#accept-recommended-btn-handler').remove();document.querySelector('.save-preference-btn-handler').id='accept-recommended-btn-handler';`]
])test(`audit: grouped preflight refuses ${name}`,async({extension:{page,worker}})=>{
 await visit(page,{setup});
 await expect.poll(async()=>(await records(worker)).some(r=>r.provider==='onetrust-zd-group'&&r.outcome==='unsupported')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('audit: a user closing a no-op Save cannot produce automatic closure credit',async({extension:{page,worker}})=>{
 await visit(page,{saveNoop:true});
 await expect.poll(()=>page.evaluate(()=>actions.includes('save'))).toBe(true);
 // This is a trusted interaction in the currently owned panel, during polling.
 await page.locator('#onetrust-pc-sdk').evaluate(panel=>{
  const close=document.createElement('button');close.type='button';close.id='manual-close';close.textContent='Dismiss manually';
  close.onclick=()=>{panel.hidden=true;document.querySelector('#onetrust-banner-sdk').hidden=true;};panel.append(close);
 });
 await page.locator('#manual-close').click();
 await expect.poll(async()=>(await records(worker)).some(r=>r.reason==='user-interaction')).toBe(true);
 expect((await records(worker)).some(r=>r.provider==='onetrust-zd-group'&&['closed','saved'].includes(r.outcome))).toBe(false);
});

test('audit: a later manually opened panel does not inherit automatic ownership',async({extension:{page,worker,settings}})=>{
 await visit(page);
 await expect.poll(()=>page.evaluate(()=>actions.includes('save'))).toBe(true);
 await expect.poll(async()=>(await records(worker)).some(r=>r.outcome==='closed')).toBe(true);
 await settings({enabled:false});
 await page.evaluate(()=>{
  for(const input of document.querySelectorAll('#onetrust-pc-sdk input[type="checkbox"]'))input.checked=true;
  document.querySelector('#user').onclick=()=>document.querySelector('#onetrust-pc-sdk').hidden=false;
 });
 await page.locator('#user').click();await page.waitForTimeout(1700);await settings({enabled:true});
 await expect.poll(async()=>(await records(worker)).some(r=>r.provider==='onetrust-zd-group'&&r.outcome==='blocked'&&r.reason==='user-interaction')).toBe(true);
 expect(await page.evaluate(()=>document.querySelector('#ot-group-id-OSSTA_BG').checked)).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open','parent:false','save']);
});

test('audit: automatic checkbox events and trusted manual input remain distinct',async({extension:{page}})=>{
 const bundled=await build({stdin:{contents:"export {Interactions} from './src/interactions.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Audit'});
 await page.goto('about:blank');await page.setContent('<input id="choice" type="checkbox"><label for="choice">Choice</label>');
 await page.addScriptTag({content:bundled.outputFiles[0].text});
 expect(await page.evaluate(()=>{window.interactions=new Audit.Interactions();interactions.automatic(()=>document.querySelector('label').click());return interactions.revision;})).toBe(0);
 await page.locator('label').click();
 expect(await page.evaluate(()=>interactions.revision)).toBeGreaterThan(0);
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>interactions.recent())).toBe(true);
});

test('audit: existing same-key prompts can animate during another dismissal',async({extension:{page,worker}})=>{
 const url='https://audit-completion.example/';
 const panel=side=>`<section role="dialog" style="position:fixed;bottom:0;${side}:0"><p>Join our newsletter</p><button type="button" onclick="this.parentElement.remove()">Close</button></section>`;
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main>Article</main>'+panel('left')+panel('right')+'<script>setInterval(()=>document.querySelectorAll("section").forEach(e=>e.classList.toggle("animated")),30)</script>'}));
 await page.goto(url);
 await expect.poll(async()=>Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).reduce((n,s)=>n+(s.promotionsDismissed||0),0),{timeout:8000}).toBe(2);
});

test('audit: benign repeated DOM churn does not exhaust completion across polls',async({extension:{page,worker}})=>{
 const url='https://audit-churn.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><main>${'<span>Article text</span>'.repeat(300)}</main><section role="dialog" style="position:fixed;bottom:0"><p>Join our newsletter</p><button type="button">Close</button></section><script>document.querySelector('button').onclick=()=>{const timer=setInterval(()=>document.querySelectorAll('main span').forEach(e=>e.classList.toggle('pulse')),20);setTimeout(()=>{document.querySelector('section').remove();},1400);setTimeout(()=>clearInterval(timer),2300);};</script>`}));
 await page.goto(url);
 await expect.poll(async()=>Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).reduce((n,s)=>n+(s.promotionsDismissed||0),0),{timeout:8000}).toBe(1);
});

test('audit: an asynchronous gap during automatic opening preserves run ownership',async({extension:{page,worker}})=>{
 await visit(page,{openNoop:true,afterOpen:'bar.hidden=true;setTimeout(()=>{panel.hidden=false;},350);'});
 await expect.poll(async()=>(await records(worker)).some(r=>r.provider==='onetrust-zd-group'&&r.outcome==='closed')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open','parent:false','save']);
});

test('audit: an existing ancestor cannot masquerade as an independent same-key prompt',async({extension:{page,worker}})=>{
 const url='https://audit-ancestor.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><main>Article</main><aside role="dialog" style="position:fixed;bottom:0;background:white"><p>Sign in to continue.</p><section role="dialog"><h2>Join our newsletter</h2><button type="button">Close</button></section></aside><script>window.clicks=0;document.querySelector('button').onclick=()=>{clicks++;document.querySelector('section').remove();document.querySelector('aside').insertAdjacentHTML('beforeend','<p>Different blocking content</p>');};</script>`}));
 await page.goto(url);await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
 await expect.poll(async()=>(await records(worker)).some(r=>r.provider==='promotion'&&r.outcome==='unconfirmed')).toBe(true);
 expect(Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).reduce((n,s)=>n+(s.promotionsDismissed||0),0)).toBe(0);
});

test('audit: child-first text changes cannot shorten a later ancestor inspection',async({extension:{page,worker}})=>{
 const url='https://audit-order.example/';
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>#widget{display:none;position:fixed;bottom:0;background:white}#widget:has(#signal:not(:empty)){display:block}</style><main>Article</main><div id="widget"></div><section role="dialog" style="position:fixed;bottom:0"><h2>Newsletter</h2><button type="button">Close</button></section><script>const surface=document.querySelector('#widget');let z=surface;for(let i=0;i<9;i++){const child=document.createElement('div');z.append(child);z=child;}z.append(document.createTextNode(''));const x=document.createElement('div');x.id='signal';x.append(document.createTextNode(''));z.append(x);window.clicks=0;document.querySelector('button').onclick=()=>{clicks++;document.querySelector('section').remove();x.firstChild.data='New obstruction';z.firstChild.data='Still blocking';};</script>`}));
 await page.goto(url);await expect.poll(()=>page.evaluate(()=>clicks)).toBe(1);
 await expect(page.locator('#widget')).toBeVisible();
 await expect.poll(async()=>(await records(worker)).some(r=>r.provider==='promotion'&&r.outcome==='unconfirmed')).toBe(true);
 expect(Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).reduce((n,s)=>n+(s.promotionsDismissed||0),0)).toBe(0);
});

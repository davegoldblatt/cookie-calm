import {test,expect} from './fixtures.js';

import {groupedNotice} from './helpers/grouped-notice.js';

async function visit(page,options={},url='https://grouped-consent.example/'){
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:groupedNotice(options)}));await page.goto(url);
 // The adapter diagnostic or its successful Save is the scanner witness.
}
const records=async worker=>Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).flatMap(x=>x.diagnostics||[]);

for(const on of [true,false])test(`grouped OneTrust denies exposed permissions from ${on?'on':'off'} without acceptance`,async({extension:{page,worker,settings}})=>{
 for(const [mode,url] of [['reject','https://www.popsci.com/'],['dismiss','https://other-publisher.example/']]){
  await settings({mode});await visit(page,{on},url);
  await expect.poll(()=>page.evaluate(()=>actions.includes('save'))).toBe(true);
  expect(await page.evaluate(()=>actions)).toEqual(on?['open','parent:false','save']:['open','save']);
  await expect(page.locator('#onetrust-pc-sdk')).toBeHidden();
  expect(await page.evaluate(()=>document.cookie)).toContain('test-choice=false');
  await expect.poll(async()=> (await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&x.outcome==='closed')).toBe(true);
  expect((await records(worker)).some(x=>x.outcome==='saved')).toBe(false);
 }
});

for(const [name,setup] of [
 ['unreviewed frame',`panel.querySelector('iframe').setAttribute('srcdoc','<input type=\"password\">');`],
 ['visible measurement frame',`panel.querySelector('iframe').style.top='0';`],
 ['unknown group',`document.querySelector('.ot-cat-grp').insertAdjacentHTML('beforeend','<div class="ot-cat-item" data-optanongroupid="unknown"><input type="checkbox" checked>Unknown tracking</div>');`],
 ['unknown hidden field',`panel.insertAdjacentHTML('beforeend','<input type="checkbox" hidden checked id="unknown">');`],
 ['duplicate ID',`document.body.insertAdjacentHTML('beforeend','<input id="ot-group-id-OSSTA_BG" type="checkbox">');`],
 ['active vendor list',`document.querySelector('#ot-pc-lst').style.display='block';`],
 ['ambiguous Save',`panel.append(document.querySelector('.save-preference-btn-handler').cloneNode(true));`]
])test(`unsupported grouped preferences stop before opening: ${name}`,async({extension:{page,worker,settings}})=>{
 await settings({mode:'dismiss'});await visit(page,{setup});
 await expect.poll(async()=> (await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&x.outcome==='unsupported')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual([]);
 await expect(page.locator('#onetrust-banner-sdk')).toBeVisible();
});

test('stuck hidden child stops before Save, with no hidden clicks or acceptance fallthrough',async({extension:{page,worker,settings}})=>{
 await settings({mode:'dismiss'});await visit(page,{stuck:true});
 await expect.poll(async()=> (await records(worker)).some(x=>x.reason==='inconsistent-preferences')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open','parent:false']);
 await expect(page.locator('#onetrust-pc-sdk')).toBeVisible();
 await expect(page.locator('.save-preference-btn-handler')).toBeEnabled();
});

test('new lazy child after opening stops before toggling or saving',async({extension:{page,worker}})=>{
 await visit(page,{afterOpen:`panel.querySelector('.ot-subgrps').insertAdjacentHTML('beforeend','<li class="ot-subgrp"><input type="checkbox" checked></li>');`});
 await expect.poll(async()=> (await records(worker)).some(x=>x.outcome==='unsupported')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open']);
});

for(const kind of ['openNoop','saveNoop'])test(`grouped OneTrust ${kind} remains unconfirmed`,async({extension:{page,worker}})=>{
 await visit(page,{[kind]:true});
 await expect.poll(async()=> (await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&x.outcome==='unconfirmed')).toBe(true);
 // Save has a provisional unconfirmed diagnostic before activation. Wait past
 // the runner's confirmation window before checking the terminal result.
 if(kind==='saveNoop')await page.waitForTimeout(2400);
 expect(await page.evaluate(()=>actions)).toEqual(kind==='openNoop'?['open']:['open','parent:false','save']);
 expect((await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&['closed','saved'].includes(x.outcome))).toBe(false);
});

test('user-opened preference center is preserved',async({extension:{page,settings,worker}})=>{
 await settings({enabled:false});await page.route('https://manual-consent.example/',r=>r.fulfill({contentType:'text/html',body:groupedNotice()}));await page.goto('https://manual-consent.example/');
 await page.locator('.zdcOpenPc').click();await settings({enabled:true});
 await expect.poll(async()=> (await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&x.outcome==='blocked')).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open']);
});

test('settings action can create the researched panel lazily',async({extension:{page,worker}})=>{
 await visit(page,{setup:'panel.remove();',afterOpen:'document.body.append(panel);'});
 await expect.poll(()=>page.evaluate(()=>actions.includes('save'))).toBe(true);
 expect(await page.evaluate(()=>actions)).toEqual(['open','parent:false','save']);
 await expect.poll(async()=> (await records(worker)).some(x=>x.provider==='onetrust-zd-group'&&x.outcome==='closed')).toBe(true);
});

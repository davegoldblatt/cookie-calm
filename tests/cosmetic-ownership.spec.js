import {build} from 'esbuild';
import {test,expect} from './fixtures.js';
const app=`<aside class="smartbanner smartbanner--ios" style="position:fixed;top:0;display:flex"><div class="smartbanner__info">Download our app from the App Store</div><a href="https://apps.apple.com/app/example/id12345">View</a></aside>`;
let code;
test.beforeAll(async()=>{code=(await build({stdin:{contents:"import {Promotions} from './src/promotions.js'; window.Promotions=Promotions",resolveDir:process.cwd()},bundle:true,write:false,format:'iife'})).outputFiles[0].text;});
async function harness(page,html=app){await page.goto('about:blank');await page.setContent(html);await page.addScriptTag({content:code});await page.evaluate(()=>{window.chrome ||= {};window.promotions=new Promotions({permits:()=>true,openedByUser:()=>false});});}

test('cosmetic authorization rejects changed, missing, and spoofed store destinations',async({page})=>{
 for(const href of ['', 'https://apps.apple.com@evil.example/app/id12345','https://apps.apple.com.evil.example/app/id12345','http://apps.apple.com/app/id12345','https://evil.example/?to=apps.apple.com/app/id12345','https://play.google.com/not-an-app','https://example.org/payment']){
  await harness(page);
  const result=await page.evaluate(href=>{const choice=promotions.find([document]);const a=document.querySelector('a');if(href)a.href=href;else a.remove();return {selected:!!choice,acted:promotions.act(choice),total:promotions.total};},href);
  expect(result).toEqual({selected:true,acted:false,total:0});await expect(page.locator('aside')).toBeVisible();
 }
});

test('cosmetic ownership survives detach/reattach and never overwrites website styles',async({page})=>{
 await harness(page);
 await page.evaluate(()=>{window.element=document.querySelector('aside');const choice=promotions.find([document]);promotions.act(choice);promotions.succeeded(choice);choice.completion.dispose();element.remove();promotions.find([document]);element.style.display='grid';promotions.restore();document.body.append(element);});
 await expect(page.locator('aside')).toBeVisible();
 expect(await page.locator('aside').evaluate(e=>e.style.display)).toBe('grid');
 expect(await page.evaluate(()=>promotions.total)).toBe(1);
});

test('pause and restore do not refund cosmetic attempt budgets',async({page})=>{
 await harness(page);
 const totals=await page.evaluate(()=>{const values=[];for(let i=0;i<3;i++){const choice=promotions.find([document]);if(choice){promotions.act(choice);promotions.succeeded(choice);choice.completion.dispose();}values.push({acted:!!choice,total:promotions.total});promotions.restore();}return values;});
 expect(totals).toEqual([{acted:true,total:1},{acted:true,total:2},{acted:false,total:2}]);
});

test('a website important display rule prevents a false cosmetic success',async({page})=>{
 await harness(page,app.replace('display:flex','display:flex!important'));
 expect(await page.evaluate(()=>{const choice=promotions.find([document]);const acted=promotions.act(choice);choice.completion?.dispose();return acted;})).toBe(false);
 await expect(page.locator('aside')).toBeVisible();
});

test('actual extension releases a detached app banner on pause and keeps the lifetime cap',async({extension:{page,settings,worker}})=>{
 const url='https://app-ownership.example/';await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><main><h1>Article</h1></main>'+app}));await page.goto(url);
 await expect(page.locator('aside')).toBeHidden();
 await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.promotionsDismissed===1))).toBe(true);
 await page.evaluate(()=>{window.detached=document.querySelector('aside');detached.remove();});await settings({enabled:false});await page.waitForTimeout(300);
 await page.evaluate(()=>document.body.append(detached));await expect(page.locator('aside')).toBeVisible();
 // Displayed counts reset on settings changes; document action budgets do not.
 await settings({enabled:true});await expect(page.locator('aside')).toBeHidden();
 await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.promotionsDismissed===1))).toBe(true);
 await settings({enabled:false});await expect(page.locator('aside')).toBeVisible();await settings({enabled:true});await page.waitForTimeout(1000);await expect(page.locator('aside')).toBeVisible();
});

test('a hidden app element is released if the site repurposes it',async({page})=>{
 await harness(page);await page.evaluate(()=>{const choice=promotions.find([document]);promotions.act(choice);choice.completion.dispose();});
 await expect(page.locator('aside')).toBeHidden();
 await page.locator('aside').evaluate(e=>{e.innerHTML='<form><input type="password">Account settings</form>';});
 await expect(page.locator('aside')).toBeVisible();
 expect(await page.evaluate(()=>promotions.find([document]))).toBeNull();
});

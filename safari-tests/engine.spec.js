import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const bundle = await readFile('build/safari/content.js','utf8');
const cookie = `<section id="cookie-banner" role="dialog"><p>We use cookies.</p><button onclick="window.choices.push('reject');this.parentNode.remove()">Reject all</button><button onclick="window.choices.push('accept');this.parentNode.remove()">Accept all</button></section>`;
const newsletter = `<section class="newsletter-popup" role="dialog"><h2>Subscribe to our newsletter</h2><button onclick="window.choices.push('newsletter');this.parentNode.remove()">No thanks</button></section>`;
async function load(page, body, closedRootAPI = true) {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://safari-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>section{position:fixed;bottom:10px;background:white;padding:20px}button{padding:10px}</style><main><h1>Article</h1></main><script>window.choices=[]</script>${body}`}));
  await page.addInitScript(closedRootAPI=>{
    // This bridge exposes ordinary open roots only. It does not prove Safari's
    // privileged closed-root API or any other native extension integration.
    window.outcomes=[];
    window.chrome={dom:closedRootAPI?{openOrClosedShadowRoot:element=>element.shadowRoot}:undefined,
      runtime:{id:'safari-test-bridge',getManifest:()=>({browser_specific_settings:{safari:{strict_min_version:'26.0'}}}),onMessage:{addListener(){}},sendMessage:async request=>{
      if(request.type==='bootstrap')return {host:location.hostname,settings:{enabled:true,mode:'reject',disabledSites:[]},promotionAllowed:true,rules:{}};
      if(request.type==='guard')return {...request.local};
      if(request.type==='presentation-css')return {ok:false};
      outcomes.push(request);return {ok:true};
    }},storage:{onChanged:{addListener(){}}}};
  },closedRootAPI);
  await page.goto('https://safari-fixture.test/article');
  await page.addScriptTag({content:bundle});
  return errors;
}

test('Safari-target bundle rejects cookies and dismisses newsletter through native controls',async({page})=>{
  const errors=await load(page,cookie+newsletter);
  await expect.poll(()=>page.evaluate(()=>choices.slice().sort())).toEqual(['newsletter','reject']);
  await expect(page.locator('main')).toHaveText('Article');
  await expect.poll(()=>page.evaluate(()=>outcomes.some(result=>result.type==='promotion-dismissed'))).toBe(true);
  expect(errors).toEqual([]);
});

test('Safari build stops automatic actions when closed-root inspection is unavailable',async({page})=>{
  const errors=await load(page,cookie+newsletter,false);
  await expect.poll(()=>page.evaluate(()=>outcomes.find(result=>result.status==='blocked')?.reason)).toBe('This Safari version lacks required page inspection. Use Safari 26 or later.');
  await page.waitForTimeout(2200);
  expect(await page.evaluate(()=>choices)).toEqual([]);
  await expect(page.locator('#cookie-banner')).toBeVisible();
  await expect(page.locator('.newsletter-popup')).toBeVisible();
  expect(errors).toEqual([]);
});
test('Default mode leaves an accept-only banner visible while another prompt proves scanning',async({page})=>{
  const errors=await load(page,cookie.replace(/<button onclick="window.choices.push\('reject'\).*?<\/button>/,'')+newsletter);
  await expect.poll(()=>page.evaluate(()=>choices)).toEqual(['newsletter']);
  await page.waitForTimeout(2200);
  await expect(page.locator('#cookie-banner')).toBeVisible();
  expect(await page.evaluate(()=>choices)).toEqual(['newsletter']);
  expect(errors).toEqual([]);
});
test('Answered rating survey stays visible; cookie rejection proves the scanner ran',async({page})=>{
  const errors=await load(page,cookie+`<section class="survey-popup" role="dialog"><h2>Help us make our website better!</h2><p>Overall, how well did our website meet your needs today?</p>${[1,2,3,4,5,6,7].map(n=>`<button ${n===3?'aria-pressed="true"':''}>${n}</button>`).join('')}<button onclick="choices.push('survey');this.parentNode.remove()">Close</button></section>`);
  await expect.poll(()=>page.evaluate(()=>choices)).toEqual(['reject']);
  await page.waitForTimeout(2200);
  await expect(page.locator('.survey-popup')).toBeVisible();
  expect(await page.evaluate(()=>choices)).toEqual(['reject']);
  expect(errors).toEqual([]);
});
test('Delayed survey is dismissed without selecting a rating',async({page})=>{
  const errors=await load(page,cookie);
  await expect.poll(()=>page.evaluate(()=>choices)).toEqual(['reject']);
  await page.evaluate(()=>{
    const section=document.createElement('section');section.className='survey-popup';
    section.innerHTML='<h2>Help us make our website better!</h2><p>Overall, how well did our website meet your needs today?</p>'+[1,2,3,4,5,6,7].map(n=>`<button onclick="choices.push('rating')">${n}</button>`).join('')+'<button onclick="choices.push(\'survey\');this.parentNode.remove()">Close</button>';
    document.body.append(section);
  });
  await expect.poll(()=>page.evaluate(()=>choices)).toEqual(['reject','survey']);
  expect(errors).toEqual([]);
});
test('Open shadow DOM cookie rejection works in WebKit',async({page})=>{
  const errors=await load(page,`<div id="host"></div>`);
  await page.evaluate(markup=>document.querySelector('#host').attachShadow({mode:'open'}).innerHTML=markup,cookie);
  await expect.poll(()=>page.evaluate(()=>choices)).toEqual(['reject']);
  expect(errors).toEqual([]);
});

test('Safari popup explains website access when the tab URL is unavailable',async({page})=>{
  const markup=await readFile('build/safari/popup.html','utf8');
  await page.setContent(markup.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,''));
  await page.evaluate(()=>{
    window.chrome={runtime:{getManifest:()=>({version:'1.2.5',browser_specific_settings:{safari:{strict_min_version:'26.0'}}})},
      tabs:{query:async()=>[{id:1}]},storage:{local:{get:async()=>({})},session:{get:async()=>({})},onChanged:{addListener(){}}}};
  });
  await page.addScriptTag({content:await readFile('build/safari/popup.js','utf8')});
  await expect(page.locator('#status')).toHaveText('Open a website and allow website access in Safari’s extension settings.');
  await expect(page.locator('#enabled')).toBeChecked();
  await expect(page.locator('#pause')).toBeDisabled();
});

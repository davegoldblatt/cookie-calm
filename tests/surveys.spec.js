import {test,expect} from './fixtures.js';

const ratings=()=>Array.from({length:7},(_,i)=>`<button class="survey-rating-btn">${i+1}</button>`).join('');
const survey=(close='Close',named=true)=>`<div class="${named?'survey-popup':'x93'}" data-survey style="position:fixed;right:20px;bottom:20px;background:white;padding:20px"><div class="survey-header"><p><b>Help us make our website better!</b></p><button type="button" aria-label="${close}" data-close><svg></svg></button></div><p class="survey-title">Overall, how well did Epoch's website meet your needs today?</p><div class="survey-content"><div class="survey-rating"><div class="survey-rating-buttons">${ratings()}</div><div class="survey-rating-labels"><span>Not at all</span><span>Completely</span></div></div></div><div class="survey-footer">Question 1 of 3</div></div>`;
const witness='<section id="cookie-banner" style="position:fixed;left:0;top:0"><p>We use cookies</p><button id="reject" onclick="this.parentElement.remove();window.rejected=true">Reject all</button></section>';
const promotionWitness='<div class="promo" style="position:fixed;left:20px;bottom:20px"><h2>Get our newsletter</h2><button type="button" onclick="this.parentElement.remove();window.promotionWitness=true">No thanks</button></div>';
async function visit(page,body,{host='survey-a.example',script='',expectPromotions=true}={}){
  await page.route(`https://${host}/**`,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><main><h1>Article</h1><p id="article">Keep this article</p></main>${witness}${promotionWitness}${body}<script>window.actions=[];document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close){e.preventDefault();actions.push('close');close.closest('[data-survey]').remove()}else if(e.target.closest('.survey-rating-btn'))actions.push('answer')});${script}</script>`}));
  await page.goto(`https://${host}/read`);await expect.poll(()=>page.evaluate(()=>window.rejected)).toBe(true);
  if(expectPromotions)await expect.poll(()=>page.evaluate(()=>window.promotionWitness)).toBe(true);
}
const count=worker=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).reduce((n,s)=>n+(s.diagnostics?.filter(r=>r.category==='survey' && r.outcome==='closed').length||0),0));

for(const [host,named,copy] of [['survey-a.example',true,'original'],['survey-b.example',false,'Help us improve\nour site']])test(`recognizes rating surveys on ${host}`,async({extension:{page,worker}})=>{
  const html=copy==='original'?survey():survey('Close',named).replace('<div class="survey-header">','<header>').replace('</button></div><p class="survey-title">','</button></header><p class="survey-title">').replace('Help us make our website better!',copy).replace("Overall, how well did Epoch's website meet your needs today?",'How satisfied are you with our website?');
  await visit(page,html,{host});await expect(page.locator('[data-survey]')).toHaveCount(0);await expect.poll(()=>count(worker)).toBe(1);expect(await page.evaluate(()=>actions)).toEqual(['close']);await expect(page.locator('#article')).toBeVisible();
});
test('reviewed Epoch first screen closes without selecting a response',async({extension:{page,worker}})=>{
  await visit(page,survey('Close cookie popup'),{host:'epoch.ai'});await expect(page.locator('[data-survey]')).toHaveCount(0);await expect.poll(()=>count(worker)).toBe(1);expect(await page.evaluate(()=>actions)).toEqual(['close']);
});
test('misleading cookie labels require the reviewed host and unchanged first-screen contract',async({extension:{page,worker}})=>{
  test.setTimeout(60000);
  for(const [host,html] of [
    ['other.example',survey('Close cookie popup')],
    ['epoch.ai',survey('Close cookie popup').replace('Question 1 of 3','Question 2 of 3')],
    ['epoch.ai',survey('Close cookie popup').replace('</b>','</b><button>Accept all</button>')],
    ['epoch.ai',survey('Close cookie popup').replace('</b>','</b><span hidden>Closing means you agree to tracking</span>')],
    ['epoch.ai',survey('Close cookie popup').replace('data-close','id="onetrust-accept-btn-handler" data-close')],
    ['epoch.ai',survey('Close cookie popup').replace('data-close','disabled data-close')],
    ['epoch.ai',survey('Close cookie popup').replace('position:fixed','position:sticky')],
    ['epoch.ai',survey('Close cookie popup').replace('</b>','</b><button aria-label="Close"></button>')],
    ['epoch.ai',survey('Close cookie popup').replace('survey-popup','other-popup')],
    ['epoch.ai',survey('Close cookie popup').replace('Help us make our website better!','Help us improve our website')],
    ['epoch.ai','<style>.survey-popup::before{content:"Closing means agreement"}</style>'+survey('Close cookie popup')],
    ['epoch.ai',survey('Close cookie popup').replace('</b>','</b><input>')],
    ['epoch.ai',survey('Close cookie popup').replace('</b>','</b><div role="switch" aria-label="tracking"></div>')],
    ['epoch.ai',survey('Close cookie popup').replace(ratings(),'<label><input type="radio">An answer</label>').replace('Question 1 of 3','Question 3 of 3')]
  ]) {await visit(page,html,{host});await page.waitForTimeout(900);await expect(page.locator('[data-survey]')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);expect(await count(worker)).toBe(0);}
});
test('independent invitation and question and rating controls are required',async({extension:{page}})=>{
  for(const html of [
    survey().replace('Help us make our website better!','Article navigation'),
    survey().replace("Overall, how well did Epoch's website meet your needs today?",'Choose a page to read'),
    survey().replace(ratings(),'<button>More</button>'),
    survey().replace('<p><b>','<button><b>').replace('</b></p>','</b></button>'),
    survey().replace('position:fixed','position:static'),
    survey().replace('</b>','</b>We use cookies')
  ]) {await visit(page,html,{expectPromotions:!html.includes('type="password"')});await page.waitForTimeout(900);expect(await page.evaluate(()=>actions)).toEqual([]);}
});
test('survey controls never submit forms, navigate, or close protected or answered forms',async({extension:{page}})=>{
  for(const html of [
    survey().replace('<button type="button" aria-label="Close" data-close><svg></svg></button>','<form><button aria-label="Close" data-close></button></form>'),
    survey().replace('<button type="button" aria-label="Close" data-close><svg></svg></button>','<a href="/submit" aria-label="Close" data-close>×</a>'),
    survey().replace('</b>','</b><input type="password">'),
    survey().replace('</b>','</b><textarea>Already written</textarea>'),
    survey().replace('</b>','</b><input type="range" value="5">'),
    survey().replace('</b>','</b><div contenteditable>Already written</div>'),
    survey().replace('</b>','</b><input type="hidden" value="saved-answer">'),
    survey().replace('class="survey-rating-btn"','aria-pressed="true" class="survey-rating-btn"')
  ]) {await visit(page,html,{expectPromotions:!html.includes('type="password"')});await page.waitForTimeout(900);expect(await page.evaluate(()=>actions)).toEqual([]);}
});
test('survey opened indirectly stays open after delayed mount and replacement',async({extension:{page}})=>{
  await visit(page,'<button id="open">More</button><div id="mount"></div>',{script:`document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(survey())},2100)`});
  await page.locator('#open').click();await page.waitForTimeout(4000);await expect(page.locator('[data-survey]')).toBeVisible();await page.evaluate(()=>{const s=document.querySelector('[data-survey]');s.replaceWith(s.cloneNode(true))});await page.waitForTimeout(8000);expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('a user rating preserves the survey even after the first screen is replaced',async({extension:{page,settings}})=>{
  await settings({enabled:false});
  await page.route('https://started.example/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html>${witness}${promotionWitness}${survey()}<script>window.actions=[];document.querySelector('[data-close]').onclick=()=>{actions.push('close')};document.querySelector('.survey-rating-btn').onclick=()=>{actions.push('answer');const s=document.querySelector('[data-survey]');s.replaceWith(s.cloneNode(true));document.querySelector('[data-close]').onclick=()=>actions.push('close')}</script>`}));
  await page.goto('https://started.example/');await page.locator('.survey-rating-btn').first().click();await settings({enabled:true});await expect.poll(()=>page.evaluate(()=>window.promotionWitness)).toBe(true);await page.waitForTimeout(11500);expect(await page.evaluate(()=>actions)).toEqual(['answer']);
});

test('reviewed Epoch survey opened by a user stays open',async({extension:{page}})=>{
  await visit(page,'<button id="open">More</button><div id="mount"></div>',{host:'epoch.ai',script:`document.querySelector('#open').onclick=()=>setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(survey('Close cookie popup'))},2100)`});
  await page.locator('#open').click();await page.waitForTimeout(11500);await expect(page.locator('[data-survey]')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
});
test('reviewed no-op closure gets one attempt and no success credit',async({extension:{page,worker}})=>{
  await visit(page,survey('Close cookie popup'),{host:'epoch.ai',script:`document.querySelector('[data-close]').addEventListener('click',e=>{e.stopPropagation();actions.push('noop')})`});
  await page.waitForTimeout(6500);expect(await page.evaluate(()=>actions)).toEqual(['noop']);expect(await count(worker)).toBe(0);await expect(page.locator('[data-survey]')).toBeVisible();
});
test('a self-removing thank-you screen gets no automatic action or credit',async({extension:{page,worker}})=>{
  const html=survey('Close cookie popup').replace(/<p class="survey-title">[\s\S]*<div class="survey-footer">Question 1 of 3<\/div>/,'<div class="survey-content">Thank you for your feedback.</div>');
  await visit(page,html,{host:'epoch.ai',script:`setTimeout(()=>document.querySelector('[data-survey]')?.remove(),1600)`});
  await page.waitForTimeout(2300);expect(await page.evaluate(()=>actions)).toEqual([]);expect(await count(worker)).toBe(0);
});
test('an unsolicited rating survey is found when it mounts later',async({extension:{page,worker}})=>{
  await visit(page,'<div id="mount"></div>',{script:`setTimeout(()=>document.querySelector('#mount').innerHTML=${JSON.stringify(survey())},2400)`});
  await expect.poll(()=>count(worker),{timeout:7000}).toBe(1);expect(await page.evaluate(()=>actions)).toEqual(['close']);
});

test('ordinary fixed page headers do not become survey prompts',async({extension:{page}})=>{
  const html='<header style="position:fixed;top:0"><nav><a href="/feedback">Help us improve our website</a></nav><button data-close aria-label="Close"></button></header><main><h2>How satisfied are you with our website?</h2>'+ratings()+'</main>';
  await visit(page,html);await page.waitForTimeout(1200);expect(await page.evaluate(()=>actions)).toEqual([]);await expect(page.locator('header')).toBeVisible();
});

test('structural discovery never dismisses an application shell around article or navigation content',async({extension:{page}})=>{
  for(const content of ['<main><p>Keep the article.</p></main>','<nav><a href="/read">Read</a></nav>']){
    await visit(page,'<div style="position:fixed;top:0;left:400px"><header><b>Take our short survey</b><button data-close aria-label="Close"></button></header>'+content+'</div>');
    await page.waitForTimeout(1200);expect(await page.evaluate(()=>actions)).toEqual([]);await expect(page.locator('header')).toBeVisible();
  }
});

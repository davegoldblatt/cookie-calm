import {test, expect} from './fixtures.js';

const frameURL = 'https://cdn.privacy-mgmt.com/us_pm/index.html';
const optOut = 'Do not sell or share my personal information / opt out of targeted advertising (if you select On you are asking us not to sell or share your personal information and are opting out of targeted advertising)';
const manager = ({on=false,stuck=false,unknown=false,disabled=false,hidden=false,extra=false,noSave=false,removeSave=false,sibling=false,legacy=false,delay=0}={}) => `<!doctype html><title>Privacy Manager US App</title><style>button{padding:15px}.message{background:white;padding:20px}</style><div class="message-container"><div class="message type-modal"><h1>Privacy Manager</h1><p>We share personal information collected through cookies for targeted advertising.</p><button type="button" class="pm-toggle" role="switch" aria-checked="${on}" aria-label="${unknown?'Personalized offers':optOut}" ${disabled?'disabled':''} ${hidden?'hidden':''}><span class="off">Off</span><span class="on">On</span></button>${extra?'<input type="checkbox" checked aria-label="Another purpose">':''}<button type="button" class="message-button sp_choice_type_2">Cancel</button><button class="message-button sp_choice_type_SE" aria-label="Save and Close">Save and Close</button></div></div>${sibling?'<div hidden role="switch" aria-checked="true">Another purpose</div>':''}${legacy?'<button class="sp_choice_type_SAVE_AND_EXIT">Save choices</button><section role="dialog"><p>Cookie consent choices</p><button>Accept all</button><button>Reject all</button></section>':''}<script>
window.actions=[];window.saved=null;window.allClicks=[];document.addEventListener('click',e=>allClicks.push((e.target.getAttribute('aria-label')||e.target.innerText).trim()),true);
document.querySelector('.pm-toggle .on').onclick=e=>{actions.push('toggle');${stuck?'':`setTimeout(()=>e.target.parentElement.setAttribute('aria-checked','true'),${delay});`}};
document.querySelector('.sp_choice_type_SE').onclick=()=>{actions.push('save');saved=document.querySelector('.pm-toggle').getAttribute('aria-checked');${removeSave?"document.querySelector('.sp_choice_type_SE').remove();":noSave?'':"document.querySelector('.message-container').remove();parent.postMessage('saved','*');"}};
</script>`;
async function visit(page, options={}, host='publisher.example', frameURLOverride=frameURL) {
  await page.route(frameURLOverride, r=>r.fulfill({contentType:'text/html',body:manager(options)}));
  await page.route(`https://${host}/`,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><h1>${options.scam?'Your computer is infected':'An article to read'}</h1><iframe width="1000" height="700" src="${frameURLOverride}"></iframe><script>addEventListener('message',e=>{if(e.data==='saved')document.documentElement.dataset.saved='true'})</script>`}));
  await page.goto(`https://${host}/`);
  return page.frameLocator('iframe');
}

test('Sourcepoint US turns opt-out ON before saving across publisher hosts and cookie modes',async({extension:{page,settings}})=>{
  for(const [mode,host] of [['reject','publisher.example'],['dismiss','another-publisher.example']]) {
    await settings({mode});
    const frame=await visit(page,{},host);
    await expect(page.locator('html')).toHaveAttribute('data-saved','true');
    expect(await frame.locator('body').evaluate(()=>({actions,saved}))).toEqual({actions:['toggle','save'],saved:'true'});
  }
});
test('Sourcepoint US keeps an existing opt-out and waits for asynchronous state changes',async({extension:{page}})=>{
  for(const options of [{on:true},{delay:600}]){
    const frame=await visit(page,options);
    await expect(page.locator('html')).toHaveAttribute('data-saved','true');
    expect(await frame.locator('body').evaluate(()=>({actions,saved}))).toEqual({actions:options.on?['save']:['toggle','save'],saved:'true'});
  }
});
test('Sourcepoint US refuses stuck, unknown, inaccessible or additional preference controls',async({extension:{page}})=>{
  for(const options of [{stuck:true},{unknown:true},{disabled:true},{hidden:true},{extra:true}]){
    const frame=await visit(page,options);await page.waitForTimeout(2400);
    expect(await frame.locator('body').evaluate(()=>saved)).toBeNull();
    expect(await frame.locator('body').evaluate(()=>actions)).toEqual(options.stuck?['toggle']:[]);
  }
});
test('Sourcepoint US inherits parent scam and site-pause checks',async({extension:{page,settings}})=>{
  let frame=await visit(page,{scam:true});await page.waitForTimeout(1600);
  expect(await frame.locator('body').evaluate(()=>actions)).toEqual([]);
  await settings({disabledSites:['publisher.example']});frame=await visit(page);await page.waitForTimeout(1600);
  expect(await frame.locator('body').evaluate(()=>actions)).toEqual([]);
  await settings({disabledSites:[]});await expect(page.locator('html')).toHaveAttribute('data-saved','true');
});
test('Sourcepoint US cancellation during a pending toggle prevents saving',async({extension:{page,settings}})=>{
  const frame=await visit(page,{delay:1000});
  await expect.poll(()=>frame.locator('body').evaluate(()=>actions)).toEqual(['toggle']);
  await settings({enabled:false});await page.waitForTimeout(1800);
  expect(await frame.locator('body').evaluate(()=>saved)).toBeNull();
});
test('Sourcepoint US does not report a no-op save as dismissal or repeat it',async({extension:{page,worker}})=>{
  const frame=await visit(page,{noSave:true});
  await expect.poll(()=>frame.locator('body').evaluate(()=>actions)).toEqual(['toggle','save']);
  await page.waitForTimeout(3000);
  expect(await frame.locator('body').evaluate(()=>actions)).toEqual(['toggle','save']);
  const statuses=await worker.evaluate(()=>chrome.storage.session.get(null));
  expect(Object.values(statuses).some(s=>s.status==='dismissed')).toBe(false);
});
test('Sourcepoint US markup on an unrelated origin is not treated as the provider',async({extension:{page}})=>{
  await page.route('https://unrelated.example/',r=>r.fulfill({contentType:'text/html',body:manager()}));
  await page.goto('https://unrelated.example/');await page.waitForTimeout(2200);
  expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('Sourcepoint US does not claim dismissal when only the save button disappears',async({extension:{page,worker}})=>{
  const frame=await visit(page,{removeSave:true});
  await expect.poll(()=>frame.locator('body').evaluate(()=>actions)).toEqual(['toggle','save']);
  await page.waitForTimeout(1600);
  await expect(frame.locator('.message.type-modal')).toBeVisible();
  const statuses=await worker.evaluate(()=>chrome.storage.session.get(null));
  expect(Object.values(statuses).some(s=>s.status==='dismissed')).toBe(false);
});

test('Sourcepoint US refusal owns the frame beyond later scans and rejects hidden sibling preferences',async({extension:{page,settings}})=>{
  await settings({mode:'dismiss'});
  for(const options of [{unknown:true,legacy:true},{sibling:true},{unknown:true,legacy:true,notice:true}]){
    const frame=await visit(page,options,'publisher.example',options.notice?frameURL+'?is_usnat_notice=true':frameURL);await page.waitForTimeout(6500);
    expect(await frame.locator('body').evaluate(()=>allClicks)).toEqual([]);
    expect(await frame.locator('body').evaluate(()=>saved)).toBeNull();
  }
});
test('Sourcepoint US checks iframe origin and path independently',async({extension:{page}})=>{
  for(const url of ['https://not-sourcepoint.example/us_pm/index.html','https://cdn.privacy-mgmt.com/privacy-manager/index.html']){
    const frame=await visit(page,{},'publisher.example',url);await page.waitForTimeout(1800);
    expect(await frame.locator('body').evaluate(()=>allClicks)).toEqual([]);
  }
  await page.route(frameURL,r=>r.fulfill({contentType:'text/html',body:manager()}));
  await page.goto(frameURL);await page.waitForTimeout(1800);expect(await page.evaluate(()=>allClicks)).toEqual([]);
});

test('Sourcepoint US notice opens its separate manager and completes opt-out',async({extension:{page}})=>{
  const noticeURL=frameURL+'?is_usnat_notice=true';
  await page.route(frameURL,r=>r.fulfill({contentType:'text/html',body:manager()}));
  await page.route(noticeURL,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><div class="message-container"><p>Privacy options for cookies</p><button class="message-button" onclick="parent.postMessage('options','*')">Options</button></div>`}));
  await page.route('https://notice-publisher.example/',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><h1>Article</h1><iframe width="1000" height="700" src="${noticeURL}"></iframe><script>addEventListener('message',e=>{if(e.data==='options')document.querySelector('iframe').src='${frameURL}';if(e.data==='saved')document.documentElement.dataset.saved='true'})</script>`}));
  await page.goto('https://notice-publisher.example/');
  await expect(page.locator('html')).toHaveAttribute('data-saved','true');
  expect(await page.frameLocator('iframe').locator('body').evaluate(()=>({actions,saved}))).toEqual({actions:['toggle','save'],saved:'true'});
});

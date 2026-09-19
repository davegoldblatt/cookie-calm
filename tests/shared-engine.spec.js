import {test,expect} from './fixtures.js';

const visit=async(page,html,url='https://unfamiliar-publisher.example/')=>{
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'+html}));
  await page.goto(url);
};
const prompt=(text,extra='',control='<button aria-labelledby="close-name"><span aria-hidden="true">—</span></button><span id="close-name" hidden>Close</span>')=>`
<h1>Article</h1><div id="x83" style="position:fixed;inset:30px;background:white"><h2>${text}</h2>${extra}${control}</div>
<script>window.actions=[];document.addEventListener('click',e=>{actions.push(e.target.closest('button')?.textContent);if(e.target.closest('button'))document.querySelector('#x83').remove()})</script>`;

test('structural discovery dismisses unknown newsletter and registration layouts through shared actions',async({extension:{page,worker}})=>{
  for(const [text,extra] of [['Get our newsletter in your inbox',''],['Sign in to continue reading for free','<a href="/login">Sign in with email</a>']]){
    await visit(page,prompt(text,extra));
    await expect(page.locator('#x83')).toHaveCount(0);
    await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.diagnostics?.some(r=>r.provider==='promotion'&&r.outcome==='closed')))).toBe(true);
  }
});
test('structural discovery catches a late unnamed overlay and preserves article content',async({extension:{page}})=>{
  await visit(page,`<article><h1>Newsletter design tips</h1><p id="article">Keep this article.</p><button>Close</button></article><script>setTimeout(()=>{const d=document.createElement('div');d.style='position:fixed;inset:30px';d.innerHTML='<h2>Get our newsletter</h2><button title="Close"></button>';d.querySelector('button').onclick=()=>d.remove();document.body.append(d)},1800)</script>`);
  await page.waitForTimeout(2800);
  await expect(page.locator('body > div')).toHaveCount(0);
  await expect(page.locator('#article')).toBeVisible();
});
test('structural discovery leaves protected flows and non-promotional overlays untouched',async({extension:{page}})=>{
  for(const [text,extra] of [
    ['Sign in to continue reading for free','<input type="password">'],
    ['Your session expired. Sign in to continue reading for free','<a href="/login">Sign in</a>'],
    ['Checkout: subscribe for updates','<input autocomplete="cc-number">'],
    ['Navigation','<a href="/newsletter">Newsletter</a>'],
    ['Chat with us','<textarea>My existing question</textarea>']
  ]){
    await visit(page,prompt(text,extra));await page.waitForTimeout(1200);
    await expect(page.locator('#x83')).toBeVisible();expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});

const bot=({stuck=false,add=false,revert=false,saveNoop=false,replace=false}={})=>`
<section id="CybotCookiebotDialog" role="dialog"><h2>Cookie settings</h2>
<label><input id="essential" type="checkbox" checked disabled>Essential</label>
<label><input id="CybotCookiebotDialogBodyLevelButtonStatistics" type="checkbox" checked>Analytics</label>
<button id="CybotCookiebotDialogBodyButtonAcceptSelected">Save choices</button><button id="accept">Accept all</button></section>
<script>window.actions=[];window.saved=null;document.addEventListener('click',e=>actions.push(e.target.id),true);
const box=document.querySelector('#CybotCookiebotDialogBodyLevelButtonStatistics');
box.onchange=()=>{${stuck?'box.checked=true;':''}${add?"const x=document.createElement('input');x.type='checkbox';x.checked=true;document.querySelector('section').append(x);":''}${revert?'queueMicrotask(()=>box.checked=true);':''}${replace?"box.replaceWith(box.cloneNode());":''}};
document.querySelector('#CybotCookiebotDialogBodyButtonAcceptSelected').onclick=()=>{saved=document.querySelector('#CybotCookiebotDialogBodyLevelButtonStatistics').checked;${saveNoop?'':"document.querySelector('section').remove();"}};
</script>`;
test('shared consent engine refuses changed preference sets and never falls back to acceptance',async({extension:{page,settings}})=>{
  await settings({mode:'dismiss'});
  for(const options of [{stuck:true},{add:true},{revert:true}]){
    await visit(page,bot(options));await page.waitForTimeout(2700);
    expect(await page.evaluate(()=>saved)).toBeNull();
    expect(await page.evaluate(()=>actions)).not.toContain('accept');
    expect(await page.evaluate(()=>actions.filter(a=>a==='CybotCookiebotDialogBodyLevelButtonStatistics').length)).toBe(1);
  }
});
test('shared consent engine re-observes replacement controls and distinguishes closed from saved',async({extension:{page,worker}})=>{
  await visit(page,bot({replace:true}));
  await expect(page.locator('section')).toHaveCount(0);expect(await page.evaluate(()=>saved)).toBe(false);
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.consentOutcome==='closed'))).toBe(true);
});
test('a failed toggle cannot be repeated by unrelated setting changes or route changes',async({extension:{page,settings}})=>{
  await visit(page,bot({stuck:true}));await page.waitForTimeout(2300);
  await settings({mode:'dismiss'});await page.evaluate(()=>history.replaceState({},'', '/another-article'));
  await page.waitForTimeout(2300);
  expect(await page.evaluate(()=>actions)).toEqual(['CybotCookiebotDialogBodyLevelButtonStatistics']);
});
test('local diagnostics distinguish an unconfirmed save and exclude page text and URL queries',async({extension:{page,worker}})=>{
  await visit(page,bot({saveNoop:true})+'<p>private-canary-text</p>','https://unfamiliar-publisher.example/?private=canary');
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.consentOutcome==='unconfirmed'))).toBe(true);
  await page.waitForTimeout(2600);
  const state=await worker.evaluate(()=>chrome.storage.session.get(null));
  expect(JSON.stringify(state)).not.toContain('canary');
  expect(Object.values(state).some(s=>s.diagnostics?.some(r=>r.reason==='save-unconfirmed'))).toBe(true);
});

const sourcepointURL='https://cdn.privacy-mgmt.com/us_pm/index.html?site_id=12345';
async function receiptPage(page,{allow=false,write=false,delay=100,scamAfter=false}={}) {
  await page.route(sourcepointURL,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><div class="message-container"><div class="message type-modal"><h1>Privacy Manager</h1><button type="button" class="pm-toggle" role="switch" aria-checked="false" aria-label="Do not sell or share my personal information"><span class="on">On</span></button><button class="sp_choice_type_SE">Save and Close</button></div></div><script>document.querySelector('.on').onclick=()=>{document.querySelector('.pm-toggle').setAttribute('aria-checked','true');${scamAfter?"parent.postMessage('scam','*');":''}};document.querySelector('.sp_choice_type_SE').onclick=()=>parent.postMessage('saved','*')</script>`}));
  await visit(page,`<h1>Article</h1><iframe width="900" height="600" src="${sourcepointURL}"></iframe><script>window.saved=false;addEventListener('message',e=>{if(e.data==='scam')document.querySelector('h1').textContent='Your computer is infected';if(e.data==='saved'){saved=true;document.querySelector('iframe').remove();${write?`setTimeout(()=>localStorage.setItem('_sp_user_consent_12345',JSON.stringify({usnat:{consentStatus:{hasConsentData:true,rejectedAny:${!allow},consentedToAll:${allow},granularStatus:{sellStatus:${allow},shareStatus:${allow}}}}})),${delay});`:''}}})</script>`);
}
test('top document verifies Sourcepoint opt-out after the provider frame disappears',async({extension:{page,worker}})=>{
  await receiptPage(page,{write:true});await expect(page.locator('iframe')).toHaveCount(0);
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.consentOutcome==='saved'))).toBe(true);
});
test('missing or accepted receipts never prove saved opt-out',async({extension:{page,worker}})=>{
  for(const options of [{write:false},{write:true,allow:true}]){
    await page.goto('about:blank');await page.context().clearCookies();
    await receiptPage(page,options);await expect(page.locator('iframe')).toHaveCount(0);await page.waitForTimeout(1300);
    const state=await worker.evaluate(()=>chrome.storage.session.get(null));
    expect(Object.values(state).some(s=>s.consentOutcome==='saved')).toBe(false);
  }
});
test('pause cancels a pending receipt verifier',async({extension:{page,settings,worker}})=>{
  await receiptPage(page,{write:true,delay:1800});await expect(page.locator('iframe')).toHaveCount(0);
  await settings({enabled:false});await page.waitForTimeout(250);await settings({enabled:true});await page.waitForTimeout(2200);
  expect(Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).some(s=>s.consentOutcome==='saved')).toBe(false);
});
test('a parent scam signal appearing after a toggle prevents committing',async({extension:{page,worker}})=>{
  await receiptPage(page,{scamAfter:true});await expect(page.locator('h1')).toHaveText('Your computer is infected');
  await page.waitForTimeout(1000);expect(await page.evaluate(()=>saved)).toBe(false);await expect(page.locator('iframe')).toBeVisible();
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.status==='blocked'))).toBe(true);
});

test('structural discovery does not accept terms or infer registration from navigation links',async({extension:{page,settings}})=>{
  await settings({mode:'dismiss'});
  for(const body of [
    '<h2>Confirm you are over 18</h2><a href="/cookies">Cookie Policy</a><button>I agree</button>',
    '<h2>Navigation</h2><a href="/signin">Sign in to keep reading for free</a><button>Close</button>',
    '<div role="navigation"><h2>Sign in to keep reading for free</h2><a href="/signin">Sign in</a><button>Close</button></div>'
  ]){
    await visit(page,`<div style="position:fixed;inset:30px">${body}</div><script>window.actions=[];document.addEventListener('click',e=>actions.push(e.target.textContent))</script>`);
    await page.waitForTimeout(1400);expect(await page.evaluate(()=>actions)).toEqual([]);
  }
});
test('hidden provider leftovers do not suppress an unrelated cookie rejection',async({extension:{page}})=>{
  await visit(page,`<div id="CybotCookiebotDialog" hidden></div><div id="cliSettingsPopup" class="cli-modal" hidden></div><div id="cookie-banner" style="position:fixed;bottom:0"><p>We use cookies.</p><button onclick="this.parentElement.remove()">Reject all</button></div>`);
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
});
test('Cookiebot retains native decline and older selected-save and fragment settings controls',async({extension:{page}})=>{
  await visit(page,'<div id="CybotCookiebotDialog">Cookies<button id="CybotCookiebotDialogBodyButtonDecline" onclick="this.parentElement.remove()">Deny</button></div>');
  await expect(page.locator('#CybotCookiebotDialog')).toHaveCount(0);
  for(const opener of ['<a id="CybotCookiebotDialogBodyButtonDetails" href="#">Details</a>','<button class="cb-button">Manage cookies</button>']){
    await visit(page,`<div id="CybotCookiebotDialog">Cookies${opener}<section hidden><label><input type="checkbox" name="statistics" checked>Statistics</label><button id="CybotCookiebotDialogBodyLevelButtonAccept">Use selection</button></section></div><script>window.saved=null;document.querySelector('#CybotCookiebotDialog').children[0].onclick=()=>{document.querySelector('section').hidden=false};document.querySelector('#CybotCookiebotDialogBodyLevelButtonAccept').onclick=()=>{saved=document.querySelector('input').checked;document.querySelector('#CybotCookiebotDialog').remove()}</script>`);
    await expect(page.locator('#CybotCookiebotDialog')).toHaveCount(0);expect(await page.evaluate(()=>saved)).toBe(false);
  }
});

test('CookieYes notices without a settings panel retain reject and opt-in acceptance paths',async({extension:{page,settings}})=>{
  await settings({mode:'dismiss'});
  for(const control of ['<button id="cookie_action_close_header_reject">Reject all</button>','<button>Accept all</button>']){
    await visit(page,`<div id="cookie-law-info-bar" style="position:fixed;bottom:0"><p>We use cookies.</p>${control}</div><script>document.querySelector('button').onclick=()=>document.querySelector('#cookie-law-info-bar').remove()</script>`);
    await expect(page.locator('#cookie-law-info-bar')).toHaveCount(0);
  }
});
test('manual closure releases a refused provider while an unknown preference never permits acceptance',async({extension:{page,settings}})=>{
  await settings({mode:'dismiss'});
  await visit(page,'<div id="CybotCookiebotDialog"><p>Cookie preferences</p><input type="checkbox" name="unknown" checked><button id="CybotCookiebotDialogBodyLevelButtonAccept">Allow all</button></div><script>window.actions=[];document.addEventListener("click",e=>actions.push(e.target.id))</script>');
  await page.waitForTimeout(1000);expect(await page.evaluate(()=>actions)).toEqual([]);
  await page.evaluate(()=>{document.querySelector('#CybotCookiebotDialog').remove();document.body.insertAdjacentHTML('beforeend','<div id="cookie-banner" style="position:fixed;bottom:0"><p>We use cookies.</p><button onclick="this.parentElement.remove()">Reject all</button></div>')});
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
});
test('shared provider rejection works on a public HTTP origin',async({extension:{page}})=>{
  await visit(page,bot(),'http://unfamiliar-publisher.example/');
  await expect(page.locator('#CybotCookiebotDialog')).toHaveCount(0);expect(await page.evaluate(()=>saved)).toBe(false);
});

test('CookieYes fragment controls activate handlers without navigating',async({extension:{page}})=>{
  await visit(page,'<div id="cookie-law-info-bar"><p>We use cookies.</p><a href="#" id="cookie_action_close_header_reject" onclick="this.parentElement.remove()">Reject all</a></div>');
  await expect(page.locator('#cookie-law-info-bar')).toHaveCount(0);expect(page.url()).toBe('https://unfamiliar-publisher.example/');
  await visit(page,`<div id="cookie-law-info-bar"><p>Cookies</p><a href="#" class="cli_settings_button">Settings</a></div><div id="cliSettingsPopup" class="cli-modal" hidden><label><input type="checkbox" class="cli-user-preference-checkbox" id="wt-cli-checkbox-necessary" checked disabled>Necessary</label><label><input type="checkbox" class="cli-user-preference-checkbox" id="wt-cli-checkbox-analytics" checked>Analytics</label><a href="#" id="wt-cli-privacy-save-btn" class="cli_setting_save_button" data-cli-action="accept">Save selected</a></div><script>window.saved=null;document.querySelector('.cli_settings_button').onclick=()=>{const p=document.querySelector('#cliSettingsPopup');p.hidden=false;p.classList.add('cli-show')};document.querySelector('#wt-cli-privacy-save-btn').onclick=()=>{saved=document.querySelector('#wt-cli-checkbox-analytics').checked;document.querySelector('#cliSettingsPopup').remove();document.querySelector('#cookie-law-info-bar').remove()}</script>`);
  await expect.poll(()=>page.evaluate(()=>saved)).toBe(false);expect(page.url()).toBe('https://unfamiliar-publisher.example/');
});
test('duplicate provider roots cannot fall through to acceptance',async({extension:{page,settings,worker}})=>{
  await settings({mode:'dismiss'});
  for(const root of ['id="cliSettingsPopup" class="cli-modal cli-show"','id="CybotCookiebotDialog"']){
    await visit(page,`<div ${root} hidden></div><div ${root} role="dialog"><p>Cookie preferences</p><input type="checkbox" checked><button>Accept all</button></div><script>window.actions=[];document.addEventListener('click',e=>actions.push(e.target.tagName))</script>`);
    await page.waitForTimeout(1400);expect(await page.evaluate(()=>actions)).toEqual([]);await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.diagnostics?.some(r=>r.outcome==='unsupported'&&r.reason==='unknown-preferences')))).toBe(true);
  }
});
test('preexisting CookieYes category cookies do not prove that Save worked',async({extension:{page,worker}})=>{
  await visit(page,`<div id="cliSettingsPopup" class="cli-modal cli-show"><p>Cookie settings</p><label><input class="cli-user-preference-checkbox" type="checkbox" id="wt-cli-checkbox-necessary" checked disabled>Necessary</label><label><input class="cli-user-preference-checkbox" type="checkbox" id="wt-cli-checkbox-analytics">Analytics</label><button type="button" id="wt-cli-privacy-save-btn" class="cli_setting_save_button" data-cli-action="accept">Save</button></div><script>document.cookie='cookielawinfo-checkbox-necessary=yes';document.cookie='cookielawinfo-checkbox-analytics=no';window.saves=0;document.querySelector('button').onclick=()=>saves++;</script>`);
  await expect.poll(()=>page.evaluate(()=>saves)).toBe(1);await page.waitForTimeout(2600);
  const state=Object.values(await worker.evaluate(()=>chrome.storage.session.get(null)));
  expect(state.some(s=>s.consentOutcome==='saved')).toBe(false);expect(state.some(s=>s.consentOutcome==='unconfirmed')).toBe(true);
  await expect(page.locator('#cliSettingsPopup')).toBeVisible();
});
test('a URL change cancels a pending receipt verifier',async({extension:{page,worker}})=>{
  await receiptPage(page,{write:true,delay:1800});await expect(page.locator('iframe')).toHaveCount(0);
  await page.evaluate(()=>history.replaceState({},'', '#new-route'));await page.waitForTimeout(2300);
  expect(Object.values(await worker.evaluate(()=>chrome.storage.session.get(null))).some(s=>s.consentOutcome==='saved')).toBe(false);
});

test('an early legacy scan does not consume a semantic adapter attempt before hydration',async({extension:{page,worker}})=>{
  await visit(page,'<div id="CybotCookiebotDialog" style="opacity:0"><h2>Cookies</h2><button id="CybotCookiebotDialogBodyButtonDecline" onclick="this.parentElement.remove()">Deny</button></div><script>setTimeout(()=>document.querySelector("#CybotCookiebotDialog").style.opacity="1",1500)</script>');
  await expect(page.locator('#CybotCookiebotDialog')).toHaveCount(0);
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.diagnostics?.some(r=>r.provider==='cookiebot'&&r.outcome==='closed')))).toBe(true);
});

test('a completed semantic flow cannot hand its orphan controls to the legacy recipe',async({extension:{page}})=>{
  await visit(page,`<div id="CybotCookiebotDialog"><h2>Cookies</h2><button id="CybotCookiebotDialogBodyButtonDecline">Deny</button></div><script>window.legacyClicks=0;document.querySelector('button').onclick=()=>{document.querySelector('#CybotCookiebotDialog').remove();document.body.insertAdjacentHTML('beforeend','<div id="CybotCookiebotDialogBody"><p>Cookie settings</p><button id="CybotCookiebotDialogBodyLevelButtonAccept">Use selection</button></div>');document.querySelector('button').onclick=()=>legacyClicks++}</script>`);
  await expect(page.locator('#CybotCookiebotDialog')).toHaveCount(0);await page.waitForTimeout(1800);expect(await page.evaluate(()=>legacyClicks)).toBe(0);
});

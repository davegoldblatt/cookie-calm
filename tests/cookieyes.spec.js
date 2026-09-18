import {test,expect} from './fixtures.js';

const html=({hidden=false,outerHidden=false,stuck=false,unknown=false,scam=false}={})=>`<!doctype html><html><style>
body{font:16px system-ui}.cli-modal{position:fixed;inset:30px;background:white;padding:20px}.cli-modal[hidden]{display:none}input{position:absolute;opacity:0}label{display:inline-block;padding:8px}#cookie-law-info-bar{position:fixed;bottom:0;background:#eee;padding:20px}
</style><body><h1>${scam?'Your computer is infected. Call technical support immediately.':'Jobs and article content'}</h1><div class="wt-cli-cookie-bar-container"><div id="cookie-law-info-bar"><p>Cookie consent. Select your cookie settings.</p><button class="cli_settings_button" type="button">Cookie Settings</button><button id="accept-all" type="button">Accept All</button></div><div ${outerHidden?'aria-hidden="true"':''}><div id="cliSettingsPopup" class="cli-modal" role="dialog" aria-hidden="true" hidden><p>Privacy overview and cookie preferences</p><button id="cliModalClose" type="button">Close</button>${['necessary','functional','performance','analytics','advertisement','others',...(unknown?['custom']:[])].map(category=>`<div class="cli-tab-header"><a role="button" data-target="${category}">${category}</a><input type="checkbox" class="cli-user-preference-checkbox" id="wt-cli-checkbox-${category}" checked><label class="cli-slider" for="wt-cli-checkbox-${category}">${category}</label></div>`).join('')}<a role="button" tabindex="0" id="wt-cli-privacy-save-btn" class="cli_setting_save_button" data-cli-action="accept">SAVE &amp; ACCEPT</a></div></div></div><script>
window.actions=[];window.saved=null;
document.querySelector('.cli_settings_button').onclick=()=>{actions.push('settings');const panel=document.querySelector('#cliSettingsPopup');panel.classList.add('cli-show');panel.hidden=${hidden};};
document.querySelector('#accept-all').onclick=()=>actions.push('accept-all');
document.querySelector('#wt-cli-privacy-save-btn').onclick=()=>{actions.push('save-selected');window.saved=[...document.querySelectorAll('input')].map(e=>e.checked);document.querySelector('#cookie-law-info-bar').remove();document.querySelector('#cliSettingsPopup').hidden=true;};
${stuck?"document.querySelector('#wt-cli-checkbox-analytics').addEventListener('click',e=>e.preventDefault());":''}
</script></body></html>`;
const visit=async(page,options)=>{await page.route('https://cookieyes-test.example/',r=>r.fulfill({contentType:'text/html',body:html(options)}));await page.goto('https://cookieyes-test.example/');};

test('legacy CookieYes saves rejection in both modes despite its stale aria-hidden dialog flag',async({extension:{page,settings}})=>{
  for(const mode of ['reject','dismiss']) {
    await settings({mode});
    await visit(page);
    await expect.poll(()=>page.evaluate(()=>saved)).toEqual([true,false,false,false,false,false]);
    expect(await page.evaluate(()=>actions)).toEqual(['settings','save-selected']);
    await expect(page.locator('#cookie-law-info-bar')).toHaveCount(0);
    await expect(page.locator('#cliSettingsPopup')).not.toBeVisible();
  }
});
test('legacy CookieYes still refuses truly hidden or independently aria-hidden controls',async({extension:{page}})=>{
  for(const options of [{hidden:true},{outerHidden:true}]){
    await visit(page,options);await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['settings']);
    await page.waitForTimeout(1700);expect(await page.evaluate(()=>saved)).toBeNull();expect(await page.evaluate(()=>actions)).toEqual(['settings']);
  }
});
test('legacy CookieYes never saves if an optional category stays enabled or is unrecognized',async({extension:{page}})=>{
  for(const options of [{stuck:true},{unknown:true}]){
    await visit(page,options);await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['settings']);
    await page.waitForTimeout(2400);expect(await page.evaluate(()=>saved)).toBeNull();expect(await page.evaluate(()=>actions)).toEqual(['settings']);
  }
});
test('legacy CookieYes retains the page scam guard',async({extension:{page,worker}})=>{
  await visit(page,{scam:true});
  await expect.poll(()=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).some(s=>s.status==='blocked'))).toBe(true);
  expect(await page.evaluate(()=>actions)).toEqual([]);expect(await page.evaluate(()=>saved)).toBeNull();
});

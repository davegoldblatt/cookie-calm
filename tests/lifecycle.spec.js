import {test,expect} from './fixtures.js';
async function reloadExtension(context,worker) {
  const closed=worker.waitForEvent('close',{timeout:12000});
  await worker.evaluate(()=>{setTimeout(()=>chrome.runtime.reload(),50)});
  await closed;
  // CLI-loaded extensions become disabled after runtime.reload in Chromium.
  // This test checks old-context shutdown; fresh-profile tests cover startup.

}
test('extension invalidation stops old observers quietly',async({extension:{page,worker,context}})=>{
  const warnings=[];page.on('console',m=>{if(['warning','error'].includes(m.type())&&/Cookie Calm|context invalidated/i.test(m.text()))warnings.push(m.text())});
  await page.goto('http://localhost:4179/reject');await expect(page.locator('#cookie-banner')).toHaveCount(0);
  await reloadExtension(context,worker);
  await page.evaluate(()=>{
    window.afterReloadClicks=0;
    document.body.insertAdjacentHTML('beforeend','<section id="cookie-banner" role="dialog"><p>Optional cookies</p><button>Reject all</button></section>');
    document.querySelector('#cookie-banner button').onclick=()=>afterReloadClicks++;
    const host=document.createElement('div');host.attachShadow({mode:'closed'}).innerHTML='<p>Changed after update</p>';document.body.append(host);
  });
  await page.waitForTimeout(1700);expect(await page.evaluate(()=>afterReloadClicks)).toBe(0);expect(warnings).toEqual([]);

});
test('extension reload cancels an in-flight consent flow',async({extension:{page,worker,context}})=>{
  const warnings=[];page.on('console',m=>{if(['warning','error'].includes(m.type())&&/Cookie Calm|context invalidated/i.test(m.text()))warnings.push(m.text())});
  await page.goto('http://localhost:4179/cookiebot');await expect(page.locator('#options')).toBeVisible();
  expect(await page.evaluate(()=>window.saved)).toBeUndefined();
  await reloadExtension(context,worker);await page.waitForTimeout(1500);
  expect(await page.evaluate(()=>window.saved)).toBeUndefined();expect(warnings).toEqual([]);
  await expect(page.locator('#CybotCookiebotDialog')).toBeVisible();
});
test('extension invalidation restores cosmetic hiding it owns',async({extension:{page,worker,context}})=>{
  const url='https://restore-test.example/';
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<body><aside class="smartbanner smartbanner--ios" style="position:fixed;bottom:0"><div class="smartbanner__info">Download our app</div><a href="https://apps.apple.com/app/example">View</a></aside></body>'}));
  await page.goto(url);await expect(page.locator('.smartbanner')).not.toBeVisible();
  await reloadExtension(context,worker);await expect(page.locator('.smartbanner')).toBeVisible();
});

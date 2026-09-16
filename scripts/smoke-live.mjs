import { chromium } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Optional live verification. Uses a fresh profile with no personal accounts.
const profile = await mkdtemp(path.join(os.tmpdir(), 'cookie-calm-live-'));
const extension = path.resolve('extension');
const context = await chromium.launchPersistentContext(profile, {
  channel:'chromium', headless:true,
  args:[`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const results=[];
try {
  const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  for(const [name,url] of [['gov-uk','https://www.gov.uk/'],['cookiebot','https://www.cookiebot.com/en/']]) {
    const page=await context.newPage();
    await page.bringToFront();
    const record={name,url};
    try {
      await worker.evaluate(()=>chrome.storage.local.set({settings:{enabled:false}}));
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForTimeout(3500);
      record.before=await page.locator('button').evaluateAll(buttons=>buttons.filter(b=>b.checkVisibility()&&/reject|accept|deny|allow|cookie/i.test(b.innerText)).map(b=>b.innerText.trim()).slice(0,15));
      await page.screenshot({path:`evidence/live-${name}-before.png`});
      await worker.evaluate(()=>chrome.storage.local.set({settings:{enabled:true,mode:'reject'}}));
      await page.waitForTimeout(7500);
      record.after=await page.locator('button').evaluateAll(buttons=>buttons.filter(b=>b.checkVisibility()&&/reject|accept|deny|allow|cookie/i.test(b.innerText)).map(b=>b.innerText.trim()).slice(0,15));
      record.status=await worker.evaluate(()=>chrome.storage.session.get(null));
      record.cookiebotConsent=await page.evaluate(()=>{
        const consent=window.Cookiebot?.consent;
        return consent ? {necessary:consent.necessary,preferences:consent.preferences,statistics:consent.statistics,marketing:consent.marketing} : null;
      });
      await page.screenshot({path:`evidence/live-${name}-after.png`});
    } catch(error) { record.error=error.message; }
    results.push(record);
    await page.close();
  }
} finally {
  await context.close();
  await rm(profile,{recursive:true,force:true});
  await writeFile('evidence/live-smoke.json',JSON.stringify(results,null,2)+'\n');
}
console.log(JSON.stringify(results,null,2));

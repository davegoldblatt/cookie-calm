// Public-page smoke checks in disposable profiles. No user profile or credentials.
import {chromium} from '@playwright/test';
import {mkdtemp, mkdir, writeFile, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const urls = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://www.theguardian.com/us','https://www.bbc.com/','https://www.reuters.com/',
  'https://apnews.com/','https://www.npr.org/','https://www.cnn.com/',
  'https://www.cnbc.com/','https://www.nytimes.com/','https://www.wired.com/',
  'https://www.theverge.com/','https://arstechnica.com/','https://techcrunch.com/',
  'https://www.usatoday.com/','https://www.independent.co.uk/','https://www.bloomberg.com/',
  'https://medium.com/','https://substack.com/','https://www.reddit.com/',
  'https://www.pinterest.com/','https://stackoverflow.com/','https://github.com/',
  'https://developer.mozilla.org/','https://en.wikipedia.org/','https://www.etsy.com/',
  'https://www.allbirds.com/','https://www.everlane.com/','https://www.shopify.com/',
  'https://www.notion.com/','https://slack.com/','https://www.intercom.com/'
];
const directory=path.resolve(process.env.COOKIE_CALM_EVIDENCE_DIR || 'evidence/live-annoyances');
await mkdir(directory,{recursive:true});
const results=[];
let next=0;
const version=JSON.parse(await readFile('extension/manifest.json','utf8')).version;
async function run() {
  const profile=await mkdtemp(path.join(os.tmpdir(),'cookie-calm-live-'));
  const extension=path.resolve('extension');
  const context=await chromium.launchPersistentContext(profile,{
    channel:'chromium',headless:true,viewport:{width:1365,height:900},
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  try {
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    const loaded=await worker.evaluate(()=>({id:chrome.runtime.id,...chrome.runtime.getManifest()}));
    if(loaded.name!=='Cookie Calm'||loaded.version!==version)throw new Error('Invalid test: expected extension version is not running');
    while(next<urls.length) {
      const url=urls[next++];
      const page=await context.newPage();
      const item={url,version,extensionId:loaded.id,profile:'disposable Chromium profile; version verified through service worker',checkedAt:new Date().toISOString(),errors:[]};
      page.on('console',message=>{if(message.type()==='warning'&&message.text().includes('Cookie Calm'))item.errors.push(message.text());});
      await page.addInitScript(()=>{
        window.__calmProbeClicks=[];
        document.addEventListener('click',event=>{
          if(event.isTrusted)return;
          const control=event.target.closest?.('button,[role=button],a');
          if(control)window.__calmProbeClicks.push({label:(control.getAttribute('aria-label')||control.innerText||'').slice(0,100),at:Math.round(performance.now())});
        },true);
      });
      try {
        const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
        item.http=response?.status();
      } catch(error) {item.navigationError=error.message.split('\n')[0];}
      await page.waitForTimeout(6500);
      try {
        item.page=await page.evaluate(()=>{
          const visible=e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
          const candidates=[...document.querySelectorAll('dialog[open],[role=dialog],[role=alertdialog],[aria-modal=true],[id*=newsletter i],[id*=popup i],[class*=newsletter i],gu-island[name=StickyBottomBanner]')];
          return {title:document.title,bodyCharacters:document.body?.innerText.length||0,
            challenge:/verify you are human|prove your humanity|checking your browser|access denied|are you a robot|pardon the interruption/i.test(document.body?.innerText.slice(0,5000)||''),
            syntheticClicks:window.__calmProbeClicks||[],
            remaining:candidates.filter(visible).slice(0,12).map(e=>({tag:e.tagName,id:e.id,text:e.innerText.slice(0,350),controls:[...e.querySelectorAll('button,[role=button],a')].filter(visible).slice(0,6).map(b=>({label:(b.getAttribute('aria-label')||b.innerText||'').slice(0,100),tag:b.tagName}))}))};
        });
        item.outcomes=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)));
        await page.screenshot({path:path.join(directory,new URL(url).hostname+'.png'),timeout:8000});
      } catch(error) {item.inspectionError=error.message.split('\n')[0];}
      results.push(item);
      await writeFile(path.join(directory,'results.json'),JSON.stringify(results,null,2));
      console.log(JSON.stringify({url,http:item.http,challenge:item.page?.challenge,outcomes:item.outcomes,remaining:item.page?.remaining.length,error:item.navigationError||item.inspectionError}));
      await page.close();
    }
  } finally {await context.close();await rm(profile,{recursive:true,force:true});}
}
await Promise.all([run(),run()]);
console.log(`Inspected ${results.length} pages. Results do not imply universal coverage.`);

import {chromium} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
const output=path.resolve(process.env.COOKIE_CALM_EVIDENCE_DIR || 'evidence/performance');
await mkdir(output,{recursive:true});
const urls=process.argv.slice(2).length?process.argv.slice(2):['https://www.theguardian.com/us','https://www.cnbc.com/','https://www.intercom.com/'];
for(const url of urls) {
  const directory=await mkdtemp(path.join(os.tmpdir(),'calm-profile-'));
  const extension=path.resolve('extension');
  const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try {
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    const id=new URL(worker.url()).host;
    const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());
    if(manifest.name!=='Cookie Calm')throw new Error('Invalid test: wrong extension loaded');
    const page=context.pages()[0];const client=await context.newCDPSession(page);
    const events=[];client.on('Tracing.dataCollected',data=>events.push(...data.value));
    await client.send('Tracing.start',{categories:'devtools.timeline,toplevel',transferMode:'ReportEvents'});
    let loadError='';
    try {await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});} catch(error){loadError=error.message.split('\n')[0];}
    const scrolling=process.env.COOKIE_CALM_SCROLL==='1';
    for(let step=0;step<4;step++) {
      await page.waitForTimeout(13000);
      if(scrolling)await page.mouse.wheel(0,step===3?-1200:700);
    }
    const ended=new Promise(resolve=>client.once('Tracing.tracingComplete',resolve));
    await client.send('Tracing.end');await ended;
    const callbacks=events.filter(event=>event.ph==='X'&&event.args?.data?.url?.startsWith(`chrome-extension://${id}/`));
    const durations=callbacks.map(event=>event.dur/1000).sort((a,b)=>a-b);
    const last=events.reduce((max,event)=>Math.max(max,event.ts||0),0);
    const result={url,loadError,browser:context.browser()?.version(),date:new Date().toISOString(),extensionVersion:manifest.version,extensionId:id,profile:'disposable Chromium profile; extension verified through service worker',scenario:scrolling?'page load with four wheel scrolls':'page load without interaction',
      attributedCallbacks:durations.length,totalAttributedMs:durations.reduce((a,b)=>a+b,0),
      maxAttributedMs:durations.at(-1)||0,p95AttributedMs:durations[Math.floor(durations.length*.95)]||0,
      callbacksOver50ms:durations.filter(n=>n>50).length,
      callbacksInLast5Seconds:callbacks.filter(event=>event.ts>last-5e6).length,
      limitation:'Attribution covers trace callbacks with the extension URL, not every microtask or total page CPU.'};
    const host=new URL(url).hostname;
    await writeFile(path.join(output,host+'.trace.json.gz'),gzipSync(JSON.stringify({traceEvents:events})));
    await writeFile(path.join(output,host+'.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  }finally{await context.close();await rm(directory,{recursive:true,force:true});}
}

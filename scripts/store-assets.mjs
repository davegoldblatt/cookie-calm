import { chromium } from '@playwright/test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'store/assets');
await mkdir(out, { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), 'cookie-calm-assets-'));
const extension = path.join(root, 'extension');
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const page = context.pages()[0] || await context.newPage();
  const popup = await context.newPage();
  const canvas = await context.newPage();
  const icon = `data:image/png;base64,${(await readFile(path.join(root, 'static/icons/128.png'))).toString('base64')}`;
  const demos = [
    { host: 'weekend-notes.example', title: 'Less clicking.<br>More browsing.', subtitle: 'Cookie choices, taken care of.', detail: 'Reject optional cookies automatically on supported sites.', text: 'A quiet corner of the internet.', result: 'reject', label: '01 / REJECT OPTIONAL COOKIES' },
    { host: 'suspicious-demo.example', title: 'Some clicks<br>can wait.', subtitle: 'Conservative by default.', detail: 'Clear scam signals stop automatic clicks. Local checks are a precaution, not a safety guarantee.', text: 'Your computer is infected. Call technical support immediately.', result: 'blocked', label: '02 / SUSPICIOUS PAGE GUARDS' }
  ];
  for (const [index, demo] of demos.entries()) {
    await page.route(`https://${demo.host}/`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><title>Cookie Calm demonstration</title><h1>${demo.text}</h1><section id="cookie-banner" role="dialog"><p>We use cookies to improve this website.</p><button onclick="document.documentElement.dataset.result='reject';this.parentElement.remove()">Reject all</button><button onclick="document.documentElement.dataset.result='accept';this.parentElement.remove()">Accept all</button></section></html>` }));
    await page.goto(`https://${demo.host}/`);
    await page.bringToFront();
    if (demo.result === 'reject') await page.waitForFunction(() => document.documentElement.dataset.result === 'reject');
    await worker.evaluate(async ({host, status}) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (Object.values(await chrome.storage.session.get(null)).some(s => s.host === host && s.status === status)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('The demonstration did not reach its expected status');
    }, {host: demo.host, status: demo.result === 'reject' ? 'dismissed' : 'blocked'});
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.locator('#enabled:enabled').waitFor();
    await popup.waitForFunction(host => document.querySelector('#hostname').textContent === host, demo.host);
    const popupImage = await popup.locator('body').screenshot();
    await canvas.setContent(`<!doctype html><html><style>
      *{box-sizing:border-box}body{margin:0;width:1280px;height:800px;background:#e9f3f9;color:#203848;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:62px 76px}.brand{display:flex;align-items:center;gap:12px;font-size:23px;font-weight:700}.brand img{width:44px;height:44px}.copy{width:600px;padding-top:70px}.eyebrow{font-size:12px;letter-spacing:2px;color:#576b78}h1{font-family:'Avenir Next',sans-serif;font-size:68px;line-height:1.06;letter-spacing:-3px;margin:23px 0}h2{font-size:24px;font-weight:500;margin:0 0 24px}p{font-size:19px;line-height:1.6;max-width:480px;color:#576b78}.popup{position:absolute;left:820px;top:50px;width:366px;height:700px;background:white;box-shadow:0 16px 48px #20384820;border-radius:12px;overflow:hidden}.popup img{width:366px;height:700px}.note{position:absolute;bottom:39px;font-size:12px;color:#576b78}
      .popup img{object-fit:contain;object-position:top}
      </style><div class="brand"><img src="${icon}" alt="">Cookie Calm</div><div class="copy"><div class="eyebrow">${demo.label}</div><h1>${demo.title}</h1><h2>${demo.subtitle}</h2><p>${demo.detail}</p></div><div class="popup"><img src="data:image/png;base64,${popupImage.toString('base64')}" alt="Actual Cookie Calm popup"></div><div class="note">Actual extension popup · Controlled demonstration page · Open source</div></html>`);
    await canvas.screenshot({ path: path.join(out, `screenshot-${index + 1}.png`) });
  }
  await canvas.setViewportSize({ width: 440, height: 280 });
  await canvas.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;padding:26px 32px;background:#e9f3f9;color:#203848;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.brand{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:700}.brand img{width:32px;height:32px}h1{font-family:'Avenir Next',sans-serif;font-size:39px;line-height:1.09;letter-spacing:-1.5px;margin:23px 0 15px}p{font-size:13px;color:#576b78;margin:0}</style><div class="brand"><img src="${icon}">Cookie Calm</div><h1>Less clicking.<br>More browsing.</h1><p>Automatic cookie choices. Reject by default.</p>`);
  await canvas.screenshot({ path: path.join(out, 'promo-440x280.png') });
  await writeFile(path.join(out, 'README.md'), '# Store images\n\nThe screenshots show the real extension popup against controlled demonstration pages. They are not third-party endorsements or coverage claims.\n\nRun `npm run build && npm run store-assets` to regenerate them.\n');
  console.log('Created two 1280 × 800 screenshots and one 440 × 280 promotional tile.');
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}

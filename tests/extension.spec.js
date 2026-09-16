import { test as base, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const test = base.extend({
  extension: async ({}, use) => {
    const profile = await mkdtemp(path.join(os.tmpdir(), 'cookie-calm-test-'));
    const extensionPath = path.resolve('extension');
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const page = context.pages()[0] || await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const settings = async value => worker.evaluate(value => chrome.storage.local.set({settings:value}), value);
    await use({ context, worker, page, id, settings, errors });
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
const visit = (page, route) => page.goto(`http://localhost:4179${route}`);
const result = (page, value) => expect(page.locator('html')).toHaveAttribute('data-result', value, {timeout:15000});

test('rejects instead of accepting and does not alter article content', async ({extension:{page,errors}}) => {
  await visit(page,'/reject'); await result(page,'reject');
  await expect(page.locator('#reading')).toBeVisible();
  expect(await page.evaluate(()=>window.clicks)).toEqual(['reject']);
  expect(errors).toEqual([]);
});
test('keeps necessary cookies and recognizes French rejection', async ({extension:{page}}) => {
  await visit(page,'/necessary'); await result(page,'necessary');
  await visit(page,'/french'); await result(page,'reject');
});
test('uses upstream Cookiebot flow and turns off optional categories before saving', async ({extension:{page,errors}}) => {
  await visit(page,'/cookiebot'); await result(page,'saved');
  expect(await page.evaluate(()=>window.saved)).toEqual([true,false,false,false]);
  expect(errors).toEqual([]);
});
test('default never accepts an accept-only banner, including upstream OneTrust utility', async ({extension:{page}}) => {
  for(const route of ['/accept-only','/onetrust-fallback']) {
    await visit(page,route); await page.waitForTimeout(2300);
    expect(await page.evaluate(()=>window.clicks)).toEqual([]);
    await expect(page.locator('[data-choice=accept]')).toBeVisible();
  }
});
test('acceptance fallback is opt-in and still prefers rejecting', async ({extension:{page,settings}}) => {
  await settings({mode:'dismiss'});
  await visit(page,'/reject'); await result(page,'reject');
  await visit(page,'/accept-only'); await result(page,'accept');
  await visit(page,'/onetrust-fallback'); await result(page,'accept');
});
test('leaves unrelated dialogs, account forms and cookie articles alone', async ({extension:{page,settings}}) => {
  await settings({mode:'dismiss'});
  for(const route of ['/unrelated','/article','/account']) {
    await visit(page,route); await page.waitForTimeout(1500);
    expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  }
});
test('does not click disabled controls or repeat a no-op rejection forever', async ({extension:{page}}) => {
  await visit(page,'/disabled'); await page.waitForTimeout(1800);
  expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  await visit(page,'/stuck'); await page.waitForTimeout(5200);
  expect(await page.evaluate(()=>window.clicks)).toEqual(['reject']);
});
test('finds a banner that appears after the initial five seconds', async ({extension:{page}}) => {
  await visit(page,'/late'); await result(page,'reject');
});
test('works in cross-origin and srcdoc frames', async ({extension:{page}}) => {
  for(const route of ['/iframe','/srcdoc']) {
    await visit(page,route);
    await expect(page.frameLocator('iframe').locator('html')).toHaveAttribute('data-result','reject',{timeout:15000});
  }
});
test('works in open and closed shadow roots', async ({extension:{page}}) => {
  for(const route of ['/shadow','/closed-shadow']) { await visit(page,route); await result(page,'reject'); }
});
test('global pause and exact-host pause include cross-origin frames', async ({extension:{page,settings}}) => {
  await settings({enabled:false}); await visit(page,'/reject'); await page.waitForTimeout(1300);
  expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  await settings({enabled:true,disabledSites:['localhost']}); await visit(page,'/iframe'); await page.waitForTimeout(1700);
  await expect(page.frameLocator('iframe').locator('[data-choice=reject]')).toBeVisible();
  await settings({enabled:true});
  await expect(page.frameLocator('iframe').locator('html')).toHaveAttribute('data-result','reject',{timeout:15000});
});
test('pause stops a delayed click and resume works without reloading', async ({extension:{page,settings}}) => {
  await visit(page,'/late'); await page.waitForTimeout(1200); await settings({enabled:false});
  await page.waitForTimeout(5800); expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  await settings({enabled:true}); await result(page,'reject');
});
test('popup controls save settings, preserve site pauses and survive reopening', async ({extension:{context,page,worker,id}}) => {
  await visit(page,'/no-banner');
  const popup = await context.newPage();
  await page.bringToFront();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await page.bringToFront();
  await expect(popup.locator('#enabled')).toBeEnabled();
  await expect(popup.locator('#hostname')).toHaveText('localhost');
  await popup.locator('#pause').click();
  await expect.poll(()=>worker.evaluate(async()=>(await chrome.storage.local.get('settings')).settings.disabledSites)).toEqual(['localhost']);
  await popup.locator('[value=dismiss]').check();
  await expect.poll(()=>worker.evaluate(async()=>(await chrome.storage.local.get('settings')).settings.mode)).toBe('dismiss');
  await popup.locator('#enabled').uncheck();
  await expect.poll(()=>worker.evaluate(async()=>(await chrome.storage.local.get('settings')).settings.enabled)).toBe(false);
  await popup.reload();
  await expect(popup.locator('#enabled')).not.toBeChecked();
  await expect(popup.locator('[value=dismiss]')).toBeChecked();
  await popup.screenshot({path:'evidence/popup-paused.png',clip:{x:0,y:0,width:366,height:700}});
  await popup.locator('#enabled').check();
  await popup.locator('#pause').click();
  await popup.locator('[value=reject]').check();
  await popup.screenshot({path:'evidence/popup.png',clip:{x:0,y:0,width:366,height:700}});
});
test('bundled engine loads every rule and fixtures make no external page requests', async ({extension:{page,worker}}) => {
  const count=await worker.evaluate(async()=>Object.keys(await (await fetch(chrome.runtime.getURL('rules.json'))).json()).length);
  expect(count).toBeGreaterThan(200);
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await visit(page,'/no-banner');await page.waitForTimeout(1500);
  expect(requests.every(url=>url.startsWith('http://localhost:4179/'))).toBe(true);
});
test('does not save consent if an optional category stays enabled', async ({extension:{page}}) => {
  await visit(page,'/cookiebot-stuck');
  await expect(page.locator('#options')).toBeVisible();
  await page.waitForTimeout(2200);
  expect(await page.evaluate(()=>window.saved)).toBeUndefined();
  await expect(page.locator('#CybotCookiebotDialog')).toBeVisible();
});
test('pausing during a provider flow cancels the remaining consent actions', async ({extension:{page,settings}}) => {
  await visit(page,'/cookiebot');
  await expect(page.locator('#options')).toBeVisible();
  await settings({enabled:false});
  await page.waitForTimeout(1600);
  expect(await page.evaluate(()=>window.saved)).toBeUndefined();
  await expect(page.locator('#CybotCookiebotDialog')).toBeVisible();
});
test('SVG page graphics do not interrupt consent detection', async ({extension:{page}}) => {
  await visit(page,'/svg'); await result(page,'reject');
});
test('rejects additional cookies and dismisses the saved-choice confirmation', async ({extension:{page}}) => {
  await visit(page,'/govuk'); await result(page,'rejected-and-dismissed');
});
test('clear scam prompts stop both acceptance and rejection', async ({extension:{page,settings,worker}}) => {
  await settings({mode:'dismiss'}); await visit(page,'/scam');
  await page.waitForTimeout(1600);
  expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  const state=await worker.evaluate(()=>chrome.storage.session.get(null));
  expect(Object.values(state).some(value=>value.status==='blocked')).toBe(true);
});
test('acceptance skips password, payment, wallet and download pages', async ({extension:{page,settings}}) => {
  await settings({mode:'dismiss'});
  for(const route of ['/password-page','/payment-page','/wallet-page','/download-page','/payment-iframe']) {
    await visit(page,route); await page.waitForTimeout(1400);
    expect(await page.evaluate(()=>window.clicks)).toEqual([]);
  }
});
test('embedded consent frames inherit suspicious-page and password guards', async ({extension:{page,settings}}) => {
  await settings({mode:'dismiss'});
  for(const route of ['/scam-frame','/password-frame']) {
    await visit(page,route); await page.waitForTimeout(1800);
    await expect(page.frameLocator('iframe').locator('section')).toBeVisible();
    expect(await page.frames()[1].evaluate(()=>window.clicks)).toEqual([]);
  }
});
test('public HTTP pages and internationalized domains cannot use acceptance fallback', async ({extension:{page,settings,worker}}) => {
  await settings({mode:'dismiss'});
  const html='<!doctype html><section id="cookie-banner" role="dialog"><p>We use cookies</p><button onclick="document.documentElement.dataset.clicked=true">Accept all</button></section>';
  for(const url of ['http://cookie-calm-test.example/','https://xn--bcher-kva.example/']) {
    await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto(url); await page.waitForTimeout(1600);
    await expect(page.locator('html')).not.toHaveAttribute('data-clicked','true');
    const state=await worker.evaluate(()=>chrome.storage.session.get(null));
    expect(Object.values(state).some(value=>value.status==='blocked')).toBe(true);
  }
});

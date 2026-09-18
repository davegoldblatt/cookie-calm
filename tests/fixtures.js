import { test as base, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const test = base.extend({
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
    expect(errors).toEqual([]);
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

export { expect };

import {defineConfig} from '@playwright/test';
// This is WebKit DOM validation with a simulated extension bridge. It does not
// validate Safari's extension API, permissions, service worker or app packaging.
export default defineConfig({
  testDir:'./safari-tests', outputDir:'./safari-test-results', workers:1, timeout:20000,
  use:{browserName:'webkit'}, reporter:[['list']]
});

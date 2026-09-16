import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 30000,
  reporter: [['list']], use: { trace: 'retain-on-failure' },
  webServer: { command: 'node tests/server.mjs', port: 4179, reuseExistingServer: false }
});

const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/e2e',
  reporter: 'list',
  outputDir: 'test-results',
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
  },
})

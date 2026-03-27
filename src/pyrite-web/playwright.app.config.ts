import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './app-e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
  baseURL: 'http://127.0.0.1:18110',
    trace: 'retain-on-failure',
  },
})

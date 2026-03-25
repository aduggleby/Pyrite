import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:18110',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'dotnet run --project /home/alex/Source/Pyrite/src/Pyrite.Api/Pyrite.Api.csproj --launch-profile http',
      port: 18100,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- --host 0.0.0.0',
      cwd: '/home/alex/Source/Pyrite/src/pyrite-web',
      port: 18110,
      reuseExistingServer: true,
    },
  ],
})

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Unauthenticated tests run without any setup
    {
      name: 'public',
      testMatch: /\/(landing|auth)\.spec\.ts/,
    },
    // Auth setup — logs in and saves storageState
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Authenticated tests depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /(.*\.setup\.ts|landing\.spec\.ts|auth\.spec\.ts)/,
    },
    // Multi-browser in CI only
    ...(process.env.CI ? [
      {
        name: 'firefox',
        use: {
          ...devices['Desktop Firefox'],
          storageState: './e2e/.auth/user.json',
        },
        dependencies: ['setup'],
        testIgnore: /(.*\.setup\.ts|landing\.spec\.ts|auth\.spec\.ts)/,
      },
    ] : []),
  ],

  // Start dev server automatically. Set BASE_URL env to skip and test against a running server.
  ...(!process.env.BASE_URL ? {
    webServer: {
      command: 'npx next dev',
      url: 'http://localhost:3000',
      cwd: __dirname,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  } : {}),
})

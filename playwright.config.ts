import { defineConfig, devices } from '@playwright/test';
import { environment } from '@config/environments';
import { storageStatePath } from '@lib/auth';

const browsers = [
  { name: 'chromium', device: 'Desktop Chrome' },
  { name: 'firefox', device: 'Desktop Firefox' },
  { name: 'webkit', device: 'Desktop Safari' },
] as const;

export default defineConfig({
  testDir: './src/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '100%' : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: environment.BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer:
    environment.ENV === 'local'
      ? {
          command: 'node scripts/demo-server.mjs',
          url: `${environment.BASE_URL}/health`,
          reuseExistingServer: false,
        }
      : undefined,
  projects: browsers.flatMap(({ name, device }) => [
    { name: `${name}-setup`, testMatch: /auth\.ui\.setup\.ts/, use: { ...devices[device] } },
    {
      name,
      testMatch: /\.spec\.ts$/,
      dependencies: [`${name}-setup`],
      use: { ...devices[device], storageState: storageStatePath(name) },
    },
  ]),
});

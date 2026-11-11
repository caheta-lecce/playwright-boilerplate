import { defineConfig, devices } from '@playwright/test';
import { environment } from '@config/environments';

// Drives the ZAP journeys (src/tests/security/zap) through an OWASP ZAP proxy so ZAP can passively
// scan the real traffic. Kept apart from playwright.config.ts, which ignores that folder, so
// `npm test` never needs a ZAP daemon. See docs/zap/zap-proxy-scan.md.

// ZAP_PROXY=off drops the proxy (no ZAP daemon needed): a quick pass to confirm the journeys are
// green before spending a real scan run on them.
const proxy = environment.ZAP_PROXY === 'on' ? { server: environment.ZAP_PROXY_URL } : undefined;

export default defineConfig({
  testDir: './src/tests/security/zap',
  // One worker keeps the traffic ordered, so a scan run is reproducible and easy to read.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Every request is relayed and analysed by ZAP, so proxied runs are noticeably slower than the
  // main suite; Playwright's 30s test and 5s expect defaults fail on timing, not on a real defect.
  timeout: 90_000,
  expect: { timeout: 30_000 },
  outputDir: 'test-results/zap',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/zap' }]],
  use: {
    baseURL: environment.BASE_URL,
    // ZAP terminates TLS with its own CA to inspect HTTPS traffic, which the browser does not trust.
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer:
    environment.ENV === 'local'
      ? {
          command: 'node scripts/demo-server.mjs',
          url: `${environment.BASE_URL}/health`,
          reuseExistingServer: false,
        }
      : undefined,
  projects: [
    {
      name: 'zap-chromium',
      // Chromium never proxies loopback addresses unless told to; `<-loopback>` clears that
      // default so the local demo (127.0.0.1) is scanned too.
      use: {
        ...devices['Desktop Chrome'],
        proxy: proxy && { ...proxy, bypass: '<-loopback>' },
      },
    },
    // Same journeys with no proxy at all, for `npm run test:zap:no-proxy`; selected by name, so no
    // environment variable is needed and the script works the same on every OS.
    { name: 'zap-chromium-no-proxy', use: { ...devices['Desktop Chrome'] } },
  ],
});

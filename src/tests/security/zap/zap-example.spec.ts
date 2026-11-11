import { test, expect } from '@fixtures/base';
import { exampleUser } from '@config/environments';

// A ZAP journey generates traffic for the proxy to scan; it is not a regression test, so it keeps
// to a short, deliberate path and skips the axe scans the UI specs run.
test.use({ storageState: { cookies: [], origins: [] } });

test('zap example journey: sign in and out of the demo', async ({ examplePage }) => {
  await test.step('open the sign-in page', async () => {
    await examplePage.do.open();
    await expect(examplePage.on.displayName).toBeVisible();
  });

  await test.step('sign in', async () => {
    await examplePage.do.signIn(exampleUser.displayName);
    await expect(examplePage.on.welcome).toHaveText(`Welcome, ${exampleUser.displayName}`);
  });

  await test.step('sign out', async () => {
    await examplePage.do.signOut();
    await expect(examplePage.on.displayName).toBeVisible();
  });
});

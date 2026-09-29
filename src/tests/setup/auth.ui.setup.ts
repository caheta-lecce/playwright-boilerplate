import { test as setup, expect } from '@fixtures/base';
import { ensureAuthDirectory, storageStatePath } from '@lib/auth';
import { exampleUser } from '@config/environments';

setup('authenticate example user', async ({ page, examplePage, browserName }) => {
  await ensureAuthDirectory();
  await examplePage.do.open();
  await examplePage.do.signIn(exampleUser.displayName);
  await expect(examplePage.on.welcome).toHaveText(`Welcome, ${exampleUser.displayName}`);
  await page.context().storageState({ path: storageStatePath(browserName) });
});

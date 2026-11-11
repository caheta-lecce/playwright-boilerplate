import { test, expect } from '@fixtures/base';
import { exampleUser } from '@config/environments';
import { buildDisplayName, exampleData } from '@data/example.data';

test('restores the saved session', { tag: '@smoke' }, async ({ examplePage }) => {
  await examplePage.do.open();
  await expect(examplePage.on.welcome).toHaveText(`Welcome, ${exampleUser.displayName}`);
});

test('signs out of the example app', { tag: '@regression' }, async ({ examplePage }) => {
  await examplePage.do.open();
  await examplePage.do.signOut();
  await expect(examplePage.on.displayName).toBeVisible();
});

test.describe('sign-in validation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('rejects an empty display name', { tag: '@regression' }, async ({ examplePage }) => {
    await examplePage.do.open();
    await examplePage.do.signIn(exampleData.emptyDisplayName);
    await expect(examplePage.on.error).toHaveText(exampleData.emptyDisplayNameError);
    await expect(examplePage.on.nameValidation).toBeVisible();
  });

  test(
    'signs in with a generated display name',
    { tag: '@regression' },
    async ({ examplePage }) => {
      const displayName = buildDisplayName();
      await examplePage.do.open();
      await examplePage.do.signIn(displayName);
      await expect(examplePage.on.welcome).toHaveText(`Welcome, ${displayName}`);
    }
  );
});

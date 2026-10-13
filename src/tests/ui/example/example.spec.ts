import { test, expect } from '@fixtures/base';
import { exampleUser } from '@config/environments';
import { exampleData } from '@data/example.data';

test('restores the saved session', async ({ examplePage, scanAxe }) => {
  await examplePage.do.open();
  await expect(examplePage.on.welcome).toHaveText(`Welcome, ${exampleUser.displayName}`);
  await scanAxe('home');
});

test('signs out of the example app', async ({ examplePage, scanAxe }) => {
  await examplePage.do.open();
  await examplePage.do.signOut();
  await expect(examplePage.on.displayName).toBeVisible();
  await scanAxe('signed-out');
});

test.describe('sign-in validation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('rejects an empty display name', async ({ examplePage, scanAxe }) => {
    await examplePage.do.open();
    await examplePage.do.signIn(exampleData.emptyDisplayName);
    await expect(examplePage.on.error).toHaveText(exampleData.emptyDisplayNameError);
    await expect(examplePage.on.nameValidation).toBeVisible();
    await scanAxe('validation');
  });
});

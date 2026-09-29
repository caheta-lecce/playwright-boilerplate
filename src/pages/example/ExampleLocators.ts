import type { Locator, Page } from '@playwright/test';

export class ExampleLocators {
  readonly displayName: Locator;
  readonly signIn: Locator;
  readonly welcome: Locator;
  readonly error: Locator;
  readonly nameValidation: Locator;
  readonly signOut: Locator;

  constructor(page: Page) {
    this.displayName = page.getByRole('textbox', { name: 'Display name' });
    this.signIn = page.getByRole('button', { name: 'Sign in', exact: true });
    this.welcome = page.getByRole('heading', { name: /^Welcome,/ });
    this.error = page.getByRole('alert');
    this.nameValidation = page.getByText('Enter a display name.', { exact: true });
    this.signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  }
}

import type { Page } from '@playwright/test';
import type { ExampleLocators } from './ExampleLocators';

export class ExampleActions {
  constructor(
    private readonly page: Page,
    private readonly locators: ExampleLocators
  ) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async signIn(displayName: string): Promise<void> {
    await this.locators.displayName.fill(displayName);
    await this.locators.signIn.click();
  }

  async signOut(): Promise<void> {
    await this.locators.signOut.click();
  }
}

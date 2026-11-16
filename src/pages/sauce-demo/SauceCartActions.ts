import type { Page } from '@playwright/test';

export class SauceCartActions {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/cart');
  }
}

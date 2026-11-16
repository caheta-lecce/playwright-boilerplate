import type { Page } from '@playwright/test';
import type { SauceStorefrontLocators } from './SauceStorefrontLocators';

export class SauceStorefrontActions {
  constructor(
    private readonly page: Page,
    private readonly locators: SauceStorefrontLocators
  ) {}

  async openHome(): Promise<void> {
    await this.page.goto('/');
  }

  async openCatalog(): Promise<void> {
    await this.locators.catalogLink.click();
  }

  async openProduct(name: string): Promise<void> {
    await this.locators.productLink(name).click();
  }

  async addToCart(): Promise<void> {
    await this.locators.addToCart.click();
  }

  async goToCart(): Promise<void> {
    await this.locators.checkOutLink.click();
  }
}

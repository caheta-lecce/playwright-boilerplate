import type { Page } from '@playwright/test';
import { SauceStorefrontActions } from './SauceStorefrontActions';
import { SauceStorefrontLocators } from './SauceStorefrontLocators';

export class SauceStorefrontPage {
  readonly on: SauceStorefrontLocators;
  readonly do: SauceStorefrontActions;

  constructor(page: Page) {
    this.on = new SauceStorefrontLocators(page);
    this.do = new SauceStorefrontActions(page, this.on);
  }
}

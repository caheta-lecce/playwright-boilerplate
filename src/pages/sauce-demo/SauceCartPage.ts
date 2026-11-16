import type { Page } from '@playwright/test';
import { SauceCartActions } from './SauceCartActions';
import { SauceCartLocators } from './SauceCartLocators';

export class SauceCartPage {
  readonly on: SauceCartLocators;
  readonly do: SauceCartActions;

  constructor(page: Page) {
    this.on = new SauceCartLocators(page);
    this.do = new SauceCartActions(page);
  }
}

import type { Locator, Page } from '@playwright/test';

export class SauceCartLocators {
  readonly heading: Locator;
  readonly total: Locator;
  readonly continueShopping: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'My Cart', level: 1 });
    this.total = page.getByRole('heading', { name: /^Total / });
    this.continueShopping = page.getByRole('link', { name: /Continue Shopping/ });
  }

  /** A cart line, matched by the "<product> - <variant>" heading the cart renders. */
  line(name: string): Locator {
    return this.page.getByRole('heading', { name: new RegExp(`^${name}`), level: 3 });
  }
}

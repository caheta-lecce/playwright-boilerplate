import type { Locator, Page } from '@playwright/test';

/** Home, catalog collection and product detail share the storefront header, so one trio covers them. */
export class SauceStorefrontLocators {
  readonly storeHeading: Locator;
  readonly catalogLink: Locator;
  readonly collectionHeading: Locator;
  readonly addToCart: Locator;
  readonly cartLink: Locator;
  readonly checkOutLink: Locator;

  constructor(private readonly page: Page) {
    // The store name is the logo image's alt text inside the level-1 heading link.
    this.storeHeading = page.getByRole('heading', { name: 'Sauce Demo', level: 1 });
    this.catalogLink = page.getByRole('link', { name: 'Catalog', exact: true });
    this.collectionHeading = page.getByRole('heading', { name: 'Products', level: 1 });
    this.addToCart = page.getByRole('button', { name: 'Add to Cart' });
    this.cartLink = page.getByRole('link', { name: /^My Cart \(\d+\)$/ });
    this.checkOutLink = page.getByRole('link', { name: 'Check Out', exact: true });
  }

  /** The product tile on the home or collection page, matched by its product name. */
  productLink(name: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^(Sold Out )?${name} `) }).first();
  }

  productHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 1 });
  }

  productPrice(price: string): Locator {
    return this.page.getByRole('heading', { name: price, level: 2 });
  }
}

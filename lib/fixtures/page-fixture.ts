import { test as base } from '@playwright/test';
import { ExamplePage } from '@pages/example/ExamplePage';
import { SauceCartPage } from '@pages/sauce-demo/SauceCartPage';
import { SauceStorefrontPage } from '@pages/sauce-demo/SauceStorefrontPage';

export const test = base.extend<{
  examplePage: ExamplePage;
  sauceStorefrontPage: SauceStorefrontPage;
  sauceCartPage: SauceCartPage;
}>({
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },
  sauceStorefrontPage: async ({ page }, use) => {
    await use(new SauceStorefrontPage(page));
  },
  sauceCartPage: async ({ page }, use) => {
    await use(new SauceCartPage(page));
  },
});

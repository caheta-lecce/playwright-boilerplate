import { test, expect } from '@fixtures/base';
import { sauceDemoData } from '@data/sauce-demo.data';

// Report-only: the Sauce demo store is a third-party site we do not own, so its violations cannot
// be fixed here. The scans feed the a11y report (`npm run a11y:report:xlsx`) instead of failing.
test.use({ a11yFailOnViolation: false });

test.describe('home and catalog', () => {
  test('scans the home page', { tag: '@regression' }, async ({ sauceStorefrontPage, scanAxe }) => {
    await sauceStorefrontPage.do.openHome();
    await expect(sauceStorefrontPage.on.storeHeading).toBeVisible();
    await expect(sauceStorefrontPage.on.productLink(sauceDemoData.product.name)).toBeVisible();
    await scanAxe('home');
  });

  test(
    'scans the catalog collection',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, scanAxe }) => {
      await sauceStorefrontPage.do.openHome();
      await sauceStorefrontPage.do.openCatalog();
      await expect(sauceStorefrontPage.on.collectionHeading).toBeVisible();
      await expect(sauceStorefrontPage.on.productLink(sauceDemoData.product.name)).toBeVisible();
      await scanAxe('collection');
    }
  );

  test(
    'scans the product detail page',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, scanAxe }) => {
      await sauceStorefrontPage.do.openHome();
      await sauceStorefrontPage.do.openProduct(sauceDemoData.product.name);
      await expect(sauceStorefrontPage.on.productHeading(sauceDemoData.product.name)).toBeVisible();
      await expect(sauceStorefrontPage.on.productPrice(sauceDemoData.product.price)).toBeVisible();
      await expect(sauceStorefrontPage.on.addToCart).toBeVisible();
      await scanAxe('product-detail');
    }
  );
});

test.describe('cart flow', () => {
  test(
    'scans the cart after adding a product and the cart page',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, sauceCartPage, scanAxe }) => {
      await test.step('add a product to the cart', async () => {
        await sauceStorefrontPage.do.openHome();
        await sauceStorefrontPage.do.openProduct(sauceDemoData.product.name);
        await expect(sauceStorefrontPage.on.cartLink).toHaveText(sauceDemoData.cartCountEmpty);
        await sauceStorefrontPage.do.addToCart();
        // The store has no drawer or toast: the header cart count is the only feedback.
        await expect(sauceStorefrontPage.on.cartLink).toHaveText(sauceDemoData.cartCountOne);
        await scanAxe('cart-after-add');
      });

      await test.step('open the cart page', async () => {
        await sauceStorefrontPage.do.goToCart();
        await expect(sauceCartPage.on.heading).toBeVisible();
        await expect(sauceCartPage.on.line(sauceDemoData.product.name)).toBeVisible();
        await expect(sauceCartPage.on.total).toContainText(sauceDemoData.product.price);
        await scanAxe('cart-page');
      });
    }
  );
});

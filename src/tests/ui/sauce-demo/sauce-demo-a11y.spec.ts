import { test, expect } from '@fixtures/base';
import { expectNoAccessibilityViolations, trackA11yScan } from '@lib/a11y/findings';
import type { A11yFinding } from '@lib/a11y/findings';
import { sauceDemoData } from '@data/sauce-demo.data';

// The Sauce demo store is a third-party site, so its violations are expected: each scan is recorded
// without failing, the whole flow runs to the end, and one aggregate step fails the test naming
// every violating state.

test.describe('home and catalog', () => {
  test('scans the home page', { tag: '@regression' }, async ({ sauceStorefrontPage, scanAxe }) => {
    const a11yFindings: A11yFinding[] = [];

    await test.step('open the home page', async () => {
      await sauceStorefrontPage.do.openHome();
      await expect(sauceStorefrontPage.on.storeHeading).toBeVisible();
      await expect(sauceStorefrontPage.on.productLink(sauceDemoData.product.name)).toBeVisible();
      await trackA11yScan(scanAxe, a11yFindings, 'home');
    });

    await test.step(sauceDemoData.aggregateStep, () => {
      expectNoAccessibilityViolations(a11yFindings);
    });
  });

  test(
    'scans the catalog collection',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, scanAxe }) => {
      const a11yFindings: A11yFinding[] = [];

      await test.step('open the catalog collection', async () => {
        await sauceStorefrontPage.do.openHome();
        await sauceStorefrontPage.do.openCatalog();
        await expect(sauceStorefrontPage.on.collectionHeading).toBeVisible();
        await expect(sauceStorefrontPage.on.productLink(sauceDemoData.product.name)).toBeVisible();
        await trackA11yScan(scanAxe, a11yFindings, 'collection');
      });

      await test.step(sauceDemoData.aggregateStep, () => {
        expectNoAccessibilityViolations(a11yFindings);
      });
    }
  );

  test(
    'scans the product detail page',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, scanAxe }) => {
      const a11yFindings: A11yFinding[] = [];

      await test.step('open the product detail page', async () => {
        await sauceStorefrontPage.do.openHome();
        await sauceStorefrontPage.do.openProduct(sauceDemoData.product.name);
        await expect(
          sauceStorefrontPage.on.productHeading(sauceDemoData.product.name)
        ).toBeVisible();
        await expect(
          sauceStorefrontPage.on.productPrice(sauceDemoData.product.price)
        ).toBeVisible();
        await expect(sauceStorefrontPage.on.addToCart).toBeVisible();
        await trackA11yScan(scanAxe, a11yFindings, 'product-detail');
      });

      await test.step(sauceDemoData.aggregateStep, () => {
        expectNoAccessibilityViolations(a11yFindings);
      });
    }
  );
});

test.describe('cart flow', () => {
  test(
    'scans the cart after adding a product and the cart page',
    { tag: '@regression' },
    async ({ sauceStorefrontPage, sauceCartPage, scanAxe }) => {
      const a11yFindings: A11yFinding[] = [];

      await test.step('add a product to the cart', async () => {
        await sauceStorefrontPage.do.openHome();
        await sauceStorefrontPage.do.openProduct(sauceDemoData.product.name);
        await expect(sauceStorefrontPage.on.cartLink).toHaveText(sauceDemoData.cartCountEmpty);
        await sauceStorefrontPage.do.addToCart();
        // The store has no drawer or toast: the header cart count is the only feedback.
        await expect(sauceStorefrontPage.on.cartLink).toHaveText(sauceDemoData.cartCountOne);
        await trackA11yScan(scanAxe, a11yFindings, 'cart-after-add');
      });

      await test.step('open the cart page', async () => {
        await sauceStorefrontPage.do.goToCart();
        await expect(sauceCartPage.on.heading).toBeVisible();
        await expect(sauceCartPage.on.line(sauceDemoData.product.name)).toBeVisible();
        await expect(sauceCartPage.on.total).toContainText(sauceDemoData.product.price);
        await trackA11yScan(scanAxe, a11yFindings, 'cart-page');
      });

      await test.step(sauceDemoData.aggregateStep, () => {
        expectNoAccessibilityViolations(a11yFindings);
      });
    }
  );
});

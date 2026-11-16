// Public Shopify demo store used for report-only accessibility scans (a site we do not own). It is
// a separate Playwright project (`sauce-demo-chromium`) and deliberately bypasses BASE_URL, which
// is validated for the example app.
export const sauceDemoBaseUrl = 'https://sauce-demo.myshopify.com';

export const sauceDemoData = {
  product: { name: 'Grey jacket', price: '£55.00' },
  aggregateStep: 'Aggregate check: no accessibility violations across the whole flow',
  cartCountEmpty: 'My Cart (0)',
  cartCountOne: 'My Cart (1)',
} as const;

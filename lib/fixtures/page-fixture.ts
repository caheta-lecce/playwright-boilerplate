import { test as base } from '@playwright/test';
import { ExamplePage } from '@pages/example/ExamplePage';

export const test = base.extend<{ examplePage: ExamplePage }>({
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },
});

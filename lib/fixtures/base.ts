import { mergeTests } from '@playwright/test';
import { test as pages } from './page-fixture';

export const test = mergeTests(pages);
export { expect } from '@playwright/test';

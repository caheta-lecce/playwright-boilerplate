import { mergeTests } from '@playwright/test';
import { test as pages } from './page-fixture';
import { test as accessibility } from './a11y-fixture';

export const test = mergeTests(pages, accessibility);
export { expect } from '@playwright/test';

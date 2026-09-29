import type { Page } from '@playwright/test';
import { ExampleActions } from './ExampleActions';
import { ExampleLocators } from './ExampleLocators';

export class ExamplePage {
  readonly on: ExampleLocators;
  readonly do: ExampleActions;

  constructor(page: Page) {
    this.on = new ExampleLocators(page);
    this.do = new ExampleActions(page, this.on);
  }
}

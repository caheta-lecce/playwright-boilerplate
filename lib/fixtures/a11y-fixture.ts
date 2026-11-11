import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { currentRunId, toScanFile, writeScanFile } from '@lib/a11y/results';

type A11yFixtures = { scanAxe: (label: string) => Promise<void>; a11yFailOnViolation: boolean };

export const test = base.extend<A11yFixtures>({
  a11yFailOnViolation: [true, { option: true }],
  scanAxe: async ({ page, a11yFailOnViolation }, use, testInfo) => {
    await use(async (label) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      await testInfo.attach(`axe-${label}`, {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json',
      });
      // Also kept on disk for `npm run a11y:report` / `a11y:compare`.
      await writeScanFile(
        toScanFile(results, {
          runId: currentRunId(),
          project: testInfo.project.name,
          spec: testInfo.file,
          label,
        })
      );
      if (a11yFailOnViolation) expect(results.violations, `Accessibility: ${label}`).toEqual([]);
    });
  },
});

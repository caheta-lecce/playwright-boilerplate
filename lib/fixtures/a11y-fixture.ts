import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ScanAxe } from '@lib/a11y/findings';
import {
  currentRunId,
  filterSimulatedFixed,
  parseSimulatedFixed,
  toScanFile,
  writeScanFile,
} from '@lib/a11y/results';

type A11yFixtures = { scanAxe: ScanAxe; a11yFailOnViolation: boolean };

export const test = base.extend<A11yFixtures>({
  a11yFailOnViolation: [true, { option: true }],
  scanAxe: async ({ page, a11yFailOnViolation }, use, testInfo) => {
    // What-if runs only: drops these rule ids from the saved scan and the assertion (see README).
    const simulatedFixed = parseSimulatedFixed(process.env['A11Y_SIMULATE_FIXED']);
    await use(async (label, options = {}) => {
      const builder = new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ]);
      for (const selector of [options.include ?? []].flat()) builder.include(selector);
      for (const selector of [options.exclude ?? []].flat()) builder.exclude(selector);
      const results = await builder.analyze();
      await testInfo.attach(`axe-${label}`, {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json',
      });
      // Also kept on disk for `npm run a11y:report` / `a11y:compare`.
      await writeScanFile(
        toScanFile(
          results,
          {
            runId: currentRunId(),
            project: testInfo.project.name,
            spec: testInfo.file,
            label,
          },
          simulatedFixed
        )
      );
      const violations = filterSimulatedFixed(results.violations, simulatedFixed);
      // trackA11yScan passes `failOnViolation: false`: it aggregates and fails once at the end.
      if (options.failOnViolation ?? a11yFailOnViolation)
        expect(violations, `Accessibility: ${label}`).toEqual([]);
      return {
        label,
        violations: violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact ?? null,
          nodes: violation.nodes.length,
        })),
      };
    });
  },
});

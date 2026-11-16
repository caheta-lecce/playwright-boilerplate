import { expect } from '@playwright/test';

/** One violated rule of a scan, as returned by `scanAxe` (simulate-filtered). */
export interface A11yRuleSummary {
  id: string;
  impact: string | null;
  /** Number of elements the rule flagged. */
  nodes: number;
}

/** What `scanAxe` returns for one state. */
export interface A11yScanSummary {
  label: string;
  violations: A11yRuleSummary[];
}

export interface AxeScanOptions {
  /** CSS selector(s) to scope the scan to (default: the whole page). */
  include?: string | string[];
  /** CSS selector(s) left out of the scan. */
  exclude?: string | string[];
  /** Overrides the `a11yFailOnViolation` fixture option for this call. */
  failOnViolation?: boolean;
}

export type ScanAxe = (label: string, options?: AxeScanOptions) => Promise<A11yScanSummary>;

/** One recorded scan; `violations` is empty for a clean state. */
export type A11yFinding = A11yScanSummary;

/**
 * Runs an axe scan that never fails the test on its own and records the result in `findings`, so a
 * violation on an early state does not hide what later states of the same flow find. Pair it with
 * {@link expectNoAccessibilityViolations} at the end of the test.
 */
export async function trackA11yScan(
  scanAxe: ScanAxe,
  findings: A11yFinding[],
  label: string,
  options: Omit<AxeScanOptions, 'failOnViolation'> = {}
): Promise<void> {
  const summary = await scanAxe(label, { ...options, failOnViolation: false });
  findings.push({ label: summary.label, violations: summary.violations });
}

function describeFinding(finding: A11yFinding): string {
  const rules = finding.violations
    .map((rule) => `${rule.id} [${rule.impact ?? 'unknown'}] x${rule.nodes} node(s)`)
    .join(', ');
  return `  - ${finding.label}: ${rules}`;
}

/** Fails once, naming every state that had violations (label, rule ids, impact, node counts). */
export function expectNoAccessibilityViolations(findings: A11yFinding[]): void {
  const failed = findings.filter((finding) => finding.violations.length > 0);
  const message =
    `Accessibility violations (axe-core) in ${failed.length} of ${findings.length} state(s):\n` +
    failed.map(describeFinding).join('\n');
  expect(failed, message).toEqual([]);
}

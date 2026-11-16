// Types for scripts/a11y/results.mjs, so the TypeScript report entry points can import it.
import type { A11yScanFile } from '@lib/a11y/results';

export interface A11yRun {
  id: string;
  dir: string;
}

export function resolveRun(ref?: string, baseDir?: string): Promise<A11yRun>;
export function loadRun(dir: string): Promise<{ scans: A11yScanFile[] }>;

export interface A11yFinding {
  ruleId: string;
  impact: string;
  label: string;
  page: string;
  browser: string;
  target: string;
  html: string;
  help: string;
  helpUrl: string;
}

export function toFindings(scans: A11yScanFile[]): A11yFinding[];
export function findingKey(finding: A11yFinding): string;
export function compareFindings(a: A11yFinding, b: A11yFinding): number;

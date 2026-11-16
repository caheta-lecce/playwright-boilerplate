// Types for scripts/a11y/compare.mjs.
import type { A11yFinding } from './results.mjs';

export interface A11yRunComparison {
  added: A11yFinding[];
  fixed: A11yFinding[];
  unchanged: A11yFinding[];
}

export function compareRuns(
  baseFindings: A11yFinding[],
  headFindings: A11yFinding[]
): A11yRunComparison;

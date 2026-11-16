import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AxeResults } from 'axe-core';

/** Bump when the on-disk shape changes; scripts/a11y/results.mjs rejects other versions. */
export const A11Y_RESULT_SCHEMA = 1;

export interface A11yRelatedNode {
  target: string[];
  html: string;
}

export interface A11yNodeResult {
  target: string[];
  html: string;
  failureSummary: string;
  /** Other elements named by the node's checks (e.g. the overlay behind a contrast failure). */
  relatedNodes?: A11yRelatedNode[];
}

export interface A11yViolationResult {
  id: string;
  impact: string | null;
  /** Optional: scan files written before the Excel report do not have it. */
  description?: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: A11yNodeResult[];
}

/** One scan: `reports/a11y/<runId>/<project>/<spec>--<label>.json`. */
export interface A11yScanFile {
  schema: typeof A11Y_RESULT_SCHEMA;
  runId: string;
  project: string;
  spec: string;
  label: string;
  url: string;
  timestamp: string;
  violations: A11yViolationResult[];
  /** Optional counts (older scan files lack them): rules axe could not decide / passed / skipped. */
  incomplete?: number;
  passes?: number;
  inapplicable?: number;
  /** Rule ids dropped from `violations` by A11Y_SIMULATE_FIXED: a what-if run, not a real fix. */
  simulatedFixed?: string[];
}

/** Parses A11Y_SIMULATE_FIXED (comma-separated axe rule ids); blanks and duplicates are dropped. */
export function parseSimulatedFixed(value: string | undefined): string[] {
  const ids = (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Removes the violations of the listed rule ids, to pretend they were fixed. */
export function filterSimulatedFixed<T extends { id: string }>(
  violations: T[],
  simulatedFixed: string[]
): T[] {
  return violations.filter((violation) => !simulatedFixed.includes(violation.id));
}

export const A11Y_REPORTS_DIR = path.join('reports', 'a11y');

/** The run id is fixed once by playwright.config.ts so every worker writes to the same run. */
export function currentRunId(): string {
  return process.env['A11Y_RUN_ID'] ?? 'unassigned';
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
}

export function scanFilePath(runId: string, project: string, spec: string, label: string): string {
  const specStem = slug(path.basename(spec).replace(/\.spec\.ts$/, ''));
  return path.join(
    A11Y_REPORTS_DIR,
    slug(runId),
    slug(project),
    `${specStem}--${slug(label)}.json`
  );
}

export function toScanFile(
  results: AxeResults,
  meta: { runId: string; project: string; spec: string; label: string },
  simulatedFixed: string[] = []
): A11yScanFile {
  return {
    schema: A11Y_RESULT_SCHEMA,
    ...meta,
    url: results.url,
    timestamp: results.timestamp,
    incomplete: results.incomplete.length,
    passes: results.passes.length,
    inapplicable: results.inapplicable.length,
    ...(simulatedFixed.length > 0 && { simulatedFixed }),
    violations: filterSimulatedFixed(results.violations, simulatedFixed).map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      tags: violation.tags,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map(String),
        html: node.html,
        failureSummary: node.failureSummary ?? '',
        relatedNodes: [...node.any, ...node.all, ...node.none].flatMap((check) =>
          (check.relatedNodes ?? []).map((related) => ({
            target: related.target.map(String),
            html: related.html,
          }))
        ),
      })),
    })),
  };
}

/** Each scan has its own file (project + spec + label), so parallel workers never clobber. */
export async function writeScanFile(file: A11yScanFile): Promise<string> {
  const target = scanFilePath(file.runId, file.project, file.spec, file.label);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(file, null, 2)}\n`);
  return target;
}

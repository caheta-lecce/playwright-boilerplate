import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AxeResults } from 'axe-core';

/** Bump when the on-disk shape changes; scripts/a11y/results.mjs rejects other versions. */
export const A11Y_RESULT_SCHEMA = 1;

export interface A11yNodeResult {
  target: string[];
  html: string;
  failureSummary: string;
}

export interface A11yViolationResult {
  id: string;
  impact: string | null;
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
  meta: { runId: string; project: string; spec: string; label: string }
): A11yScanFile {
  return {
    schema: A11Y_RESULT_SCHEMA,
    ...meta,
    url: results.url,
    timestamp: results.timestamp,
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      tags: violation.tags,
      nodes: violation.nodes.map((node) => ({
        target: node.target.map(String),
        html: node.html,
        failureSummary: node.failureSummary ?? '',
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

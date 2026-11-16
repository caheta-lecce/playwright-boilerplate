// Baseline vs head comparison of two a11y runs: classification (Fixed / Still open / New), the
// Comparison worksheet and a Markdown summary. Reuses findingKey/compareRuns, so it agrees with
// `npm run a11y:compare`. Runs under Node's native type stripping: erasable syntax, `.ts` imports.
import type ExcelJS from 'exceljs';
import type { A11yScanFile } from '@lib/a11y/results';
import { compareRuns } from './compare.mjs';
import { addHeader, buildA11yExcelWorkbook, linkValue, LINK_FONT, paintImpact } from './excel.ts';
import type { ExcelReportOptions } from './excel.ts';
import { toFindings } from './results.mjs';
import type { A11yFinding } from './results.mjs';

export type ComparisonStatus = 'Fixed' | 'Still open' | 'New';
export const STATUS_ORDER: ComparisonStatus[] = ['Fixed', 'Still open', 'New'];

export interface ComparisonRow {
  status: ComparisonStatus;
  label: string;
  url: string;
  ruleId: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  selector: string;
  html: string;
}

export interface LabelDelta {
  label: string;
  baseline: number;
  head: number;
  fixed: number;
  added: number;
}

export interface Comparison {
  baseId: string;
  headId: string;
  rows: ComparisonRow[];
  counts: Record<ComparisonStatus, number>;
  byLabel: LabelDelta[];
  /** Rule ids the head run pretended were fixed (A11Y_SIMULATE_FIXED); empty for a real re-run. */
  simulatedFixed: string[];
}

interface RuleInfo {
  url: string;
  description: string;
  tags: string[];
}

function ruleInfoIndex(scans: A11yScanFile[]): Map<string, RuleInfo> {
  const index = new Map<string, RuleInfo>();
  for (const scan of scans) {
    for (const violation of scan.violations) {
      index.set(`${scan.project}|${scan.label}|${violation.id}`, {
        url: scan.url,
        description: violation.description ?? '',
        tags: violation.tags,
      });
    }
  }
  return index;
}

/** A finding is one node of one rule in one labelled state; the key is the one `compareRuns` uses. */
export function buildComparison(input: {
  baseId: string;
  headId: string;
  baseScans: A11yScanFile[];
  headScans: A11yScanFile[];
}): Comparison {
  const { baseId, headId, baseScans, headScans } = input;
  const result = compareRuns(toFindings(baseScans), toFindings(headScans));
  const baseInfo = ruleInfoIndex(baseScans);
  const headInfo = ruleInfoIndex(headScans);

  const toRow = (
    status: ComparisonStatus,
    finding: A11yFinding,
    index: Map<string, RuleInfo>
  ): ComparisonRow => {
    const info = index.get(`${finding.browser}|${finding.label}|${finding.ruleId}`);
    return {
      status,
      label: finding.label,
      url: info?.url ?? finding.page,
      ruleId: finding.ruleId,
      impact: finding.impact,
      description: info?.description ?? '',
      help: finding.help,
      helpUrl: finding.helpUrl,
      tags: info?.tags ?? [],
      selector: finding.target,
      html: finding.html,
    };
  };

  const rows = [
    ...result.fixed.map((finding) => toRow('Fixed', finding, baseInfo)),
    ...result.unchanged.map((finding) => toRow('Still open', finding, headInfo)),
    ...result.added.map((finding) => toRow('New', finding, headInfo)),
  ];
  const counts = { Fixed: result.fixed.length, 'Still open': result.unchanged.length, New: 0 };
  counts.New = result.added.length;

  const labels = [...new Set(rows.map((row) => row.label))].sort();
  const byLabel = labels.map((label) => {
    const fixed = rows.filter((row) => row.label === label && row.status === 'Fixed').length;
    const open = rows.filter((row) => row.label === label && row.status === 'Still open').length;
    const added = rows.filter((row) => row.label === label && row.status === 'New').length;
    return { label, baseline: fixed + open, head: open + added, fixed, added };
  });

  return {
    baseId,
    headId,
    rows,
    counts,
    byLabel,
    simulatedFixed: simulatedFixedOf(headScans),
  };
}

export function simulatedFixedOf(scans: A11yScanFile[]): string[] {
  return [...new Set(scans.flatMap((scan) => scan.simulatedFixed ?? []))].sort();
}

const STATUS_FILL: Record<ComparisonStatus, string> = {
  Fixed: 'FF2E7D32',
  'Still open': 'FFFFB300',
  New: 'FFD32F2F',
};
const STATUS_FONT: Record<ComparisonStatus, string> = {
  Fixed: 'FFFFFFFF',
  'Still open': 'FF212121',
  New: 'FFFFFFFF',
};

/** Summary + Violations of the head run (phase-1 format) plus the Comparison worksheet. */
export function buildComparisonWorkbook(
  headScans: A11yScanFile[],
  comparison: Comparison,
  options: ExcelReportOptions = {}
): ExcelJS.Workbook {
  const workbook = buildA11yExcelWorkbook(headScans, options);
  const sheet = workbook.addWorksheet('Comparison');
  addHeader(sheet, [
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Label', key: 'label', width: 28 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Rule ID', key: 'ruleId', width: 26 },
    { header: 'Impact', key: 'impact', width: 12 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Help URL', key: 'helpUrl', width: 45 },
    { header: 'WCAG tags', key: 'tags', width: 30 },
    { header: 'Selectors', key: 'selector', width: 50 },
    { header: 'Element', key: 'html', width: 50 },
    // Narrow spacer, then the per-label delta block (own header, not part of the autofilter).
    { header: '', key: 'gap', width: 4 },
    { header: 'Label (delta)', key: 'dLabel', width: 28 },
    { header: 'Baseline', key: 'dBase', width: 11 },
    { header: 'Head', key: 'dHead', width: 11 },
    { header: 'Fixed', key: 'dFixed', width: 11 },
    { header: 'New', key: 'dNew', width: 11 },
  ]);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };
  sheet.getRow(1).getCell('gap').fill = { type: 'pattern', pattern: 'none' };

  const rowCount = Math.max(comparison.rows.length, comparison.byLabel.length);
  for (let index = 0; index < rowCount; index++) {
    const item = comparison.rows[index];
    const delta = comparison.byLabel[index];
    const row = sheet.addRow({
      ...(item && {
        status: item.status,
        label: item.label,
        url: linkValue(item.url),
        ruleId: item.ruleId,
        impact: item.impact,
        description: item.description,
        helpUrl: linkValue(item.helpUrl),
        tags: item.tags.join(', '),
        selector: item.selector,
        html: item.html,
      }),
      ...(delta && {
        dLabel: delta.label,
        dBase: delta.baseline,
        dHead: delta.head,
        dFixed: delta.fixed,
        dNew: delta.added,
      }),
    });
    if (!item) continue;
    row.getCell('status').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: STATUS_FILL[item.status] },
    };
    row.getCell('status').font = { color: { argb: STATUS_FONT[item.status] }, bold: true };
    row.getCell('url').font = LINK_FONT;
    row.getCell('helpUrl').font = LINK_FONT;
    for (const key of ['description', 'selector', 'html']) {
      row.getCell(key).alignment = { wrapText: true };
    }
    paintImpact(row.getCell('impact'), item.impact);
  }
  // Delta header sits in row 1 beside the table headers and shares their styling.
  for (const key of ['dLabel', 'dBase', 'dHead', 'dFixed', 'dNew']) {
    const cell = sheet.getRow(1).getCell(key);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } };
  }
  return workbook;
}

export function buildComparisonMarkdown(comparison: Comparison): string {
  const { counts, baseId, headId, simulatedFixed } = comparison;
  const lines = [
    `## Accessibility comparison: ${baseId} -> ${headId}`,
    '',
    '| Fixed | Still open | New |',
    '| ---: | ---: | ---: |',
    `| ${counts.Fixed} | ${counts['Still open']} | ${counts.New} |`,
    '',
  ];
  if (simulatedFixed.length > 0)
    lines.push(`Simulated fixes (what-if, not real): ${simulatedFixed.join(', ')}`, '');
  lines.push(
    '| Label | Baseline | Head | Fixed | New |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...comparison.byLabel.map(
      (delta) =>
        `| ${delta.label} | ${delta.baseline} | ${delta.head} | ${delta.fixed} | ${delta.added} |`
    ),
    ''
  );
  return lines.join('\n');
}

/** Rows of one status, in the stable order used by every output. */
export function rowsOf(comparison: Comparison, status: ComparisonStatus): ComparisonRow[] {
  return comparison.rows.filter((row) => row.status === status);
}

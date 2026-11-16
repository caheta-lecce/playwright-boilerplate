// Builds the a11y .xlsx workbook (Summary + Violations sheets) from the scan files of one run.
// Ported from the tst-e2e report so both produce the same layout. Written in TypeScript and run by
// Node's native type stripping (no build step): keep to erasable syntax and `.ts` import paths.
import ExcelJS from 'exceljs';
import type { A11yScanFile, A11yViolationResult } from '@lib/a11y/results';

const IMPACT_FILL: Record<string, string> = {
  critical: 'FFD32F2F',
  serious: 'FFE64A19',
  moderate: 'FFF57C00',
  minor: 'FFFBC02D',
};
const IMPACT_RANK: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export const LINK_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF0563C1' }, underline: true };

export interface ExcelReportOptions {
  /** Value of the Sprint column; empty when unset. */
  sprint?: string;
}

/**
 * `addRow` stores a URL string as plain text: ExcelJS does not linkify it, so the cell needs this
 * explicit hyperlink value to be clickable.
 */
export function linkValue(url: string): ExcelJS.CellHyperlinkValue | '' {
  return url ? { text: url, hyperlink: url } : '';
}

export function addHeader(
  sheet: ExcelJS.Worksheet,
  columns: { header: string; key: string; width: number }[]
): void {
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function paintImpact(cell: ExcelJS.Cell, impact: string | null | undefined): void {
  const fill = impact ? IMPACT_FILL[impact] : undefined;
  if (!fill) return;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
}

/** The spec stem is the "Test" column: `/x/cart.spec.ts` becomes `cart`. */
export function testName(spec: string): string {
  // Split by hand: scan files written on Windows carry backslash paths, which POSIX basename misses.
  return (spec.split(/[\\/]/).pop() ?? spec).replace(/\.spec\.ts$/, '');
}

/**
 * A node's checks can name other elements that contributed to the failure (e.g. the overlay behind
 * a contrast failure); listing them points a reader at what to fix, not just the flagged element.
 */
function relatedNodesText(violation: A11yViolationResult): string {
  const related = violation.nodes.flatMap((node) => node.relatedNodes ?? []);
  const unique = new Map(related.map((item) => [item.target.join(' '), item]));
  return [...unique.values()].map((item) => `${item.target.join(' ')}\n${item.html}`).join('\n\n');
}

function worstImpact(scan: A11yScanFile): string {
  const impacts = scan.violations.flatMap((violation) =>
    violation.impact ? [violation.impact] : []
  );
  return impacts.sort((a, b) => (IMPACT_RANK[a] ?? 99) - (IMPACT_RANK[b] ?? 99))[0] ?? '';
}

/** One Summary row per scan, one Violations row per violation. */
export function buildA11yExcelWorkbook(
  scans: A11yScanFile[],
  options: ExcelReportOptions = {}
): ExcelJS.Workbook {
  const sprint = options.sprint ?? '';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'playwright-boilerplate a11y suite';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  addHeader(summarySheet, [
    { header: 'Sprint', key: 'sprint', width: 12 },
    { header: 'Test', key: 'testTitle', width: 40 },
    { header: 'Label', key: 'label', width: 28 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Violations', key: 'violationCount', width: 12 },
    { header: 'Incomplete', key: 'incompleteCount', width: 12 },
    { header: 'Passes', key: 'passes', width: 10 },
    { header: 'Inapplicable', key: 'inapplicable', width: 12 },
    { header: 'Worst impact', key: 'worstImpact', width: 14 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
  ]);

  for (const scan of scans) {
    const worst = worstImpact(scan);
    const row = summarySheet.addRow({
      sprint,
      testTitle: testName(scan.spec),
      label: scan.label,
      url: linkValue(scan.url),
      violationCount: scan.violations.length,
      // Counts are optional in the scan file: older runs did not record them.
      incompleteCount: scan.incomplete ?? '',
      passes: scan.passes ?? '',
      inapplicable: scan.inapplicable ?? '',
      worstImpact: worst,
      timestamp: scan.timestamp,
    });
    row.getCell('url').font = LINK_FONT;
    paintImpact(row.getCell('worstImpact'), worst);
  }

  const violationsSheet = workbook.addWorksheet('Violations');
  addHeader(violationsSheet, [
    { header: 'Sprint', key: 'sprint', width: 12 },
    { header: 'Test', key: 'testTitle', width: 40 },
    { header: 'Label', key: 'label', width: 28 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Rule ID', key: 'ruleId', width: 26 },
    { header: 'Impact', key: 'impact', width: 12 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Help', key: 'help', width: 40 },
    { header: 'Help URL', key: 'helpUrl', width: 45 },
    { header: 'WCAG tags', key: 'tags', width: 30 },
    { header: 'Nodes affected', key: 'nodeCount', width: 14 },
    { header: 'Selectors', key: 'selectors', width: 50 },
    { header: 'Related node(s)', key: 'relatedNodes', width: 50 },
    { header: 'Probable repo file', key: 'probableFile', width: 50 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Bug URL', key: 'bugUrl', width: 40 },
  ]);

  for (const scan of scans) {
    for (const violation of scan.violations) {
      const row = violationsSheet.addRow({
        sprint,
        testTitle: testName(scan.spec),
        label: scan.label,
        url: linkValue(scan.url),
        ruleId: violation.id,
        impact: violation.impact ?? '',
        description: violation.description ?? '',
        help: violation.help,
        helpUrl: linkValue(violation.helpUrl),
        tags: violation.tags.join(', '),
        nodeCount: violation.nodes.length,
        selectors: violation.nodes.map((node) => node.target.join(' ')).join('\n'),
        relatedNodes: relatedNodesText(violation),
        // Left empty on purpose: we do not own the audited site, so there is no repo to point at.
        probableFile: '',
        timestamp: scan.timestamp,
        bugUrl: '',
      });
      for (const key of ['selectors', 'relatedNodes', 'probableFile', 'description']) {
        row.getCell(key).alignment = { wrapText: true };
      }
      row.getCell('url').font = LINK_FONT;
      row.getCell('helpUrl').font = LINK_FONT;
      paintImpact(row.getCell('impact'), violation.impact);
    }
  }

  return workbook;
}

export async function writeA11yExcelReport(
  scans: A11yScanFile[],
  outputPath: string,
  options: ExcelReportOptions = {}
): Promise<void> {
  await buildA11yExcelWorkbook(scans, options).xlsx.writeFile(outputPath);
}

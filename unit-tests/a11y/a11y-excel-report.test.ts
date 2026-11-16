// Unit tests for the a11y .xlsx workbook. Run with `npm run test:unit` (node:test, Node's native
// type stripping). The workbook is read back in memory; nothing is written to disk.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type ExcelJS from 'exceljs';
import type { A11yScanFile, A11yViolationResult } from '@lib/a11y/results';
import { buildA11yExcelWorkbook, testName } from '../../scripts/a11y/excel.ts';

function rule(
  id: string,
  impact: string | null,
  over: Partial<A11yViolationResult> = {}
): A11yViolationResult {
  return {
    id,
    impact,
    description: `Description of ${id}`,
    help: `Help for ${id}`,
    helpUrl: `https://dequeuniversity.test/rules/${id}`,
    tags: ['wcag2a'],
    nodes: [{ target: [`#${id}`], html: `<i id="${id}"></i>`, failureSummary: '' }],
    ...over,
  };
}

function scan(over: Partial<A11yScanFile> = {}): A11yScanFile {
  return {
    schema: 1,
    runId: 'r',
    project: 'sauce-demo-chromium',
    spec: 'C:\\repo\\src\\tests\\ui\\sauce-demo\\sauce-demo-a11y.spec.ts',
    label: 'home',
    url: 'https://shop.test/',
    timestamp: '2026-01-01T00:00:00.000Z',
    violations: [],
    incomplete: 1,
    passes: 10,
    inapplicable: 3,
    ...over,
  };
}

function rowsOf(workbook: ExcelJS.Workbook, sheet: string): Record<string, unknown>[] {
  const ws = workbook.getWorksheet(sheet);
  assert.ok(ws, `${sheet} sheet`);
  const keys = ws.columns.map((column) => String(column.key));
  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    rows.push(Object.fromEntries(keys.map((key) => [key, row.getCell(key).value])));
  });
  return rows;
}

function fillOf(workbook: ExcelJS.Workbook, sheet: string, row: number, key: string) {
  const fill = workbook.getWorksheet(sheet)?.getRow(row).getCell(key).fill as
    ExcelJS.FillPattern | undefined;
  return fill?.fgColor?.argb;
}

void describe('workbook layout', () => {
  const workbook = buildA11yExcelWorkbook([scan()]);

  void it('has the Summary and Violations sheets with the template headers', () => {
    assert.deepEqual(
      workbook.worksheets.map((sheet) => sheet.name),
      ['Summary', 'Violations']
    );
    const headers = (name: string) =>
      workbook.getWorksheet(name)?.getRow(1).values as (string | undefined)[];
    assert.deepEqual(headers('Summary').slice(1), [
      'Sprint',
      'Test',
      'Label',
      'URL',
      'Violations',
      'Incomplete',
      'Passes',
      'Inapplicable',
      'Worst impact',
      'Timestamp',
    ]);
    assert.equal(headers('Violations').length - 1, 16);
  });

  void it('styles the header row, freezes it and adds an autofilter', () => {
    const sheet = workbook.getWorksheet('Summary');
    assert.equal(fillOf(workbook, 'Summary', 1, 'sprint'), 'FF37474F');
    assert.equal(sheet?.getRow(1).font?.bold, true);
    assert.deepEqual(sheet?.views[0], { state: 'frozen', ySplit: 1 });
    assert.ok(sheet?.autoFilter);
  });
});

void describe('Summary sheet', () => {
  const workbook = buildA11yExcelWorkbook(
    [
      scan({
        violations: [rule('a', 'minor'), rule('b', 'critical'), rule('c', 'serious')],
      }),
      scan({ label: 'clean' }),
      scan({ label: 'old', incomplete: undefined, passes: undefined, inapplicable: undefined }),
    ],
    { sprint: 'sprint03' }
  );
  const rows = rowsOf(workbook, 'Summary');

  void it('writes one row per scan with its counts and the spec stem as the test', () => {
    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.testTitle, 'sauce-demo-a11y');
    assert.equal(rows[0]?.violationCount, 3);
    assert.equal(rows[0]?.incompleteCount, 1);
    assert.equal(rows[0]?.passes, 10);
    assert.equal(rows[0]?.inapplicable, 3);
  });

  void it('leaves counts empty for scan files that predate them', () => {
    assert.equal(rows[2]?.passes, '');
  });

  void it('reports the worst impact among the violations, colored', () => {
    assert.equal(rows[0]?.worstImpact, 'critical');
    assert.equal(fillOf(workbook, 'Summary', 2, 'worstImpact'), 'FFD32F2F');
    assert.equal(rows[1]?.worstImpact, '');
    assert.equal(fillOf(workbook, 'Summary', 3, 'worstImpact'), undefined);
  });

  void it('writes URLs as real hyperlinks', () => {
    assert.deepEqual(rows[0]?.url, { text: 'https://shop.test/', hyperlink: 'https://shop.test/' });
  });

  void it('fills the sprint from the option, empty when unset', () => {
    assert.equal(rows[0]?.sprint, 'sprint03');
    const unset = rowsOf(buildA11yExcelWorkbook([scan()]), 'Summary');
    assert.equal(unset[0]?.sprint, '');
  });
});

void describe('Violations sheet', () => {
  const overlay = { target: ['.overlay'], html: '<div class="overlay"></div>' };
  const contrast = rule('color-contrast', 'serious', {
    tags: ['wcag2aa', 'wcag143'],
    nodes: [
      { target: ['.a'], html: '<a></a>', failureSummary: '', relatedNodes: [overlay] },
      { target: ['.b'], html: '<b></b>', failureSummary: '', relatedNodes: [overlay] },
    ],
  });
  const workbook = buildA11yExcelWorkbook([
    scan({ violations: [contrast, rule('label', 'critical')] }),
    scan({ label: 'clean' }),
  ]);
  const rows = rowsOf(workbook, 'Violations');

  void it('writes one row per violation, none for a clean scan', () => {
    assert.deepEqual(
      rows.map((row) => row.ruleId),
      ['color-contrast', 'label']
    );
  });

  void it('lists every affected selector, the node count and the tags', () => {
    assert.equal(rows[0]?.nodeCount, 2);
    assert.equal(rows[0]?.selectors, '.a\n.b');
    assert.equal(rows[0]?.tags, 'wcag2aa, wcag143');
    assert.equal(rows[0]?.description, 'Description of color-contrast');
  });

  void it('lists each related node once and leaves repo file and bug URL empty', () => {
    assert.equal(rows[0]?.relatedNodes, '.overlay\n<div class="overlay"></div>');
    assert.equal(rows[1]?.relatedNodes, '');
    assert.equal(rows[0]?.probableFile, '');
    assert.equal(rows[0]?.bugUrl, '');
  });

  void it('colors the impact cell', () => {
    assert.equal(fillOf(workbook, 'Violations', 2, 'impact'), 'FFE64A19');
    assert.equal(fillOf(workbook, 'Violations', 3, 'impact'), 'FFD32F2F');
  });

  void it('copes with scan files that have no description', () => {
    const old = rule('x', 'minor', { description: undefined });
    const out = rowsOf(buildA11yExcelWorkbook([scan({ violations: [old] })]), 'Violations');
    assert.equal(out[0]?.description, '');
  });
});

void describe('testName', () => {
  void it('strips the folder and the .spec.ts suffix on either path style', () => {
    assert.equal(testName('/a/b/cart.spec.ts'), 'cart');
    assert.equal(testName('C:\\a\\b\\cart.spec.ts'), 'cart');
  });
});

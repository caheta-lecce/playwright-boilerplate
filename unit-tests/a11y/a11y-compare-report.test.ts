// Unit tests for the baseline comparison: status classification, the Comparison worksheet, the
// HTML report and the simulated-fix filter. Run with `npm run test:unit`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type ExcelJS from 'exceljs';
import type { A11yScanFile, A11yViolationResult } from '@lib/a11y/results';
import { filterSimulatedFixed, parseSimulatedFixed, toScanFile } from '../../lib/a11y/results.ts';
import { buildComparison, buildComparisonWorkbook } from '../../scripts/a11y/compare-report.ts';
import { buildA11yHtmlReport } from '../../scripts/a11y/html-report.ts';
import { parseCliArgs } from '../../scripts/a11y-compare-report.ts';

function rule(id: string, targets: string[], impact = 'serious'): A11yViolationResult {
  return {
    id,
    impact,
    description: `Description of ${id}`,
    help: `Help for ${id}`,
    helpUrl: `https://dequeuniversity.test/${id}`,
    tags: ['wcag2aa'],
    nodes: targets.map((target) => ({
      target: [target],
      html: `<i>${target}</i>`,
      failureSummary: '',
    })),
  };
}

function scan(
  label: string,
  violations: A11yViolationResult[],
  extra: Partial<A11yScanFile> = {}
): A11yScanFile {
  return {
    schema: 1,
    runId: 'r',
    project: 'sauce-demo-chromium',
    spec: '/x/sauce-demo-a11y.spec.ts',
    label,
    url: `https://shop.test/${label}`,
    timestamp: '2026-01-01T00:00:00.000Z',
    violations,
    ...extra,
  };
}

const base = [
  scan('home', [rule('color-contrast', ['.a', '.b']), rule('link-name', ['.c'])]),
  scan('cart', [rule('color-contrast', ['.d'])]),
];
const head = [
  scan('home', [rule('link-name', ['.c']), rule('label', ['.e'])], {
    simulatedFixed: ['color-contrast'],
  }),
  scan('cart', []),
];
const comparison = buildComparison({
  baseId: 'base',
  headId: 'head',
  baseScans: base,
  headScans: head,
});

function argbOf(cell: ExcelJS.Cell | undefined): string | undefined {
  return (cell?.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb;
}

void describe('buildComparison', () => {
  void it('classifies each finding as Fixed, Still open or New', () => {
    assert.deepEqual(comparison.counts, { Fixed: 3, 'Still open': 1, New: 1 });
    const status = (ruleId: string, selector: string) =>
      comparison.rows.find((row) => row.ruleId === ruleId && row.selector === selector)?.status;
    assert.equal(status('color-contrast', '.a'), 'Fixed');
    assert.equal(status('link-name', '.c'), 'Still open');
    assert.equal(status('label', '.e'), 'New');
  });

  void it('keeps the description and URL of the run the finding came from', () => {
    const fixed = comparison.rows.find((row) => row.selector === '.d');
    assert.equal(fixed?.url, 'https://shop.test/cart');
    assert.equal(fixed?.description, 'Description of color-contrast');
  });

  void it('counts per label and lists the simulated rules', () => {
    assert.deepEqual(comparison.byLabel, [
      { label: 'cart', baseline: 1, head: 0, fixed: 1, added: 0 },
      { label: 'home', baseline: 3, head: 2, fixed: 2, added: 1 },
    ]);
    assert.deepEqual(comparison.simulatedFixed, ['color-contrast']);
  });

  void it('is all Still open when nothing changed', () => {
    const same = buildComparison({ baseId: 'a', headId: 'b', baseScans: base, headScans: base });
    assert.deepEqual(same.counts, { Fixed: 0, 'Still open': 4, New: 0 });
  });
});

void describe('Comparison worksheet', () => {
  const workbook = buildComparisonWorkbook(head, comparison);
  const sheet = workbook.getWorksheet('Comparison');

  void it('adds a Comparison sheet after Summary and Violations', () => {
    assert.deepEqual(
      workbook.worksheets.map((item) => item.name),
      ['Summary', 'Violations', 'Comparison']
    );
  });

  void it('writes the header, freeze and autofilter like the other sheets', () => {
    assert.equal(sheet?.getRow(1).getCell('status').value, 'Status');
    assert.equal(argbOf(sheet?.getRow(1).getCell('status')), 'FF37474F');
    assert.deepEqual(sheet?.views[0], { state: 'frozen', ySplit: 1 });
  });

  void it('colours the status cells green, amber and red', () => {
    const colour = (status: string): string | undefined => {
      for (let row = 2; row <= comparison.rows.length + 1; row++) {
        const cell = sheet?.getRow(row).getCell('status');
        if (cell?.value === status) return argbOf(cell);
      }
      return undefined;
    };
    assert.equal(colour('Fixed'), 'FF2E7D32');
    assert.equal(colour('Still open'), 'FFFFB300');
    assert.equal(colour('New'), 'FFD32F2F');
  });

  void it('writes the per-label delta block beside the table', () => {
    assert.equal(sheet?.getRow(2).getCell('dLabel').value, 'cart');
    assert.equal(sheet?.getRow(2).getCell('dFixed').value, 1);
    assert.equal(sheet?.getRow(3).getCell('dNew').value, 1);
  });
});

void describe('HTML report', () => {
  void it('has the baseline comparison section with counts, run ids and simulated rules', () => {
    const html = buildA11yHtmlReport({ runId: 'head', scans: head, comparison });
    assert.match(html, /<h2 id="comparison-title">Baseline comparison<\/h2>/);
    assert.match(html, /<code>base<\/code>/);
    assert.match(html, /Simulated fixes/);
    assert.match(html, /<span class="count">3<\/span><span class="name">Fixed<\/span>/);
    assert.match(html, /<h3 id="status-new">New \(1\)<\/h3>/);
  });

  void it('works without a baseline and has the accessibility basics', () => {
    const html = buildA11yHtmlReport({ runId: 'solo', scans: head });
    assert.doesNotMatch(html, /Baseline comparison/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<h1>Accessibility report<\/h1>/);
    assert.match(html, /<th scope="col">Impact<\/th>/);
    assert.match(html, /<caption>/);
  });

  void it('escapes markup coming from the scanned page', () => {
    const evil = scan('x', [rule('r', ['<img src=x onerror=alert(1)>'])]);
    const html = buildA11yHtmlReport({ runId: 'x', scans: [evil] });
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x/);
  });
});

void describe('simulated fixes', () => {
  void it('parses the env value, dropping blanks and duplicates', () => {
    assert.deepEqual(parseSimulatedFixed(' color-contrast, ,label,color-contrast'), [
      'color-contrast',
      'label',
    ]);
    assert.deepEqual(parseSimulatedFixed(undefined), []);
  });

  void it('filters the listed rule ids only', () => {
    assert.deepEqual(filterSimulatedFixed([{ id: 'a' }, { id: 'b' }], ['a']), [{ id: 'b' }]);
  });

  void it('records the simulated rules in the scan file and drops their violations', () => {
    const violation = (id: string) => ({
      id,
      impact: 'serious',
      help: '',
      helpUrl: '',
      tags: [],
      nodes: [],
    });
    const axe = {
      url: 'https://shop.test/',
      timestamp: 't',
      incomplete: [],
      passes: [],
      inapplicable: [],
      violations: [violation('color-contrast'), violation('label')],
    };
    const meta = { runId: 'r', project: 'p', spec: 's', label: 'l' };
    const file = toScanFile(axe as never, meta, ['color-contrast']);
    assert.deepEqual(
      file.violations.map((item) => item.id),
      ['label']
    );
    assert.deepEqual(file.simulatedFixed, ['color-contrast']);
    assert.equal('simulatedFixed' in toScanFile(axe as never, meta), false);
  });
});

void describe('parseCliArgs', () => {
  void it('reads runs and options', () => {
    const options = parseCliArgs(['a', 'b', '--fail-on-new', '--out-dir', 'o']);
    assert.deepEqual(options.runs, ['a', 'b']);
    assert.equal(options.failOnNew, true);
    assert.equal(options.outDir, 'o');
  });

  void it('rejects unknown options and a missing run', () => {
    assert.throws(() => parseCliArgs(['a', '--nope']), /Unknown option/);
    assert.throws(() => parseCliArgs([]), /Usage/);
  });
});

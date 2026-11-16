import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { compareRuns, buildCompareMarkdown } from '../../scripts/a11y/compare.mjs';
import { buildCsv, buildMarkdown, csvCell, groupIssues } from '../../scripts/a11y/report.mjs';
import { loadRun, resolveRun, toFindings } from '../../scripts/a11y/results.mjs';

function scan({ project = 'chromium', label = 'home', violations = [] } = {}) {
  return {
    schema: 1,
    runId: 'r',
    project,
    spec: 'example.spec.ts',
    label,
    url: 'http://127.0.0.1:4173/',
    timestamp: '2026-01-01T00:00:00.000Z',
    violations,
  };
}

function violation(id, targets, impact = 'serious') {
  return {
    id,
    impact,
    help: `Help for ${id}`,
    helpUrl: `https://example.test/rules/${id}`,
    tags: ['wcag2a'],
    nodes: targets.map((target) => ({
      target: [target],
      html: `<i>${target}</i>`,
      failureSummary: '',
    })),
  };
}

test('an empty run has no findings and reports a clean result', () => {
  const findings = toFindings([scan()]);
  assert.deepEqual(findings, []);
  assert.match(
    buildMarkdown({ runId: 'r', scanCount: 1, findings }),
    /No accessibility violations/
  );
  assert.equal(buildCsv({ findings }).split('\r\n').filter(Boolean).length, 1, 'header only');
});

test('the same node found in three browsers is one issue listing all browsers', () => {
  const scans = ['chromium', 'firefox', 'webkit'].map((project) =>
    scan({ project, violations: [violation('color-contrast', ['#a'])] })
  );
  const findings = toFindings(scans);
  assert.equal(findings.length, 3, 'one finding per browser');
  const issues = groupIssues(findings);
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0].browsers, ['chromium', 'firefox', 'webkit']);
  assert.equal(buildCsv({ findings }).split('\r\n').filter(Boolean).length, 2);
});

test('repeated scans of the same state (retries, two specs) collapse', () => {
  const same = scan({ violations: [violation('label', ['#x'])] });
  assert.equal(toFindings([same, structuredClone(same)]).length, 1);
});

test('findings sort by impact, then rule', () => {
  const findings = toFindings([
    scan({
      violations: [
        violation('b-rule', ['#1'], 'minor'),
        violation('a-rule', ['#2'], 'critical'),
        violation('c-rule', ['#3'], null),
      ],
    }),
  ]);
  assert.deepEqual(
    findings.map((f) => f.ruleId),
    ['a-rule', 'b-rule', 'c-rule']
  );
  assert.equal(findings[2].impact, 'unknown');
});

test('csv cells are quoted and spreadsheet formulas are neutralised', () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell('=SUM(A1)'), `"'=SUM(A1)"`);
  assert.equal(csvCell(['a', 'b']), '"a b"');
  assert.equal(buildCsv({ findings: [] }).charCodeAt(0), 0xfeff, 'BOM for Excel');
});

test('compare: new, fixed and unchanged, with a regression', () => {
  const base = toFindings([
    scan({ violations: [violation('label', ['#old']), violation('color-contrast', ['#keep'])] }),
  ]);
  const head = toFindings([
    scan({
      violations: [violation('color-contrast', ['#keep']), violation('image-alt', ['img.logo'])],
    }),
  ]);
  const result = compareRuns(base, head);
  assert.deepEqual(
    result.added.map((f) => f.ruleId),
    ['image-alt']
  );
  assert.deepEqual(
    result.fixed.map((f) => f.ruleId),
    ['label']
  );
  assert.deepEqual(
    result.unchanged.map((f) => f.ruleId),
    ['color-contrast']
  );
  const markdown = buildCompareMarkdown({ baseId: 'a', headId: 'b', result });
  assert.match(markdown, /New: 1\. Fixed: 1\. Unchanged: 1\./);
  assert.match(markdown, /FAIL/);
});

test('compare: a violation that appears in only one extra browser is new', () => {
  const base = toFindings([scan({ violations: [violation('label', ['#x'])] })]);
  const head = toFindings([
    scan({ violations: [violation('label', ['#x'])] }),
    scan({ project: 'webkit', violations: [violation('label', ['#x'])] }),
  ]);
  const result = compareRuns(base, head);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].browser, 'webkit');
});

test('compare: two empty runs are clean', () => {
  const result = compareRuns([], []);
  assert.deepEqual(result, { added: [], fixed: [], unchanged: [] });
  assert.match(buildCompareMarkdown({ baseId: 'a', headId: 'b', result }), /OK, no new/);
});

test('loadRun and resolveRun read the on-disk layout', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'a11y-'));
  try {
    for (const id of ['2026-01-01T00-00-00-000Z', '2026-01-02T00-00-00-000Z']) {
      await mkdir(path.join(root, id, 'chromium'), { recursive: true });
      await writeFile(
        path.join(root, id, 'chromium', 'example--home.json'),
        JSON.stringify(scan({ violations: [violation('label', ['#x'])] }))
      );
    }
    assert.equal((await resolveRun('latest', root)).id, '2026-01-02T00-00-00-000Z');
    assert.equal((await resolveRun('previous', root)).id, '2026-01-01T00-00-00-000Z');
    await assert.rejects(resolveRun('nope', root), /Unknown a11y run/);
    const run = await resolveRun('latest', root);
    assert.equal((await loadRun(run.dir)).scans.length, 1);

    await writeFile(path.join(run.dir, 'chromium', 'bad.json'), JSON.stringify({ schema: 99 }));
    await assert.rejects(loadRun(run.dir), /unsupported schema 99/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

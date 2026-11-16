// Single-file HTML a11y report: blue header, summary cards, collapsible per-test sections, and an
// optional "Baseline comparison" section. Same look as the tst-e2e report; styles are in one
// <style> block (not inline) so the colour pairs are easy to audit. Every text/background pair
// below is >= 4.5:1: dark "ink" text on a pale tint, never white on a vivid accent.
import type { A11yScanFile, A11yViolationResult } from '@lib/a11y/results';
import { rowsOf, simulatedFixedOf, STATUS_ORDER } from './compare-report.ts';
import type { Comparison, ComparisonRow, ComparisonStatus } from './compare-report.ts';
import { testName } from './excel.ts';

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
const IMPACT_ACCENT: Record<string, string> = {
  critical: '#d32f2f',
  serious: '#e64a19',
  moderate: '#f57c00',
  minor: '#fbc02d',
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const CSS = `
*, *::before, *::after { box-sizing: border-box }
body { font-family: system-ui, sans-serif; margin: 0; background: #fafafa; color: #212121 }
a { color: #0d47a1 }
a:focus-visible, summary:focus-visible { outline: 3px solid #0d47a1; outline-offset: 2px }
header { background: #1565c0; color: #fff; padding: 16px 24px }
header h1 { margin: 0; font-size: 20px }
header p { margin: 4px 0 0; font-size: 13px }
main { max-width: 1200px; margin: 0 auto; padding: 24px }
h2 { font-size: 16px; margin: 28px 0 10px }
h3 { font-size: 14px; margin: 16px 0 8px }
.cards { display: flex; gap: 16px; margin: 0 0 28px; padding: 0; list-style: none; flex-wrap: wrap }
.card { background: #fff; border-radius: 6px; box-shadow: 0 1px 4px #0002; padding: 16px 24px; min-width: 130px; border-top: 4px solid #757575 }
.card .count { display: block; font-size: 32px; font-weight: 700 }
.card .name { font-size: 13px; color: #424242 }
.critical { color: #8f1414 } .serious { color: #9b2b08 } .moderate { color: #994d00 } .minor { color: #855f00 }
.passes { color: #1b5e20 } .neutral { color: #424242 }
.badge { padding: 2px 7px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; white-space: nowrap }
.badge.critical { background: #f6dfdf } .badge.serious { background: #f6e5df }
.badge.moderate { background: #f6ebdf } .badge.minor { background: #f6efdf }
.badge.fixed { background: #dff0e0; color: #1b5e20 }
.badge.open { background: #fff3cd; color: #5f4300 }
.badge.new { background: #f6dfdf; color: #8f1414 }
.card.fixed { border-top-color: #2e7d32 } .card.open { border-top-color: #ffb300 } .card.new { border-top-color: #d32f2f }
details { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 12px }
details details { background: #fafafa; margin: 8px 12px }
summary { padding: 12px 16px; cursor: pointer; font-weight: 600 }
.body { padding: 4px 16px 12px; border-top: 1px solid #e0e0e0 }
.meta { font-size: 12px; color: #424242 }
table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff }
caption { text-align: left; font-weight: 600; padding: 4px 0 6px }
th { background: #eceff1; text-align: left; padding: 8px 10px }
td { padding: 8px 10px; vertical-align: top; border-top: 1px solid #e0e0e0 }
code { font-size: 12px; word-break: break-all }
.note { background: #e8f1fd; border: 1px solid #a9c8f2; border-left: 4px solid #1565c0; border-radius: 4px; padding: 8px 12px; margin: 0 0 16px }
.scroll { overflow-x: auto }
`;

function badge(impact: string): string {
  const known = impact in IMPACT_ACCENT ? impact : 'neutral';
  return `<span class="badge ${known}">${escapeHtml(impact || 'unknown')}</span>`;
}

function violationTable(scan: A11yScanFile): string {
  if (scan.violations.length === 0) return '<p>No violations.</p>';
  const row = (v: A11yViolationResult): string => `<tr>
      <td>${badge(v.impact ?? '')}</td>
      <td><a href="${escapeHtml(v.helpUrl)}">${escapeHtml(v.id)}</a></td>
      <td>${escapeHtml(v.description ?? v.help)}</td>
      <td>${v.nodes.map((node) => `<code>${escapeHtml(node.target.join(' '))}</code>`).join('<br>')}</td>
    </tr>`;
  return `<div class="scroll"><table>
    <caption>Violations in ${escapeHtml(scan.label)}</caption>
    <thead><tr><th scope="col">Impact</th><th scope="col">Rule</th><th scope="col">Description</th><th scope="col">Affected elements</th></tr></thead>
    <tbody>${scan.violations.map(row).join('')}</tbody></table></div>`;
}

function scanDetails(scan: A11yScanFile): string {
  const count = scan.violations.length;
  return `<details>
    <summary>${escapeHtml(scan.label)}: ${count} violation${count === 1 ? '' : 's'}</summary>
    <div class="body">
      <p class="meta">${escapeHtml(scan.url)} | ${escapeHtml(scan.timestamp)} | ${escapeHtml(scan.project)}
      | passes ${scan.passes ?? 'n/a'} | incomplete ${scan.incomplete ?? 'n/a'} | inapplicable ${scan.inapplicable ?? 'n/a'}</p>
      ${violationTable(scan)}
    </div>
  </details>`;
}

const STATUS_CLASS: Record<ComparisonStatus, string> = {
  Fixed: 'fixed',
  'Still open': 'open',
  New: 'new',
};

function comparisonTable(status: ComparisonStatus, rows: ComparisonRow[]): string {
  const id = `status-${STATUS_CLASS[status]}`;
  const body = rows.length
    ? rows
        .map(
          (row) => `<tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${badge(row.impact)}</td>
      <td><a href="${escapeHtml(row.helpUrl)}">${escapeHtml(row.ruleId)}</a></td>
      <td>${escapeHtml(row.description || row.help)}</td>
      <td><code>${escapeHtml(row.selector)}</code></td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="5">None.</td></tr>';
  return `<h3 id="${id}">${status} (${rows.length})</h3>
  <div class="scroll"><table aria-labelledby="${id}">
    <thead><tr><th scope="col">State</th><th scope="col">Impact</th><th scope="col">Rule</th><th scope="col">Description</th><th scope="col">Selector</th></tr></thead>
    <tbody>${body}</tbody></table></div>`;
}

function comparisonSection(comparison: Comparison): string {
  const { counts } = comparison;
  const simulated = comparison.simulatedFixed.length
    ? `<p class="note"><strong>Simulated fixes:</strong> the head run dropped these rules at scan time, so their findings show as Fixed without any real change: <code>${comparison.simulatedFixed.map(escapeHtml).join(', ')}</code></p>`
    : '';
  const card = (status: ComparisonStatus): string =>
    `<li class="card ${STATUS_CLASS[status]}"><span class="count">${counts[status]}</span><span class="name">${status}</span></li>`;
  const delta = comparison.byLabel
    .map(
      (d) =>
        `<tr><th scope="row">${escapeHtml(d.label)}</th><td>${d.baseline}</td><td>${d.head}</td><td>${d.fixed}</td><td>${d.added}</td></tr>`
    )
    .join('');
  return `<section aria-labelledby="comparison-title">
  <h2 id="comparison-title">Baseline comparison</h2>
  <p class="meta">Baseline run <code>${escapeHtml(comparison.baseId)}</code> compared with head run <code>${escapeHtml(comparison.headId)}</code>. A finding is one element of one rule in one labelled state.</p>
  ${simulated}
  <ul class="cards">${STATUS_ORDER.map(card).join('')}</ul>
  <div class="scroll"><table>
    <caption>Findings per state</caption>
    <thead><tr><th scope="col">State</th><th scope="col">Baseline</th><th scope="col">Head</th><th scope="col">Fixed</th><th scope="col">New</th></tr></thead>
    <tbody>${delta}</tbody></table></div>
  ${STATUS_ORDER.map((status) => comparisonTable(status, rowsOf(comparison, status))).join('')}
</section>`;
}

/** `comparison` is omitted for a single-run report. */
export function buildA11yHtmlReport(input: {
  runId: string;
  scans: A11yScanFile[];
  comparison?: Comparison;
}): string {
  const { runId, scans, comparison } = input;
  const violations = scans.flatMap((scan) => scan.violations);
  const sum = (pick: (scan: A11yScanFile) => number | undefined): number =>
    scans.reduce((total, scan) => total + (pick(scan) ?? 0), 0);

  const impactCards = IMPACT_ORDER.map(
    (impact) => `<li class="card" style="border-top-color:${IMPACT_ACCENT[impact]}">
      <span class="count ${impact}">${violations.filter((v) => v.impact === impact).length}</span>
      <span class="name">${impact}</span></li>`
  ).join('');

  const byTest = new Map<string, A11yScanFile[]>();
  for (const scan of scans) {
    const key = testName(scan.spec);
    byTest.set(key, [...(byTest.get(key) ?? []), scan]);
  }
  const tests = [...byTest.entries()]
    .map(([name, testScans]) => {
      const total = testScans.reduce((n, scan) => n + scan.violations.length, 0);
      return `<details>
    <summary>${escapeHtml(name)}: ${testScans.length} scan(s), ${total} violation${total === 1 ? '' : 's'}</summary>
    <div class="body">${testScans.map(scanDetails).join('')}</div>
  </details>`;
    })
    .join('');

  const simulated = simulatedFixedOf(scans);
  const simulatedNote =
    !comparison && simulated.length
      ? `<p class="note"><strong>Simulated fixes:</strong> <code>${simulated.map(escapeHtml).join(', ')}</code> were dropped at scan time.</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>a11y report - ${escapeHtml(runId)}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <h1>Accessibility report</h1>
  <p>Run ${escapeHtml(runId)} | ${scans.length} scan(s) from ${byTest.size} test(s)</p>
  <p>axe-core WCAG 2.1 A/AA rules only: an indication of accessibility, not a conformance claim.</p>
</header>
<main>
  ${simulatedNote}
  <section aria-labelledby="summary-title">
    <h2 id="summary-title">Summary</h2>
    <ul class="cards">
      ${impactCards}
      <li class="card"><span class="count neutral">${sum((scan) => scan.incomplete)}</span><span class="name">incomplete</span></li>
      <li class="card"><span class="count passes">${sum((scan) => scan.passes)}</span><span class="name">passes</span></li>
    </ul>
  </section>
  ${comparison ? comparisonSection(comparison) : ''}
  <section aria-labelledby="tests-title">
    <h2 id="tests-title">Tests</h2>
    ${tests || '<p>No scans found.</p>'}
  </section>
</main>
</body>
</html>
`;
}

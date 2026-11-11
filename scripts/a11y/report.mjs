// Builds the human-readable issue report (Markdown + CSV) from a run's findings.
import { IMPACT_ORDER, impactRank } from './results.mjs';

/**
 * Merges findings that differ only by browser: one issue = rule + page/label + target, with the
 * list of browsers it appears in.
 */
export function groupIssues(findings) {
  const issues = new Map();
  for (const f of findings) {
    const key = [f.ruleId, f.page, f.label, f.target].join('|');
    const issue = issues.get(key) ?? { ...f, browsers: [] };
    if (!issue.browsers.includes(f.browser)) issue.browsers.push(f.browser);
    issues.set(key, issue);
  }
  return [...issues.values()].map((i) => ({ ...i, browsers: [...i.browsers].sort() }));
}

function escapeCell(text) {
  return String(text).replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ');
}

export function buildMarkdown({ runId, scanCount, findings }) {
  const issues = groupIssues(findings);
  const lines = [`# Accessibility report: run ${runId}`, ''];
  lines.push(`Scans: ${scanCount}. Distinct issues: ${issues.length}.`, '');
  if (issues.length === 0) {
    lines.push('No accessibility violations found.', '');
    return lines.join('\n');
  }
  lines.push('## By impact', '', '| Impact | Issues |', '| --- | --- |');
  for (const impact of IMPACT_ORDER) {
    const count = issues.filter((i) => i.impact === impact).length;
    if (count) lines.push(`| ${impact} | ${count} |`);
  }
  const unknown = issues.filter((i) => impactRank(i.impact) === IMPACT_ORDER.length).length;
  if (unknown) lines.push(`| unknown | ${unknown} |`);
  lines.push('');

  const rules = new Map();
  for (const issue of issues) rules.set(issue.ruleId, [...(rules.get(issue.ruleId) ?? []), issue]);
  lines.push('## By rule', '');
  for (const [ruleId, items] of rules) {
    const [first] = items;
    lines.push(
      `### ${ruleId} (${first.impact}, ${items.length} issue${items.length === 1 ? '' : 's'})`,
      '',
      `${first.help}. [Rule help](${first.helpUrl})`,
      '',
      '| Page | State | Browsers | Target |',
      '| --- | --- | --- | --- |'
    );
    for (const i of items)
      lines.push(
        `| ${escapeCell(i.page)} | ${escapeCell(i.label)} | ${i.browsers.join(', ')} | \`${escapeCell(i.target)}\` |`
      );
    lines.push('');
  }
  return lines.join('\n');
}

const CSV_COLUMNS = [
  ['Rule', 'ruleId'],
  ['Impact', 'impact'],
  ['Page', 'page'],
  ['State', 'label'],
  ['Browsers', 'browsers'],
  ['Target', 'target'],
  ['Description', 'help'],
  ['Help URL', 'helpUrl'],
  ['HTML', 'html'],
];

/** Quotes a cell and neutralises spreadsheet formulas (CSV injection) in cells starting `=+-@`. */
export function csvCell(value) {
  let text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const BOM = String.fromCharCode(0xfeff);

/** UTF-8 BOM + CRLF so Excel opens it directly with correct encoding. */
export function buildCsv({ findings }) {
  const issues = groupIssues(findings);
  const rows = [CSV_COLUMNS.map(([title]) => csvCell(title)).join(',')];
  for (const issue of issues)
    rows.push(CSV_COLUMNS.map(([, key]) => csvCell(issue[key])).join(','));
  return `${BOM}${rows.join('\r\n')}\r\n`;
}

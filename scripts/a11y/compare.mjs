// Compares the findings of two runs: new, fixed and unchanged.
import { compareFindings, findingKey } from './results.mjs';

export function compareRuns(baseFindings, headFindings) {
  const base = new Map(baseFindings.map((f) => [findingKey(f), f]));
  const head = new Map(headFindings.map((f) => [findingKey(f), f]));
  const sorted = (items) => items.sort(compareFindings);
  return {
    added: sorted([...head].filter(([k]) => !base.has(k)).map(([, f]) => f)),
    fixed: sorted([...base].filter(([k]) => !head.has(k)).map(([, f]) => f)),
    unchanged: sorted([...head].filter(([k]) => base.has(k)).map(([, f]) => f)),
  };
}

function table(findings) {
  const lines = [
    '| Rule | Impact | Page | State | Browser | Target |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const f of findings)
    lines.push(
      `| ${f.ruleId} | ${f.impact} | ${f.page} | ${f.label} | ${f.browser} | \`${f.target.replaceAll('|', '\\|')}\` |`
    );
  return lines;
}

export function buildCompareMarkdown({ baseId, headId, result }) {
  const { added, fixed, unchanged } = result;
  const lines = [
    `# Accessibility comparison: ${baseId} -> ${headId}`,
    '',
    `New: ${added.length}. Fixed: ${fixed.length}. Unchanged: ${unchanged.length}.`,
    '',
  ];
  if (added.length) lines.push('## New violations', '', ...table(added), '');
  if (fixed.length) lines.push('## Fixed violations', '', ...table(fixed), '');
  if (unchanged.length) lines.push('## Unchanged violations', '', ...table(unchanged), '');
  if (!added.length && !fixed.length && !unchanged.length)
    lines.push('No violations in either run.', '');
  lines.push(
    added.length ? 'Result: FAIL, new violations found.' : 'Result: OK, no new violations.',
    ''
  );
  return lines.join('\n');
}

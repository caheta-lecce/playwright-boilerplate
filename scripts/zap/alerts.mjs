// Pure logic for ZAP alerts: normalising API output, comparing with accepted findings, formatting.
// No network or file access here (see fetch.mjs and the CLIs), so everything is unit-tested.

export const RISKS = ['Informational', 'Low', 'Medium', 'High'];

/** Index in RISKS, or -1 when unknown. Case-insensitive. */
export function riskRank(risk) {
  return RISKS.findIndex((name) => name.toLowerCase() === String(risk).toLowerCase());
}

export function parseRisk(value) {
  const rank = riskRank(value);
  if (rank === -1) {
    throw new Error(`Unknown risk "${value}". Use one of: ${RISKS.join(', ').toLowerCase()}.`);
  }
  return RISKS[rank];
}

/** Query strings carry volatile values (tokens, timestamps), so findings are keyed without them. */
export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return String(url);
  }
}

/** The slice of a raw ZAP alert that identifies and describes a finding. */
export function normalizeAlert(raw) {
  const riskFromCode = RISKS[Number(raw.riskcode)];
  const risk = RISKS[riskRank(raw.risk)] ?? riskFromCode ?? 'Informational';
  return {
    pluginId: String(raw.pluginId ?? raw.alertRef ?? ''),
    alert: String(raw.alert ?? raw.name ?? ''),
    risk,
    confidence: String(raw.confidence ?? ''),
    method: String(raw.method ?? 'GET').toUpperCase(),
    url: normalizeUrl(raw.url ?? ''),
    param: String(raw.param ?? ''),
    cweid: String(raw.cweid ?? ''),
  };
}

/** Identity of a finding: rule, method, URL without query, and the affected parameter. */
export function findingKey(finding) {
  return [finding.pluginId, finding.method, finding.url, finding.param].join('|');
}

export function compareFindings(a, b) {
  return (
    riskRank(b.risk) - riskRank(a.risk) ||
    a.pluginId.localeCompare(b.pluginId, 'en', { numeric: true }) ||
    a.url.localeCompare(b.url) ||
    a.method.localeCompare(b.method) ||
    a.param.localeCompare(b.param)
  );
}

/** Raw alerts to a sorted, de-duplicated list of findings (one per rule + method + URL + param). */
export function toFindings(rawAlerts) {
  const byKey = new Map();
  for (const raw of rawAlerts) {
    const finding = normalizeAlert(raw);
    byKey.set(findingKey(finding), finding);
  }
  return [...byKey.values()].sort(compareFindings);
}

/**
 * Splits current findings against the accepted list.
 * - `newFindings`: not accepted. `failing` is the subset at or above `minRisk`.
 * - `acceptedPresent`: accepted and still reported. `stale`: accepted but no longer reported.
 */
export function diffFindings(current, accepted, minRisk = 'Low') {
  const threshold = riskRank(parseRisk(minRisk));
  const acceptedKeys = new Map(accepted.map((entry) => [findingKey(entry), entry]));
  const currentKeys = new Set(current.map(findingKey));
  const newFindings = current.filter((f) => !acceptedKeys.has(findingKey(f)));
  return {
    newFindings,
    failing: newFindings.filter((f) => riskRank(f.risk) >= threshold),
    belowThreshold: newFindings.filter((f) => riskRank(f.risk) < threshold),
    acceptedPresent: current.filter((f) => acceptedKeys.has(findingKey(f))),
    stale: accepted.filter((entry) => !currentKeys.has(findingKey(entry))),
  };
}

function table(findings) {
  const lines = [
    '| Risk | Rule | Alert | Method | URL | Param |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const f of findings) {
    const cells = [f.risk, f.pluginId, f.alert, f.method, f.url, f.param || '-'];
    lines.push(`| ${cells.map((c) => String(c).replaceAll('|', '\\|')).join(' | ')} |`);
  }
  return lines;
}

export function buildDiffMarkdown({ result, minRisk = 'Low', total }) {
  const { failing, belowThreshold, acceptedPresent, stale } = result;
  const lines = [
    '# ZAP findings diff',
    '',
    `Findings: ${total}. New at or above ${minRisk}: ${failing.length}. New below ${minRisk}: ${belowThreshold.length}. ` +
      `Accepted: ${acceptedPresent.length}. Stale accepted entries: ${stale.length}.`,
    '',
  ];
  if (failing.length)
    lines.push(`## New findings (${minRisk} or higher)`, '', ...table(failing), '');
  if (belowThreshold.length) {
    lines.push(`## New findings below ${minRisk} (not failing)`, '', ...table(belowThreshold), '');
  }
  if (stale.length) {
    lines.push(
      '## Accepted findings no longer reported',
      '',
      ...table(stale),
      '',
      'Remove them with `npm run zap:findings:approve -- --prune --reason "<text>"`.',
      ''
    );
  }
  lines.push(
    failing.length
      ? 'Result: FAIL, review the new findings, fix them or accept them with `npm run zap:findings:approve -- --reason "<text>"`.'
      : 'Result: OK, no new findings at or above the threshold.',
    ''
  );
  return lines.join('\n');
}

export const ACCEPTED_SCHEMA = 1;

/**
 * Adds every current finding that is not accepted yet (with `reason` and `date`); with `prune`
 * also drops accepted entries that are no longer reported. Existing entries keep their reason.
 */
export function approveFindings({ current, accepted, reason, date, prune = false }) {
  if (!reason || !reason.trim()) {
    throw new Error('Approving findings needs a reason: pass --reason "<text>".');
  }
  const currentKeys = new Set(current.map(findingKey));
  const kept = prune ? accepted.filter((e) => currentKeys.has(findingKey(e))) : accepted;
  const known = new Set(kept.map(findingKey));
  const added = current
    .filter((f) => !known.has(findingKey(f)))
    .map((f) => ({ ...f, reason: reason.trim(), approvedAt: date }));
  const entries = [...kept, ...added].sort(compareFindings);
  return { entries, added, removed: accepted.length - kept.length };
}

/** Stable, diff-friendly JSON: sorted entries, fixed key order, one trailing newline. */
export function serializeAccepted(entries) {
  const ordered = entries.map((e) => ({
    pluginId: e.pluginId,
    alert: e.alert,
    risk: e.risk,
    method: e.method,
    url: e.url,
    param: e.param,
    reason: e.reason,
    approvedAt: e.approvedAt,
  }));
  return `${JSON.stringify({ schema: ACCEPTED_SCHEMA, findings: ordered }, null, 2)}\n`;
}

export function parseAccepted(text) {
  const parsed = JSON.parse(text);
  if (parsed.schema !== ACCEPTED_SCHEMA || !Array.isArray(parsed.findings)) {
    throw new Error(
      `Accepted-findings file must have schema ${ACCEPTED_SCHEMA} and a findings list.`
    );
  }
  return parsed.findings;
}

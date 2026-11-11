// Reads the per-scan axe files written by lib/a11y/results.ts and flattens them into findings.
// Layout: reports/a11y/<runId>/<project>/<spec>--<label>.json (shape: A11yScanFile in that module).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const REPORTS_DIR = path.join('reports', 'a11y');
export const SCHEMA = 1;
export const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

/** Lower number is worse; unknown or missing impacts sort last. */
export function impactRank(impact) {
  const index = IMPACT_ORDER.indexOf(impact);
  return index === -1 ? IMPACT_ORDER.length : index;
}

function pagePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Run ids are sortable timestamps, so the greatest name is the newest run. */
export async function listRuns(baseDir = REPORTS_DIR) {
  const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Accepts a run id, `latest`, `previous`, or a path to a run folder. */
export async function resolveRun(ref, baseDir = REPORTS_DIR) {
  const runs = await listRuns(baseDir);
  if (ref === 'latest' || ref === undefined) {
    const id = runs.at(-1);
    if (!id) throw new Error(`No a11y runs found in ${baseDir}. Run the tests first.`);
    return { id, dir: path.join(baseDir, id) };
  }
  if (ref === 'previous') {
    const id = runs.at(-2);
    if (!id) throw new Error(`Need at least two a11y runs in ${baseDir} to pick "previous".`);
    return { id, dir: path.join(baseDir, id) };
  }
  if (runs.includes(ref)) return { id: ref, dir: path.join(baseDir, ref) };
  const asPath = path.resolve(ref);
  const isDir = await readdir(asPath).then(
    () => true,
    () => false
  );
  if (isDir) return { id: path.basename(asPath), dir: asPath };
  throw new Error(`Unknown a11y run "${ref}". Available: ${runs.join(', ') || 'none'}.`);
}

/** Parses the scan files of one run folder into `{ scans }`. Malformed files fail loudly. */
export async function loadRun(dir) {
  const scans = [];
  const projects = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory());
  for (const project of projects.sort((a, b) => a.name.localeCompare(b.name))) {
    const files = (await readdir(path.join(dir, project.name))).filter((f) => f.endsWith('.json'));
    for (const file of files.sort()) {
      const full = path.join(dir, project.name, file);
      let parsed;
      try {
        parsed = JSON.parse(await readFile(full, 'utf8'));
      } catch (error) {
        throw new Error(`Cannot parse ${full}: ${error.message}`, { cause: error });
      }
      if (parsed.schema !== SCHEMA)
        throw new Error(`${full}: unsupported schema ${parsed.schema} (expected ${SCHEMA}).`);
      scans.push(parsed);
    }
  }
  return { scans };
}

/** Identity of a finding across runs, including the browser so a browser-only regression is new. */
export function findingKey(f) {
  return [f.ruleId, f.label, f.browser, f.target].join('|');
}

export function compareFindings(a, b) {
  return (
    impactRank(a.impact) - impactRank(b.impact) ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.page.localeCompare(b.page) ||
    a.label.localeCompare(b.label) ||
    a.target.localeCompare(b.target) ||
    a.browser.localeCompare(b.browser)
  );
}

/**
 * One finding per node per scan: { ruleId, impact, label, page, browser, target, html, help,
 * helpUrl }. Identical findings (same rule, label, target, browser) from several specs or retries
 * collapse into one.
 */
export function toFindings(scans) {
  const byKey = new Map();
  for (const scan of scans) {
    for (const violation of scan.violations) {
      for (const node of violation.nodes) {
        const finding = {
          ruleId: violation.id,
          impact: violation.impact ?? 'unknown',
          label: scan.label,
          page: pagePath(scan.url),
          browser: scan.project,
          target: node.target.join(' '),
          html: node.html,
          help: violation.help,
          helpUrl: violation.helpUrl,
        };
        byKey.set(findingKey(finding), finding);
      }
    }
  }
  return [...byKey.values()].sort(compareFindings);
}

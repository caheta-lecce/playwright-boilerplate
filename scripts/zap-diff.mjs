import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  buildDiffMarkdown,
  diffFindings,
  parseAccepted,
  parseRisk,
  toFindings,
} from './zap/alerts.mjs';
import { ACCEPTED_FILE, ALERTS_FILE } from './zap/paths.mjs';

// `npm run zap:diff [-- --min-risk <informational|low|medium|high>] [--alerts <file>] [--out <md>]`
// Compares reports/zap/alerts.json with docs/zap/zap-accepted-findings.json. Exit 1 when there are
// new findings at or above the risk threshold (default: low); exit 2 on errors.
export async function runDiff({
  alertsFile = ALERTS_FILE,
  acceptedFile = ACCEPTED_FILE,
  minRisk = 'low',
  out,
}) {
  const risk = parseRisk(minRisk);
  const fetched = JSON.parse(
    await readFile(alertsFile, 'utf8').catch(() => {
      throw new Error(`No alerts file at ${alertsFile}. Run \`npm run zap:report:fetch\` first.`);
    })
  );
  const accepted = await readFile(acceptedFile, 'utf8').then(parseAccepted, (error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const current = toFindings(fetched.alerts);
  const result = diffFindings(current, accepted, risk);
  const markdown = buildDiffMarkdown({ result, minRisk: risk, total: current.length });
  if (out) {
    await mkdir(path.dirname(path.resolve(out)), { recursive: true });
    await writeFile(out, markdown);
  }
  return { markdown, failing: result.failing.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      'min-risk': { type: 'string', default: 'low' },
      alerts: { type: 'string' },
      out: { type: 'string' },
    },
  });
  runDiff({ alertsFile: values.alerts, minRisk: values['min-risk'], out: values.out }).then(
    ({ markdown, failing }) => {
      console.log(markdown);
      process.exit(failing > 0 ? 1 : 0);
    },
    (error) => {
      console.error(`zap:diff failed: ${error.message}`);
      process.exit(2);
    }
  );
}

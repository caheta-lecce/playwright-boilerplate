import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { approveFindings, parseAccepted, serializeAccepted, toFindings } from './zap/alerts.mjs';
import { ACCEPTED_FILE, ALERTS_FILE } from './zap/paths.mjs';

// `npm run zap:findings:approve -- --reason "<text>" [--prune] [--dry-run]`
// Records every current finding (reports/zap/alerts.json) that is not accepted yet in
// docs/zap/zap-accepted-findings.json, with the reason and today's date. Review that file's diff
// before committing: it is the list of findings the team has decided to live with.
export async function runApprove({
  reason,
  prune = false,
  dryRun = false,
  alertsFile = ALERTS_FILE,
  acceptedFile = ACCEPTED_FILE,
  date = new Date().toISOString().slice(0, 10),
}) {
  const fetched = JSON.parse(
    await readFile(alertsFile, 'utf8').catch(() => {
      throw new Error(`No alerts file at ${alertsFile}. Run \`npm run zap:report:fetch\` first.`);
    })
  );
  const accepted = await readFile(acceptedFile, 'utf8').then(parseAccepted, (error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const { entries, added, removed } = approveFindings({
    current: toFindings(fetched.alerts),
    accepted,
    reason,
    date,
    prune,
  });
  if (!dryRun) {
    await mkdir(path.dirname(acceptedFile), { recursive: true });
    await writeFile(acceptedFile, serializeAccepted(entries));
  }
  return { added, removed, total: entries.length, dryRun };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      reason: { type: 'string' },
      prune: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  runApprove({ reason: values.reason, prune: values.prune, dryRun: values['dry-run'] }).then(
    ({ added, removed, total, dryRun }) => {
      for (const f of added)
        console.log(`+ ${f.risk} ${f.pluginId} ${f.alert} ${f.method} ${f.url}`);
      console.log(
        `${dryRun ? 'Dry run: would accept' : 'Accepted'} ${added.length} new finding(s), ` +
          `removed ${removed} stale; ${total} accepted in total.`
      );
    },
    (error) => {
      console.error(`zap:findings:approve failed: ${error.message}`);
      process.exit(2);
    }
  );
}

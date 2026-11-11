// `npm run a11y:report [-- <run|latest|path>] [--out <dir>]`: writes summary.md and issues.csv for a
// run (default: the latest) into the run folder, or into --out.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsv, buildMarkdown } from './a11y/report.mjs';
import { loadRun, resolveRun, toFindings } from './a11y/results.mjs';

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex === -1 ? undefined : args.splice(outIndex, 2)[1];
  const run = await resolveRun(args[0]);
  const { scans } = await loadRun(run.dir);
  const findings = toFindings(scans);
  const outDir = out ?? run.dir;
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, 'summary.md'),
    buildMarkdown({ runId: run.id, scanCount: scans.length, findings })
  );
  await writeFile(path.join(outDir, 'issues.csv'), buildCsv({ findings }));
  console.log(
    `a11y report for run ${run.id}: ${scans.length} scan(s), ${findings.length} finding(s)`
  );
  console.log(`  ${path.join(outDir, 'summary.md')}\n  ${path.join(outDir, 'issues.csv')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`a11y:report failed: ${error.message}`);
    process.exit(2);
  });

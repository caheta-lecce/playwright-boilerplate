// `npm run a11y:report:xlsx [-- <run|latest|path>] [--out <file.xlsx>]`: writes the Excel report of
// a run (default: the latest) to <run folder>/a11y-report.xlsx, or to --out. A11Y_SPRINT fills the
// Sprint column. Runs under Node's native type stripping, hence the explicit `.ts`/`.mjs` imports.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeA11yExcelReport } from './a11y/excel.ts';
import { loadRun, resolveRun } from './a11y/results.mjs';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex === -1 ? undefined : args.splice(outIndex, 2)[1];
  const run = await resolveRun(args[0]);
  const { scans } = await loadRun(run.dir);
  const target = out ?? path.join(run.dir, 'a11y-report.xlsx');
  await mkdir(path.dirname(path.resolve(target)), { recursive: true });
  await writeA11yExcelReport(scans, target, { sprint: process.env['A11Y_SPRINT'] ?? '' });
  const violations = scans.reduce((sum, scan) => sum + scan.violations.length, 0);
  console.log(
    `a11y Excel report for run ${run.id}: ${scans.length} scan(s), ${violations} violation(s)`
  );
  console.log(`  ${target}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(
      `a11y:report:xlsx failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(2);
  });

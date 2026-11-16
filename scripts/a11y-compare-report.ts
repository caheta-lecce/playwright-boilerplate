// `npm run a11y:compare:report -- <baseline run|path> <head run|latest> [--out-dir <dir>]
// [--fail-on-new] [--playwright-report-dir <dir>]`
//
// Writes a11y-compare.xlsx (Summary, Violations, Comparison) and a11y-report.html (with a
// "Baseline comparison" section) into the head run folder or --out-dir, and copies both into
// <playwright-report>/a11y/ so they travel with the Playwright HTML report. With a single run
// argument it writes a11y-report.xlsx + a11y-report.html (no comparison). Exit code is 0 unless
// --fail-on-new is given and there are New findings. A11Y_SPRINT fills the Sprint column.
import { appendFile, copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildComparison,
  buildComparisonMarkdown,
  buildComparisonWorkbook,
} from './a11y/compare-report.ts';
import { buildA11yExcelWorkbook } from './a11y/excel.ts';
import { buildA11yHtmlReport } from './a11y/html-report.ts';
import { loadRun, resolveRun } from './a11y/results.mjs';

interface CliOptions {
  runs: string[];
  outDir?: string;
  failOnNew: boolean;
  playwrightReportDir: string;
}

export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    runs: [],
    failOnNew: false,
    playwrightReportDir: 'playwright-report',
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? '';
    if (arg === '--fail-on-new') options.failOnNew = true;
    else if (arg === '--out-dir' || arg === '--playwright-report-dir') {
      const value = args[++index];
      if (!value) throw new Error(`${arg} needs a value.`);
      if (arg === '--out-dir') options.outDir = value;
      else options.playwrightReportDir = value;
    } else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}.`);
    else options.runs.push(arg);
  }
  if (options.runs.length < 1 || options.runs.length > 2)
    throw new Error('Usage: a11y:compare:report <baseline> <head> [options], or <run> alone.');
  return options;
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const [baseRef, headRef] =
    options.runs.length === 2 ? options.runs : [undefined, options.runs[0]];
  const head = await resolveRun(headRef);
  const headScans = (await loadRun(head.dir)).scans;
  const sprint = process.env['A11Y_SPRINT'] ?? '';
  const outDir = options.outDir ?? head.dir;
  await mkdir(outDir, { recursive: true });

  let comparison;
  let xlsxName = 'a11y-report.xlsx';
  if (baseRef) {
    const base = await resolveRun(baseRef);
    comparison = buildComparison({
      baseId: base.id,
      headId: head.id,
      baseScans: (await loadRun(base.dir)).scans,
      headScans,
    });
    xlsxName = 'a11y-compare.xlsx';
  }

  const workbook = comparison
    ? buildComparisonWorkbook(headScans, comparison, { sprint })
    : buildA11yExcelWorkbook(headScans, { sprint });
  const xlsxPath = path.join(outDir, xlsxName);
  const htmlPath = path.join(outDir, 'a11y-report.html');
  await workbook.xlsx.writeFile(xlsxPath);
  await writeFile(htmlPath, buildA11yHtmlReport({ runId: head.id, scans: headScans, comparison }));

  // The Playwright report is already finished, so the files are copied next to it, not attached.
  const copyDir = path.join(options.playwrightReportDir, 'a11y');
  await mkdir(copyDir, { recursive: true });
  for (const file of [xlsxPath, htmlPath])
    await copyFile(file, path.join(copyDir, path.basename(file)));

  if (comparison) {
    const { counts } = comparison;
    console.log(
      `a11y comparison ${comparison.baseId} -> ${comparison.headId}: Fixed ${counts.Fixed}, Still open ${counts['Still open']}, New ${counts.New}`
    );
    const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryFile) await appendFile(summaryFile, `${buildComparisonMarkdown(comparison)}\n`);
  } else {
    console.log(`a11y report for run ${head.id}: ${headScans.length} scan(s)`);
  }
  console.log(`  ${xlsxPath}\n  ${htmlPath}\n  copied to ${copyDir}`);
  if (comparison && options.failOnNew && comparison.counts.New > 0) {
    console.error(`--fail-on-new: ${comparison.counts.New} new finding(s).`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error: unknown) => {
    console.error(
      `a11y:compare:report failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(2);
  });

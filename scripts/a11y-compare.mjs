// `npm run a11y:compare -- <base> <head> [--no-fail] [--out <file.md>]`: compares two runs (ids,
// `latest`, `previous`, or folders). Exits 1 when the head run has new violations unless --no-fail;
// exits 2 on usage errors such as an unknown run. Defaults: base `previous`, head `latest`.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompareMarkdown, compareRuns } from './a11y/compare.mjs';
import { loadRun, resolveRun, toFindings } from './a11y/results.mjs';

async function main() {
  const args = process.argv.slice(2);
  const noFail = args.includes('--no-fail');
  const outIndex = args.indexOf('--out');
  const out = outIndex === -1 ? undefined : args.splice(outIndex, 2)[1];
  const [baseRef = 'previous', headRef = 'latest'] = args.filter((a) => a !== '--no-fail');
  const base = await resolveRun(baseRef);
  const head = await resolveRun(headRef);
  const result = compareRuns(
    toFindings((await loadRun(base.dir)).scans),
    toFindings((await loadRun(head.dir)).scans)
  );
  const markdown = buildCompareMarkdown({ baseId: base.id, headId: head.id, result });
  console.log(markdown);
  if (out) {
    await mkdir(path.dirname(path.resolve(out)), { recursive: true });
    await writeFile(out, markdown);
  }
  process.exit(result.added.length > 0 && !noFail ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`a11y:compare failed: ${error.message}`);
    process.exit(2);
  });

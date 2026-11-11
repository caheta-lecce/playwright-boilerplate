// Runs Playwright for one tag suite: `node scripts/run-suite.mjs <smoke|regression|destructive> [playwright args]`.
//
// Why not `playwright test --grep @smoke`: a CLI grep also filters the auth setup projects that
// every spec project depends on, so no session would be saved. The tag travels in TEST_GREP and
// playwright.config.ts applies it to the spec projects only.
// `smoke` and `regression` never include `@destructive` tests; `destructive` runs only those.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const SUITES = ['smoke', 'regression', 'destructive'];

export function suiteArgs(suite, extraArgs = []) {
  if (!SUITES.includes(suite))
    throw new Error(`Unknown suite "${suite}". Use: ${SUITES.join(', ')}`);
  return suite === 'destructive'
    ? ['test', '--pass-with-no-tests', ...extraArgs]
    : ['test', '--grep-invert', '@destructive', ...extraArgs];
}

function main() {
  const [suite, ...extraArgs] = process.argv.slice(2);
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const result = spawnSync(process.execPath, [cli, ...suiteArgs(suite, extraArgs)], {
    stdio: 'inherit',
    env: { ...process.env, TEST_GREP: `@${suite}` },
  });
  process.exit(result.status ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

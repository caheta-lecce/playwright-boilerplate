import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createZapClient, ZapUnreachableError, zapConfigFromEnv } from './zap/client.mjs';
import { fetchToFile } from './zap-report-fetch.mjs';
import { runDiff } from './zap-diff.mjs';

// `npm run zap:run [-- --min-risk <risk>] [--out <md>]`: the whole flow in one command.
//   1. check the daemon  2. configure baseline  3. reset session  4. run journeys  5. fetch  6. diff
// Stops at the first failing step and says which one. Exit 1: new findings; exit 2: a step failed.
const root = path.resolve(import.meta.dirname, '..');
const step = (n, text) => console.log(`\n[zap:run] step ${n}/6: ${text}`);

function fail(message) {
  console.error(`\n[zap:run] FAILED: ${message}`);
  process.exit(2);
}

function runNode(args, what) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root });
  if (result.status !== 0) fail(`${what} exited with code ${result.status ?? 'unknown'}.`);
}

async function main() {
  const { values } = parseArgs({
    options: { 'min-risk': { type: 'string', default: 'low' }, out: { type: 'string' } },
  });
  const client = createZapClient(zapConfigFromEnv());

  step(1, `check the ZAP daemon at ${client.baseUrl}`);
  try {
    const { version } = await client.call('core', 'view/version');
    console.log(`ZAP ${version} is reachable.`);
  } catch (error) {
    fail(
      error instanceof ZapUnreachableError ? error.message : `ZAP is not usable: ${error.message}`
    );
  }

  step(2, 'configure the pinned baseline');
  runNode([path.join(root, 'scripts', 'configure-zap-baseline.mjs')], 'the baseline check');
  step(3, 'reset the ZAP session');
  runNode([path.join(root, 'scripts', 'reset-zap-session.mjs')], 'the session reset');
  step(4, 'run the ZAP journeys through the proxy');
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  runNode(
    [cli, 'test', '--config=playwright.zap.config.ts', '--project=zap-chromium'],
    'the journeys (traffic may be incomplete, so no scan result is trusted)'
  );
  step(5, 'fetch the alerts');
  try {
    await fetchToFile(undefined, client);
  } catch (error) {
    fail(`fetching alerts: ${error.message}`);
  }
  step(6, 'diff against the accepted findings');
  try {
    const { markdown, failing } = await runDiff({ minRisk: values['min-risk'], out: values.out });
    console.log(markdown);
    process.exit(failing > 0 ? 1 : 0);
  } catch (error) {
    fail(`diff: ${error.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

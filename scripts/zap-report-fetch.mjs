import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createZapClient, zapConfigFromEnv } from './zap/client.mjs';
import { fetchAlerts } from './zap/fetch.mjs';
import { ALERTS_FILE } from './zap/paths.mjs';

// `npm run zap:report:fetch [-- --out <file>]`: pulls the current alerts from the ZAP daemon into
// reports/zap/alerts.json (git-ignored). Waits for the passive scanner queue to drain first.
export async function fetchToFile(out = ALERTS_FILE, client = createZapClient(zapConfigFromEnv())) {
  const { zapVersion, baseUrl, alerts } = await fetchAlerts(client);
  await mkdir(path.dirname(out), { recursive: true });
  const body = { fetchedAt: new Date().toISOString(), zapVersion, baseUrl, alerts };
  await writeFile(out, `${JSON.stringify(body, null, 2)}\n`);
  console.log(`Fetched ${alerts.length} alert(s) from ZAP ${zapVersion} to ${out}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: 'string' } } });
  fetchToFile(values.out ?? ALERTS_FILE).catch((error) => {
    console.error(`zap:report:fetch failed: ${error.message}`);
    process.exit(2);
  });
}

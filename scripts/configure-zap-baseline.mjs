import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

// Verifies the running ZAP daemon matches the pinned baseline in docs/zap/zap-baseline.json (core
// version, pscan / pscanrules add-on versions, full passive rule ID set), then applies the
// baseline's enabled state and alert threshold to every rule. See docs/zap/zap-proxy-scan.md.

const baseline = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, '../docs/zap/zap-baseline.json'), 'utf8')
);
const baseUrl = (process.env.ZAP_PROXY_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const apiKey = process.env.ZAP_KEY;

async function zap(component, operation, params = {}) {
  const query = new URLSearchParams(params);
  if (apiKey) query.set('apikey', apiKey);
  const response = await fetch(`${baseUrl}/JSON/${component}/${operation}/?${query}`, {
    headers: apiKey ? { 'X-ZAP-API-Key': apiKey } : undefined,
  });
  if (!response.ok) {
    throw new Error(`ZAP ${component}/${operation} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  if (body.code) throw new Error(`ZAP ${component}/${operation}: ${body.message ?? body.code}`);
  return body;
}

async function main() {
  const { version } = await zap('core', 'view/version');
  if (version !== baseline.zapVersion) {
    throw new Error(
      `ZAP ${version} is installed; the pinned baseline requires ${baseline.zapVersion}.`
    );
  }

  const { installedAddons } = await zap('autoupdate', 'view/installedAddons');
  for (const [id, expectedVersion] of Object.entries(baseline.addons)) {
    const installed = installedAddons.find(
      (addon) => addon.id === id && addon.installationStatus === 'INSTALLED'
    );
    if (!installed || installed.version !== expectedVersion) {
      throw new Error(
        `ZAP add-on ${id} is ${installed?.version ?? 'missing'}; the pinned baseline requires ${expectedVersion}.`
      );
    }
  }

  const { scanners } = await zap('pscan', 'view/scanners');
  const expectedIds = [...baseline.passiveScan.ruleIds].sort();
  const actualIds = scanners.map(({ id }) => id).sort();
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  const unexpected = actualIds.filter((id) => !expectedIds.includes(id));
  if (missing.length || unexpected.length) {
    throw new Error(
      `Passive-scan rule set differs from the pinned baseline. Missing: ${missing.join(', ') || 'none'}. ` +
        `Unexpected: ${unexpected.join(', ') || 'none'}.`
    );
  }

  const { enabled, alertThreshold } = baseline.passiveScan;
  await zap('pscan', 'action/setEnabled', { enabled: String(enabled) });
  for (const scanner of scanners) {
    if (scanner.enabled !== String(enabled)) {
      await zap('pscan', `action/${enabled ? 'enableScanners' : 'disableScanners'}`, {
        ids: scanner.id,
      });
    }
    if (scanner.alertThreshold !== alertThreshold) {
      await zap('pscan', 'action/setScannerAlertThreshold', { id: scanner.id, alertThreshold });
    }
  }

  const addons = Object.entries(baseline.addons)
    .map(([id, addonVersion]) => `${id}@${addonVersion}`)
    .join(', ');
  console.log(
    `ZAP baseline ready: ${version}; add-ons ${addons}; ${scanners.length} passive-scan rules enabled at ${alertThreshold}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

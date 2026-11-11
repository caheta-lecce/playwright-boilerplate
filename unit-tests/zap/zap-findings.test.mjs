import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  approveFindings,
  buildDiffMarkdown,
  diffFindings,
  parseAccepted,
  parseRisk,
  serializeAccepted,
  toFindings,
} from '../../scripts/zap/alerts.mjs';
import { createZapClient, ZapUnreachableError } from '../../scripts/zap/client.mjs';
import { fetchAlerts } from '../../scripts/zap/fetch.mjs';
import { runApprove } from '../../scripts/zap-findings-approve.mjs';
import { runDiff } from '../../scripts/zap-diff.mjs';

// Sample alerts written by hand in the shape of ZAP's /JSON/core/view/alerts/ response.
const csp = {
  pluginId: '10038',
  alert: 'Content Security Policy (CSP) Header Not Set',
  risk: 'Medium',
  confidence: 'High',
  method: 'GET',
  url: 'http://127.0.0.1:4173/?utm=1',
  param: '',
  cweid: '693',
};
const cspSameInstance = { ...csp, url: 'http://127.0.0.1:4173/?utm=2' };
const nosniff = {
  pluginId: '10021',
  alert: 'X-Content-Type-Options Header Missing',
  risk: 'Low',
  method: 'GET',
  url: 'http://127.0.0.1:4173/',
  param: 'x-content-type-options',
};
const modern = {
  pluginId: '10109',
  alert: 'Modern Web Application',
  riskcode: '0',
  method: 'GET',
  url: 'http://127.0.0.1:4173/',
  param: '',
};
const high = { pluginId: '40012', alert: 'XSS', risk: 'High', method: 'POST', url: 'http://x/y' };

test('alerts are normalised, de-duplicated and sorted by risk', () => {
  const findings = toFindings([modern, nosniff, csp, cspSameInstance]);
  assert.deepEqual(
    findings.map((f) => [f.pluginId, f.risk, f.url]),
    [
      ['10038', 'Medium', 'http://127.0.0.1:4173/'],
      ['10021', 'Low', 'http://127.0.0.1:4173/'],
      ['10109', 'Informational', 'http://127.0.0.1:4173/'],
    ]
  );
  assert.deepEqual(toFindings([]), []);
});

test('diff: new findings fail only at or above the threshold', () => {
  const current = toFindings([csp, nosniff, modern]);
  const accepted = toFindings([csp]);
  const low = diffFindings(current, accepted, 'low');
  assert.deepEqual(
    low.failing.map((f) => f.pluginId),
    ['10021']
  );
  assert.deepEqual(
    low.belowThreshold.map((f) => f.pluginId),
    ['10109']
  );
  assert.equal(diffFindings(current, accepted, 'medium').failing.length, 0);
  assert.equal(diffFindings(current, accepted, 'informational').failing.length, 2);
  assert.equal(low.acceptedPresent.length, 1);
});

test('diff: accepted findings that disappear are reported as stale', () => {
  const result = diffFindings(toFindings([nosniff]), toFindings([csp, nosniff]), 'low');
  assert.deepEqual(
    result.stale.map((f) => f.pluginId),
    ['10038']
  );
  assert.equal(result.failing.length, 0);
});

test('diff: a regression (a High finding appears) is flagged', () => {
  const result = diffFindings(toFindings([csp, high]), toFindings([csp]), 'high');
  assert.deepEqual(
    result.failing.map((f) => f.alert),
    ['XSS']
  );
  const markdown = buildDiffMarkdown({ result, minRisk: 'High', total: 2 });
  assert.match(markdown, /Result: FAIL/);
  assert.match(markdown, /\| High \| 40012 \| XSS \| POST \|/);
});

test('diff: an empty scan against an empty list is clean', () => {
  const result = diffFindings([], [], 'low');
  assert.match(buildDiffMarkdown({ result, total: 0 }), /Result: OK/);
});

test('risk names are validated', () => {
  assert.equal(parseRisk('MEDIUM'), 'Medium');
  assert.throws(() => parseRisk('severe'), /Unknown risk "severe"/);
});

test('approving needs a reason and keeps earlier reasons', () => {
  const current = toFindings([csp, nosniff]);
  assert.throws(
    () => approveFindings({ current, accepted: [], reason: '  ', date: '2026-01-01' }),
    /needs a reason/
  );
  const first = approveFindings({
    current: toFindings([csp]),
    accepted: [],
    reason: 'Demo app, no CSP needed',
    date: '2026-01-01',
  });
  const second = approveFindings({
    current,
    accepted: first.entries,
    reason: 'Static demo header',
    date: '2026-02-01',
  });
  assert.equal(second.added.length, 1);
  assert.equal(
    second.entries.find((e) => e.pluginId === '10038').reason,
    'Demo app, no CSP needed'
  );
  assert.equal(second.entries.find((e) => e.pluginId === '10021').approvedAt, '2026-02-01');
  const pruned = approveFindings({
    current: toFindings([nosniff]),
    accepted: second.entries,
    reason: 'cleanup',
    date: '2026-03-01',
    prune: true,
  });
  assert.equal(pruned.removed, 1);
  assert.deepEqual(
    pruned.entries.map((e) => e.pluginId),
    ['10021']
  );
});

test('the accepted file is stable and round-trips', () => {
  const { entries } = approveFindings({
    current: toFindings([nosniff, csp]),
    accepted: [],
    reason: 'r',
    date: '2026-01-01',
  });
  const text = serializeAccepted(entries);
  assert.ok(text.endsWith('}\n'));
  assert.equal(serializeAccepted(parseAccepted(text)), text);
  assert.throws(() => parseAccepted('{"schema":9,"findings":[]}'), /schema 1/);
});

test('runDiff and runApprove work on files, and a missing alerts file is explained', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'zap-'));
  try {
    const alertsFile = path.join(dir, 'alerts.json');
    const acceptedFile = path.join(dir, 'accepted.json');
    await assert.rejects(runDiff({ alertsFile, acceptedFile }), /zap:report:fetch/);
    await writeFile(alertsFile, JSON.stringify({ alerts: [csp, nosniff] }));

    assert.equal((await runDiff({ alertsFile, acceptedFile, minRisk: 'low' })).failing, 2);
    await assert.rejects(runApprove({ alertsFile, acceptedFile, date: 'd' }), /needs a reason/);
    const dry = await runApprove({
      alertsFile,
      acceptedFile,
      reason: 'x',
      dryRun: true,
      date: 'd',
    });
    assert.equal(dry.added.length, 2);
    await assert.rejects(readFile(acceptedFile), { code: 'ENOENT' });

    await runApprove({ alertsFile, acceptedFile, reason: 'demo', date: '2026-01-01' });
    assert.equal((await runDiff({ alertsFile, acceptedFile })).failing, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// A stub of the ZAP JSON API on a real local socket: exercises the client, key header, paging and
// the passive-scan wait over HTTP. It is NOT a ZAP daemon; see the report for what that leaves open.
async function withStubZap(handler, run) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ url: request.url, key: request.headers['x-zap-api-key'] });
    const body = handler(new URL(request.url, 'http://stub'), requests);
    response.writeHead(body.status ?? 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body.json ?? {}));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, requests);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('fetchAlerts pages through the API after the passive scan queue drains', async () => {
  const total = 1100;
  const all = Array.from({ length: total }, (_, i) => ({ ...nosniff, url: `http://s/${i}` }));
  let queue = 2;
  await withStubZap(
    (url) => {
      const op = url.pathname;
      if (op.includes('/core/view/version')) return { json: { version: '2.17.0' } };
      if (op.includes('/pscan/view/recordsToScan'))
        return { json: { recordsToScan: String(queue--) } };
      const start = Number(url.searchParams.get('start'));
      const count = Number(url.searchParams.get('count'));
      return { json: { alerts: all.slice(start, start + count) } };
    },
    async (baseUrl, requests) => {
      const client = createZapClient({ baseUrl, apiKey: 'secret' });
      const result = await fetchAlerts(client, { intervalMs: 1 });
      assert.equal(result.alerts.length, total);
      assert.equal(result.zapVersion, '2.17.0');
      assert.ok(requests.every((r) => r.key === 'secret'));
      assert.equal(requests.filter((r) => r.url.includes('recordsToScan')).length, 3);
    }
  );
});

test('fetchAlerts reports a passive scan that never drains', async () => {
  await withStubZap(
    (url) =>
      url.pathname.includes('version')
        ? { json: { version: '2.17.0' } }
        : { json: { recordsToScan: '5' } },
    async (baseUrl) => {
      const client = createZapClient({ baseUrl });
      await assert.rejects(
        fetchAlerts(client, { timeoutMs: 20, intervalMs: 5 }),
        /still has 5 record\(s\) queued/
      );
    }
  );
});

test('API errors are explained: bad key and ZAP error codes', async () => {
  await withStubZap(
    (url) =>
      url.pathname.includes('version') ? { status: 401 } : { json: { code: 'bad_api_key' } },
    async (baseUrl) => {
      const client = createZapClient({ baseUrl });
      await assert.rejects(client.call('core', 'view/version'), /Set ZAP_KEY/);
      await assert.rejects(client.call('core', 'view/alerts'), /bad_api_key/);
    }
  );
});

test('an unreachable daemon gives an actionable message', async () => {
  const client = createZapClient({ baseUrl: 'http://127.0.0.1:9' });
  await assert.rejects(client.call('core', 'view/version'), (error) => {
    assert.ok(error instanceof ZapUnreachableError);
    assert.match(error.message, /Could not reach the ZAP daemon at http:\/\/127\.0\.0\.1:9/);
    assert.match(error.message, /docs\/zap\/zap-proxy-scan\.md/);
    return true;
  });
});

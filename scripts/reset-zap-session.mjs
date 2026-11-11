import 'dotenv/config';

// Clears the running ZAP daemon's session (alerts, history, sites tree) before a new
// traffic-generation run, so passive-scan results from a previous run don't leak into the next
// one's report. Run it right before `npm run test:zap` (the script already does).
// See docs/zap/zap-proxy-scan.md.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const base = (process.env.ZAP_PROXY_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const apiKey = process.env.ZAP_KEY;
const headers = apiKey ? { 'X-ZAP-API-Key': apiKey } : undefined;

// newSession tends to fail with HTTP 500 while the passive scanner is still draining its queue.
async function waitForPassiveScanIdle() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/JSON/pscan/view/recordsToScan/`, { headers });
    if (!res.ok) return;
    const { recordsToScan } = await res.json();
    if (Number(recordsToScan) === 0) return;
    await sleep(2000);
  }
}

async function main() {
  const params = new URLSearchParams({ name: '', overwrite: 'true' });
  const maxAttempts = 5;
  let res;
  let body = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await waitForPassiveScanIdle();
      res = await fetch(`${base}/JSON/core/action/newSession/?${params}`, { headers });
    } catch (cause) {
      throw new Error(
        `Could not reach the ZAP daemon at ${base}. Start it first (see docs/zap/zap-proxy-scan.md, ` +
          'step 1) or set ZAP_PROXY_URL if it is listening elsewhere.',
        { cause }
      );
    }
    if (res.ok) break;
    body = await res.text();
    // 5xx means ZAP itself failed (session busy / still starting up), which is transient.
    if (res.status < 500 || attempt === maxAttempts) break;
    console.warn(
      `ZAP newSession returned HTTP ${res.status}, retry ${attempt}/${maxAttempts - 1}...`
    );
    await sleep(3000 * attempt);
  }
  if (!res?.ok) {
    const hint =
      res?.status === 401 || res?.status === 403 || body.includes('bad_api_key')
        ? 'Set ZAP_KEY to the API key configured in the ZAP daemon.'
        : 'ZAP failed internally (session busy or still starting): check the ZAP log, or restart the daemon.';
    throw new Error(`ZAP session reset failed (HTTP ${res?.status}): ${body}. ${hint}`);
  }

  console.log('ZAP session cleared: alerts and history of the previous run removed.');
  await setConnectionTimeout();
}

// ZAP's default 20s read timeout is shorter than some real backend calls take, and ZAP then answers
// 504 itself, so the app sees an error the backend never returned. Raised on every run because the
// daemon may have been restarted.
const ZAP_CONNECTION_TIMEOUT_SECS = 60;

async function setConnectionTimeout() {
  const timeout = String(ZAP_CONNECTION_TIMEOUT_SECS);
  // Network add-on endpoint (ZAP 2.12+), with the deprecated core option as a fallback.
  const urls = [
    `${base}/JSON/network/action/setConnectionTimeout/?${new URLSearchParams({ timeout })}`,
    `${base}/JSON/core/action/setOptionTimeoutInSecs/?${new URLSearchParams({ Integer: timeout })}`,
  ];
  for (const url of urls) {
    const res = await fetch(url, { headers });
    if (res.ok) {
      console.log(`ZAP connection timeout set to ${timeout}s.`);
      return;
    }
  }
  throw new Error(
    `Could not set the ZAP connection timeout to ${timeout}s: calls slower than 20s will get a 504 from ZAP.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

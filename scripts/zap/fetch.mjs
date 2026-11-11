// Pulls the current alerts from a ZAP daemon. Takes a client from client.mjs, so tests can point it
// at a stub server or a failing fetch.
const PAGE_SIZE = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until the passive scanner has analysed all queued traffic, so no alert is missed. */
export async function waitForPassiveScan(client, { timeoutMs = 60_000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { recordsToScan } = await client.call('pscan', 'view/recordsToScan');
    if (Number(recordsToScan) === 0) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `ZAP's passive scanner still has ${recordsToScan} record(s) queued after ${timeoutMs / 1000}s; ` +
          'try again once it has drained.'
      );
    }
    await sleep(intervalMs);
  }
}

export async function fetchAlerts(client, options = {}) {
  const { version } = await client.call('core', 'view/version');
  await waitForPassiveScan(client, options);
  const alerts = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = await client.call('core', 'view/alerts', {
      start: String(start),
      count: String(PAGE_SIZE),
    });
    alerts.push(...page.alerts);
    if (page.alerts.length < PAGE_SIZE) break;
  }
  return { zapVersion: version, baseUrl: client.baseUrl, alerts };
}

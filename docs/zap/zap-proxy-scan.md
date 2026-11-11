# Drive Playwright through an OWASP ZAP proxy for passive DAST scanning

Use this workflow to have the automated UI journeys generate real traffic for OWASP ZAP to
passively scan, instead of clicking through the app by hand with a browser pointed at ZAP. This is
the _traffic-generation_ half of a ZAP pipeline; fetching, diffing and accepting the alerts is covered by the `zap:*` scripts below.

The suite lives in its own folder and config, so it never runs as part of `npm test`:

- Specs: `src/tests/security/zap/**/*.spec.ts`. `playwright.config.ts` ignores that folder.
- Config: `playwright.zap.config.ts`.
- Scripts: `npm run test:zap`, `test:zap:headed`, `test:zap:no-proxy`, `zap:baseline`, `zap:reset`, plus `zap:run`, `zap:report:fetch`, `zap:diff`
  and `zap:findings:approve` (see "Alert report, accepted findings and the one-command flow").

Only run it against an application you are allowed to test. Never point it at production.

## 0. Prerequisites

- **Pinned ZAP baseline.** [`zap-baseline.json`](./zap-baseline.json) pins ZAP `2.17.0`, Passive
  Scanner (`pscan`) `0.6.0` and Passive Scan Rules (`pscanrules`) `76.0.0`, with every passive rule
  enabled at the `DEFAULT` alert threshold ([rule list](./passive-scan-rules.md)). Install that
  ZAP release and those add-on versions, and **turn off automatic add-on updates** in the ZAP
  profile, so two runs are comparable. `npm run test:zap` runs `npm run zap:baseline` first: it
  fails before any test traffic if the ZAP core, either add-on or the complete passive-rule ID set
  differs, then applies the enabled state and threshold from the lock file. When you upgrade ZAP
  on purpose, update the lock file and this guide together.
- **ZAP running as a proxy before the tests start** (step 1). The browser is pointed at
  `ZAP_PROXY_URL` (default `http://127.0.0.1:8080`); if nothing listens there, requests fail at the
  proxy handshake with an error that does not point back at ZAP.
- **Optional `ZAP_KEY`.** If the daemon has an API key, set `ZAP_KEY` in `.env`; both scripts send it.

## 1. Start ZAP as a proxy

Run ZAP in daemon mode, with the pinned add-ons installed in the same profile:

```sh
# Windows
zap.bat -daemon -host 127.0.0.1 -port 8080 -config api.disablekey=true

# macOS
/Applications/ZAP.app/Contents/Java/zap.sh -daemon -host 127.0.0.1 -port 8080 -config api.disablekey=true

# Linux
zap.sh -daemon -host 127.0.0.1 -port 8080 -config api.disablekey=true
```

`api.disablekey=true` is only for a daemon bound to localhost; otherwise keep the key and set
`ZAP_KEY`. The ZAP Desktop UI works too, as its local proxy already defaults to port `8080`.

Scope a ZAP Context to your application's host only. Passive scanning of third-party traffic (for
example a login provider) is read-only analysis, but never include third-party hosts in the scope
of an active scan.

## 2. Run the journeys

```sh
npm run test:zap          # baseline check, session reset, then the journeys through the proxy
npm run test:zap:headed   # same, with a visible browser
```

The Playwright project sets the proxy with `bypass: '<-loopback>'` because Chromium never proxies
`127.0.0.1` / `localhost` otherwise. `ignoreHTTPSErrors` stays on because ZAP re-signs HTTPS with
its own CA. Timeouts are raised (90s test, 30s expect) because proxied traffic is slower.

To run only some journeys, add Playwright's filter:

```sh
npm run test:zap -- --grep "sign in"
```

### Comparable runs

To compare two scans, keep the same `--grep`, the same `ENV` / `BASE_URL`, and the same ZAP core
and add-on baseline. Narrow the set with `--grep`, never with `test.only`, which the guideline
checks reject. Each `npm run test:zap` resets the ZAP session first, so export the report from the
previous run before starting the next one.

## 3. Passive scanning and reports

Nothing else is needed: ZAP's passive rules run in the background as traffic flows through the
proxy, so the Alerts panel is populated by the time the tests finish. Wait for the passive scanner
queue to drain (`/JSON/pscan/view/recordsToScan/` reaching `0`), then export the report from ZAP
(_Report > Generate Report_) or from its Reports API. Playwright's own HTML report is written to
`playwright-report/zap/`.

Do not rerun `npm run test:zap` just to retry an export: it clears the session and discards the
traffic you already generated.

## Alert report, accepted findings and the one-command flow

`zap-baseline.json` is a **rule configuration** (ZAP version, add-ons, rule set, threshold). It is
not a list of accepted findings, so a separate file holds those:
[`zap-accepted-findings.json`](./zap-accepted-findings.json) (created by the first approval; a
missing file means "nothing accepted"). Each entry has the rule id, alert name, risk, method, URL
(without the query string), parameter, the reason and the approval date, sorted so a review diff
shows only what changed. A finding is identified by rule id + method + URL + parameter.

| Command                                             | What it does                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run zap:report:fetch`                          | Waits for the passive-scan queue to drain, then writes the daemon's alerts to `reports/zap/alerts.json` (git-ignored).                                                                                                                                                                 |
| `npm run zap:diff`                                  | Compares those alerts with the accepted findings; Markdown on stdout (`--out <file>` saves it). Exit 1 when there are new findings at or above `--min-risk <informational\|low\|medium\|high>` (default `low`), exit 2 on errors. Accepted findings that vanished are listed as stale. |
| `npm run zap:findings:approve -- --reason "<text>"` | Accepts every current finding that is not accepted yet, with the reason and date. `--dry-run` only prints; `--prune` also drops stale entries. Without `--reason` it refuses. Review the file's diff before committing.                                                                |
| `npm run zap:run`                                   | Checks the daemon, configures the baseline, resets the session, runs the journeys, fetches the alerts and diffs them. Stops at the first failing step and names it; an unreachable daemon is reported in step 1. Accepts `--min-risk` and `--out`.                                     |

Run `npm run zap:run`; if the diff fails, fix the finding or accept it with a reason. Like the
journeys, these scripts read `ZAP_PROXY_URL` and `ZAP_KEY`. The pure logic lives in `scripts/zap/`
with tests in `unit-tests/zap/`.

## No-proxy mode

```sh
npm run test:zap:no-proxy
```

Runs the same journeys without any proxy, so no ZAP daemon is needed. Use it to confirm the
journeys are green before spending a real scan run. Setting `ZAP_PROXY=off` in `.env` also drops
the proxy from the `zap-chromium` project.

## Constraints

- Keep the journey list small and deliberate: this is a scan run, not a replacement for the
  regression suite.
- CI does not run it: that would add a ZAP daemon to the pipeline. Validate the local flow first.

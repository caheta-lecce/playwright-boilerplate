---
name: debug-test
description: Triage a failing, flaky or unexpectedly behaving Playwright test — read the failure message, classify the failure mode (timeout on action/assertion/navigation, strict-mode violation, assertion mismatch, Zod validation error, network error, fixture/import error, order dependence), reproduce it narrowly, pick the right tool (UI Mode, Trace Viewer, headed run), and fix the cause without suppressing it. Use whenever a test fails locally or in CI, a run is red in CI but green locally, or a test is flaky. To document the diagnosed failure afterwards, use log-test-error.
---

# Debug a failing test

Investigate first, fix second. This skill is the entry point for **after** a test breaks: what to
look at, in what order, and with which Playwright tool.

## Rules

- **Read the failure message before touching code.** Playwright errors name the failing locator or
  assertion, the timeout type, the expected vs received values, and the source line.
- **Never suppress a failure.** Don't loosen an assertion, raise a timeout to make a flake pass,
  wrap an `expect` in `try/catch`, or add `test.skip` without a comment linking a tracked issue.
- **Never add `page.waitForTimeout(...)`** to fix timing. Wait for observable state with a
  web-first assertion (`await expect(locator).toBeVisible()`) or `page.waitForResponse(...)`.
- **Don't commit `test.only`.** It's fine for narrowing locally, but `forbidOnly` fails the CI run.
- **Don't declare a flake fixed after one green run.** Run the affected test several times
  (`--repeat-each=5`) before closing it.

## What this template captures

Read `playwright.config.ts` to confirm the current values. By default:

| Artifact    | Setting              | Where it ends up                |
| ----------- | -------------------- | ------------------------------- |
| Trace       | `retain-on-failure`  | `test-results/<test>/trace.zip` |
| Screenshot  | `only-on-failure`    | `test-results/<test>/*.png`     |
| HTML report | always, never opened | `playwright-report/index.html`  |
| axe results | per `scanAxe(label)` | report attachment `axe-<label>` |

Retries are `2` in CI and `0` locally, so a test that passes on retry in CI is flaky, not fixed.

## Process

### 1. Read the failure

Identify the four parts of the output: the failing test (file, line, title), the failing action or
assertion with expected vs received values, the call stack, and the highlighted source snippet.
Most failures can be diagnosed here.

### 2. Classify the failure

| Symptom                                                   | Likely cause                                                        | Where to look                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Timeout on an **action** (`locator.click`)                | Wrong locator, element disabled or covered, page not loaded         | Trace Viewer: DOM snapshot at the timeout                                                  |
| Timeout on an **assertion** (`toBeVisible`)               | Element legitimately absent, wrong locator, race with navigation    | UI Mode: step just before the assertion                                                    |
| Timeout on **navigation** (`page.goto`)                   | Wrong `BASE_URL`, app down, environment not set                     | Check `.env` / `ENV` / `BASE_URL`; open the URL manually                                   |
| **Strict mode violation**: resolved to N elements         | Locator too loose                                                   | Scope to a parent, use a more specific role or name, or `{ exact: true }`                  |
| **Expected "X", received "Y"**                            | Page state, test data or UI copy changed                            | Compare values; if a shared value changed, use the `safe-rename` skill                     |
| **ZodError**                                              | Configuration or API response doesn't match the schema              | Configuration: fix the env value. API: check the contract before changing the schema       |
| `ECONNREFUSED`, `ENOTFOUND`, 5xx                          | Wrong base URL, service down, missing credentials                   | Environment and credentials, not the test                                                  |
| `undefined` fixture, `cannot read property of undefined`  | Page object not registered, `test` imported from `@playwright/test` | `lib/fixtures/page-fixture.ts`, `lib/fixtures/base.ts`; specs import from `@fixtures/base` |
| Setup project failed, every dependent test skipped        | Login flow broken or storage state not saved                        | Run the `<browser>-setup` project alone and read its trace                                 |
| Passes alone, fails in the full suite                     | Shared state between tests, parallel collision on the same account  | Make the test independent; use one account per worker for state-changing tests             |
| Accessibility: `Accessibility: <label>` expectation fails | axe found violations                                                | Open the `axe-<label>` attachment; fix the markup or the flow, don't disable the scan      |

### 3. Reproduce narrowly

```bash
# one spec, one browser, no retries, one worker
npx playwright test <spec path> --project=chromium --retries=0 --workers=1

# narrow further by title
npx playwright test -g "<test title>" --project=chromium --retries=0

# check for flakiness
npx playwright test <spec path> --project=chromium --repeat-each=5
```

If it passes locally but fails in CI, go to step 5.

### 4. Investigate with one tool

- **UI Mode** (`npm run test:ui`) — default choice when it reproduces locally: replay each step,
  inspect the DOM at every action, try locators with the picker, and see network calls.
- **Trace Viewer** (`npx playwright show-trace test-results/<test>/trace.zip`) — for an existing
  trace, including one downloaded from CI.
- **Headed run** (`npm run test:headed -- <spec path>`) or `--debug` for the Inspector — to watch or
  step through a single test.
- **HTML report** (`npm run report`) — screenshots, traces and axe attachments for every failure.

### 5. CI-only failures

Download the `playwright-report` artifact from the CI run, open it, and replay the trace of the
failing test. Look for differences between CI and local: browser (CI runs all three), viewport,
timing under two workers, missing environment variables, or state left by another test. Reproduce
the difference locally before changing code.

### 6. Fix the cause and verify

Fix the root cause in the right layer: locators and interactions in the page object, data in
`src/config/`, shared setup in `lib/fixtures/`. Then run `npm run type:check`, `npm run lint`, and
the affected spec in all three browsers. If the cause is an application defect rather than a test
problem, say so and don't bend the test around it.

Offer to record the diagnosis with the `log-test-error` skill so the next person finds it.

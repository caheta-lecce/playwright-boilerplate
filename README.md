# Playwright boilerplate

🇮🇹 [Leggi in italiano](README.it.md)

A ready-to-use starting point for end-to-end testing with [Playwright](https://playwright.dev) and
TypeScript. It gives you a clean project structure and proven conventions, so you can write tests
for your own application from day one instead of building the scaffolding first.

It runs out of the box: a tiny local demo app is included, so `npm test` passes without any
external account, database or server.

## Features

- **Three-file page objects**: locators, actions and the page class are kept apart, so specs read
  like plain steps.
- **Composed fixtures**: page objects and helpers are injected into tests through `mergeTests()`,
  with no setup code inside specs.
- **Log in once per browser**: a setup project signs in, saves the session, and every test reuses it.
- **Typed configuration**: environment variables are validated with [Zod](https://zod.dev) at
  startup, so a missing or malformed value fails fast with a clear message.
- **Accessibility checks**: a `scanAxe()` fixture runs [axe-core](https://github.com/dequelabs/axe-core)
  against WCAG 2.1 A/AA and attaches the full results to the report.
- **ZAP passive scan**: journeys under `src/tests/security/zap/` run through an OWASP ZAP proxy with
  a pinned rule baseline; see [docs/zap/zap-proxy-scan.md](docs/zap/zap-proxy-scan.md).
- **Cross-browser**: Chromium, Firefox and WebKit by default.
- **Quality tooling**: ESLint, Prettier, strict TypeScript, and a Husky pre-commit hook with
  lint-staged.
- **CI ready**: a GitHub Actions workflow for checks and browser tests.
- **AI-assistant friendly**: shared guidelines in [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md)
  and reusable [skills](#ai-assistant-skills) for Claude Code, GitHub Copilot, Codex and Gemini.

## Requirements

- Node.js 22 or newer
- npm
- Only for the [ZAP passive scan](#zap-passive-scan): OWASP ZAP 2.17.0 with the add-on versions pinned in
  [docs/zap/zap-baseline.json](docs/zap/zap-baseline.json)

## Quick start

```sh
npm ci
npx playwright install --with-deps
npm test
```

Playwright starts the demo app on `http://127.0.0.1:4173`, signs in once per browser, and runs the
example specs (session reuse, sign-out and form validation) in all three browsers, with an
accessibility scan for each UI state.

> The demo login only stores a display name in `localStorage`. It is a placeholder, not a secure
> authentication system.

## Scripts

| Command                                          | What it does                               |
| ------------------------------------------------ | ------------------------------------------ |
| `npm test`                                       | Run all tests in all browsers              |
| `npm run test:chromium` / `:firefox` / `:webkit` | Run tests in one browser                   |
| `npm run test:headed`                            | Run tests with a visible browser           |
| `npm run test:ui`                                | Open Playwright UI mode                    |
| `npm run test:list`                              | List tests without running them            |
| `npm run test:unit`                              | Run the `node:test` unit tests             |
| `npm run test:zap`                               | Run the ZAP journeys through a ZAP proxy   |
| `npm run test:zap:headed`                        | Same, with a visible browser               |
| `npm run test:zap:no-proxy`                      | Run the ZAP journeys with no proxy         |
| `npm run zap:baseline`                           | Check ZAP against the pinned baseline      |
| `npm run zap:reset`                              | Clear the running ZAP session              |
| `npm run report`                                 | Open the last HTML report                  |
| `npm run guidelines:check`                       | Check the mechanical repository guidelines |
| `npm run ai:skills:sync` / `ai:skills:check`     | Generate, or verify, the AI skill entries  |
| `npm run type:check`                             | Type-check with `tsc`                      |
| `npm run lint`                                   | Lint with ESLint                           |
| `npm run format` / `format:check`                | Format, or check formatting, with Prettier |

## Project structure

```text
.
├── lib/
│   ├── api/            # HTTP status constants and failure classifications
│   ├── auth/           # Storage-state paths and setup helpers
│   ├── fixtures/       # Fixtures composed with mergeTests() (page objects, accessibility)
│   └── reporting/      # Failure-reason types and labels for reports
├── src/
│   ├── config/
│   │   ├── environments/   # Parsed runtime configuration
│   │   └── schemas/        # Zod schemas for environment and users
│   ├── data/               # Test data: <domain>.data.ts (inputs and expected values)
│   ├── pages/<domain>/     # Page objects: <Name>Locators, <Name>Actions, <Name>Page
│   ├── shared/types/       # Shared TypeScript types
│   └── tests/
│       ├── security/zap/   # ZAP passive-scan journeys
│       ├── setup/          # Per-browser authentication setup
│       └── ui/<domain>/    # UI specs
├── scripts/
│   ├── demo-server.mjs             # Local demo app used by the examples
│   ├── configure-zap-baseline.mjs  # Checks and applies the pinned ZAP baseline
│   └── reset-zap-session.mjs       # Clears the ZAP session before a run
├── docs/
│   ├── ai/                         # Shared repository guidelines
│   └── zap/                        # ZAP scan guide, rule list and baseline lock file
├── unit-tests/             # node:test unit tests for the guideline rules
├── playwright.config.ts
└── playwright.zap.config.ts
```

Import paths use aliases: `@lib/*`, `@fixtures/*`, `@pages/*`, `@config/*`, `@shared/*` and `@data/*`.

## How a test looks

```ts
import { test, expect } from '@fixtures/base';

test('signs out of the example app', async ({ examplePage, scanAxe }) => {
  await examplePage.do.open();
  await examplePage.do.signOut();
  await expect(examplePage.on.displayName).toBeVisible();
  await scanAxe('signed-out');
});
```

`examplePage.on` holds the locators and `examplePage.do` holds the actions. Both come from the
page object in `src/pages/example/`.

## Adapting it to your application

1. Copy `.env.example` to `.env`, then set `ENV=test` and `BASE_URL` to your application's URL.
   With `ENV=test`, the demo server is not started.
2. Replace the example page object in `src/pages/example/` with your own, keeping the
   Locators / Actions / Page split.
3. Update `src/tests/setup/auth.ui.setup.ts` with your real login flow. Assert that login succeeded
   before saving the state, and avoid fixed sleeps.
4. Register your page objects in `lib/fixtures/page-fixture.ts`.
5. Replace the example specs under `src/tests/ui/`.
6. Add users and settings through the Zod schemas in `src/config/schemas/`. Read credentials from
   environment variables or CI secrets and never commit them.

### Notes on authentication state

- The session is saved for each environment and browser under `.auth/<env>/<browser>.json`. It is
  regenerated on every run and ignored by Git.
- Playwright saves cookies and `localStorage`. If your application uses `sessionStorage`, you need
  to save and restore it yourself.
- Tests that change server-side account state should use a separate account per worker.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes to `main`, on pull requests
and on demand. It type-checks, lints, checks the repository guidelines, runs the unit tests, checks formatting, checks that the AI skill entry points are
in sync, runs all browser tests, and uploads the HTML report as an artifact. It needs no secrets or
external services.

## ZAP passive scan

The journeys in `src/tests/security/zap/` can run through an [OWASP ZAP](https://www.zaproxy.org)
proxy, so ZAP passively scans the traffic they generate. They have their own config
(`playwright.zap.config.ts`) and never run as part of `npm test`. Only run them against an
application you are allowed to test.

1. Start ZAP 2.17.0 as a daemon on `127.0.0.1:8080`, with the add-ons pinned in
   [docs/zap/zap-baseline.json](docs/zap/zap-baseline.json) installed.
2. Run `npm run test:zap`. It checks ZAP against the baseline, resets the ZAP session, then runs
   the journeys through the proxy.
3. Open the Playwright report in `playwright-report/zap`.

To check that the journeys work without a ZAP daemon, run `npm run test:zap:no-proxy` (or set
`ZAP_PROXY=off`).

Optional variables in `.env`: `ZAP_PROXY_URL` (default `http://127.0.0.1:8080`), `ZAP_PROXY`
(`on` or `off`) and `ZAP_KEY` (the daemon's API key, if it has one).

Setup, comparable runs and troubleshooting are in [docs/zap/zap-proxy-scan.md](docs/zap/zap-proxy-scan.md).
The rules in the baseline are listed in [docs/zap/passive-scan-rules.md](docs/zap/passive-scan-rules.md).

## AI assistant skills

Skills are step-by-step workflows that AI coding assistants can run on request. Each one is written
once in `.agents/skills/<name>/SKILL.md` and shared by every supported assistant.

| Skill                   | What it does                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| `create-page-object`    | Builds a page object and its first spec from the live application     |
| `pom-reviewer`          | Reviews page objects and specs against the Page Object Model rules    |
| `a11y-reviewer`         | Checks that UI specs scan every meaningful state for accessibility    |
| `refactor-spec`         | Moves raw locators and interactions from a spec into page objects     |
| `review-branch`         | Reviews a local branch's diff, runs the checks, and reports findings  |
| `investigate-pr`        | Gathers a GitHub PR's diff, reviews and CI status before a review     |
| `pr-description-writer` | Drafts a PR description and flags unrelated changes in the diff       |
| `debug-test`            | Triages a failing or flaky test and fixes the cause                   |
| `log-test-error`        | Diagnoses a test failure and records it in `docs/troubleshooting.md`  |
| `safe-rename`           | Changes a shared value after finding every place that uses it         |
| `review-scenarios`      | Reviews test-plan documents for completeness and automation readiness |

After adding or editing a skill, run `npm run ai:skills:sync`. It generates the entry points for
each assistant: `.claude/skills/` and `.claude/agents/` for Claude Code, `.github/prompts/` for
Copilot, and the skill list in `AGENTS.md` for Codex and Gemini. Never edit those generated files
by hand.

For Claude Code, `.claude/settings.json` also adds two hooks: one blocks edits that break
mechanically checkable guidelines (such as XPath selectors), the other lints and formats each
TypeScript file after it is written. It also stops the assistant from reading or editing `.env`.

## Conventions

Coding conventions for page objects, fixtures, authentication, API coverage and accessibility are
in [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md). They are written for both
people and AI coding assistants.

Before opening a pull request, run:

```sh
npm run type:check && npm run lint && npm run format:check && npm test
```

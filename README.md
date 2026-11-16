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
  against WCAG 2.1 A/AA, attaches the full results to the report and saves them under
  `reports/a11y/`, with `a11y:report` (Markdown + CSV) and `a11y:compare` (new / fixed / unchanged).
  `a11y:report:xlsx` writes an Excel workbook (set `A11Y_SPRINT` to fill its Sprint column). The
  `sauce-demo-chromium` project scans the public Sauce demo store (`src/tests/ui/sauce-demo/`) in
  aggregate mode (every state is scanned, then one step fails the test naming all violating states): no auth setup, `npm run test:a11y:sauce` (expected to fail on the live store) then `npm run a11y:report:xlsx`; the reports work on a failing run.
  `a11y:compare:report` compares two runs (see [Baseline and compare](#baseline-and-compare-a11y)).
  The Excel script is TypeScript run by Node's native type stripping (Node 22.18+).
- **Cross-browser**: Chromium, Firefox and WebKit by default.
- **Quality tooling**: ESLint, Prettier, strict TypeScript, and a Husky pre-commit hook with
  lint-staged.
- **CI ready**: a GitHub Actions workflow for checks and browser tests.
- **AI-assistant friendly**: shared guidelines in [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md)
  and reusable [skills](#ai-assistant-skills) for Claude Code, GitHub Copilot, Codex and Gemini.

## Requirements

- Node.js 22 or newer
- npm

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

| Command                                          | What it does                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `npm test`                                       | Run all tests in all browsers, except `@destructive`               |
| `npm run test:ci`                                | Like `npm test` plus `--forbid-only` (what CI runs)                |
| `npm run test:changed` / `test:changed:main`     | Run only specs changed since `HEAD` / `main`                       |
| `npm run test:debug`                             | Run with the Playwright inspector (`--debug`)                      |
| `npm run test:smoke` / `test:regression`         | Run only the `@smoke` or `@regression` suite                       |
| `npm run test:destructive`                       | Run only the `@destructive` tests                                  |
| `npm run test:chromium` / `:firefox` / `:webkit` | Run tests in one browser                                           |
| `npm run test:headed`                            | Run tests with a visible browser                                   |
| `npm run test:ui`                                | Open Playwright UI mode                                            |
| `npm run test:list`                              | List tests without running them                                    |
| `npm run test:unit`                              | Run the `node:test` unit tests                                     |
| `npm run a11y:report`                            | Markdown + CSV of the latest axe run (`reports/a11y/`)             |
| `npm run a11y:compare -- <base> <head>`          | New / fixed / unchanged violations; exit 1 on new                  |
| `npm run a11y:report:xlsx [-- <run> --out <f>]`  | Excel report (Summary + Violations) of an axe run                  |
| `npm run a11y:compare:report -- <base> <head>`   | Excel + HTML comparison of two axe runs (Fixed / Still open / New) |
| `npm run test:a11y:sauce`                        | Axe scans of the external Sauce demo store (fails on violations)   |
| `npm run report`                                 | Open the last HTML report                                          |
| `npm run guidelines:check`                       | Check the mechanical repository guidelines                         |
| `npm run ai:skills:sync` / `ai:skills:check`     | Generate, or verify, the AI skill entries                          |
| `npm run type:check`                             | Type-check with `tsc`                                              |
| `npm run lint` / `lint:fix`                      | Lint with ESLint, optionally applying fixes                        |
| `npm run format` / `format:check`                | Format, or check formatting, with Prettier                         |

## Baseline and compare (a11y)

Keep one scan as a **baseline**, re-scan later and see which findings were fixed, are still open, or are new.

```bash
A11Y_RUN_ID=local-baseline npm run test:a11y:sauce
# pretend color-contrast was fixed (what-if: those rules are dropped at scan time and recorded
# as `simulatedFixed` in the scan files)
A11Y_RUN_ID=local-head A11Y_SIMULATE_FIXED=color-contrast npm run test:a11y:sauce
npm run a11y:compare:report -- local-baseline local-head [--fail-on-new] [--out-dir <dir>]
```

The sauce specs record every scan with `trackA11yScan` (`lib/a11y/findings.ts`) and end with one
`expectNoAccessibilityViolations` step, so `test:a11y:sauce` runs every flow and then fails on the live
store by design. The scan files are written either way: run the report commands after a failing run.

It writes `a11y-compare.xlsx` (Summary, Violations, Comparison with a per-state delta block) and
`a11y-report.html` (with a Baseline comparison section) into the head run folder, and copies both to
`playwright-report/a11y/`. With one run argument it writes a single-run `a11y-report.xlsx` and HTML.
Exit code is 0 unless `--fail-on-new` is set and there are new findings. A finding is one element of
one rule in one labelled state.

The manual workflow [`a11y-sauce.yml`](.github/workflows/a11y-sauce.yml) automates this in CI. Inputs:
`mode` (`baseline` stores the `a11y-baseline` artifact for 90 days; `compare` downloads the latest
baseline, re-scans and uploads `a11y-compare`), `simulate_fixed` (rule ids, default `color-contrast`)
and `fail_on_new` (default false). The workflow also runs on every push to `ui-a11y`: the first push (no baseline artifact yet) creates the baseline; later pushes compare against the latest baseline with `color-contrast` simulated fixed. Put `[a11y-baseline]` in the head commit message to store a fresh baseline instead. A manual `compare` with no baseline fails with a clear message. The fixed counts appear in the job summary. `npm test` and the
suites cover only the example projects, so they never scan the external site.

## Test tags

Every UI test carries exactly one suite tag in the Playwright options: `{ tag: '@smoke' }` for the
quick critical checks or `{ tag: '@regression' }` for the rest. A test that changes shared data
also gets `'@destructive'` (`{ tag: ['@regression', '@destructive'] }`).

- `npm test` and the per-browser scripts skip `@destructive` tests.
- `npm run test:smoke`, `test:regression` and `test:destructive` run one tag. They go through
  `scripts/run-suite.mjs`, which applies the tag to the spec projects only: a plain `--grep` would also
  filter out the auth setup tests that every spec project depends on, and no session would be saved.
- The `spec-missing-suite-tag` guideline rule fails a UI test without exactly one suite tag.

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
│       ├── setup/          # Per-browser authentication setup
│       └── ui/<domain>/    # UI specs
├── scripts/
│   ├── demo-server.mjs             # Local demo app used by the examples
│   └── run-suite.mjs               # Runs one tag suite without filtering the auth setup
├── docs/
│   └── ai/                         # Shared repository guidelines
├── unit-tests/             # node:test unit tests for the guideline rules
└── playwright.config.ts
```

Import paths use aliases: `@lib/*`, `@fixtures/*`, `@pages/*`, `@config/*`, `@shared/*` and `@data/*`.

## How a test looks

```ts
import { test, expect } from '@fixtures/base';

test('signs out of the example app', { tag: '@regression' }, async ({ examplePage, scanAxe }) => {
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

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes to `main`, `ui-a11y` and `ui-a11y-dast`, on pull requests
and on demand. It type-checks, lints, checks the repository guidelines, runs the unit tests, checks formatting, checks that the AI skill entry points are
in sync, checks that the Playwright image tag matches the pinned `@playwright/test` version, runs all browser tests, and uploads the HTML report as an artifact. It needs no secrets or
external services.

## Variants

The template ships as three stacked branches; pick the one that matches what your team needs.

| Branch         | What it contains                                                                          | When to choose it                               |
| -------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `main`         | UI tests only: page objects, fixtures, tags, guideline rules, AI skills                   | You only need functional UI automation.         |
| `ui-a11y`      | `main` plus axe-core accessibility scans and the `a11y-reviewer` skill **(you are here)** | You also check accessibility on every UI state. |
| `ui-a11y-dast` | `ui-a11y` plus the OWASP ZAP passive-scan suite                                           | You also want passive security scanning (DAST). |

Maintenance rule: fix and change shared things on `main` only, then merge `main` into `ui-a11y`
and `ui-a11y` into `ui-a11y-dast`, in that order.

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

## Licence

MIT, see [LICENSE](LICENSE).

## Conventions

Coding conventions for page objects, fixtures, authentication, API coverage and accessibility are
in [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md). They are written for both
people and AI coding assistants.

Before opening a pull request, run:

```sh
npm run type:check && npm run lint && npm run format:check && npm test
```

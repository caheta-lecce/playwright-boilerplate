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
example specs (session reuse, sign-out and form validation) in all three browsers.

> The demo login only stores a display name in `localStorage`. It is a placeholder, not a secure
> authentication system.

## Scripts

| Command                                          | What it does                                         |
| ------------------------------------------------ | ---------------------------------------------------- |
| `npm test`                                       | Run all tests in all browsers, except `@destructive` |
| `npm run test:ci`                                | Like `npm test` plus `--forbid-only` (what CI runs)  |
| `npm run test:changed` / `test:changed:main`     | Run only specs changed since `HEAD` / `main`         |
| `npm run test:debug`                             | Run with the Playwright inspector (`--debug`)        |
| `npm run test:smoke` / `test:regression`         | Run only the `@smoke` or `@regression` suite         |
| `npm run test:destructive`                       | Run only the `@destructive` tests                    |
| `npm run test:chromium` / `:firefox` / `:webkit` | Run tests in one browser                             |
| `npm run test:headed`                            | Run tests with a visible browser                     |
| `npm run test:ui`                                | Open Playwright UI mode                              |
| `npm run test:list`                              | List tests without running them                      |
| `npm run test:unit`                              | Run the `node:test` unit tests                       |
| `npm run report`                                 | Open the last HTML report                            |
| `npm run guidelines:check`                       | Check the mechanical repository guidelines           |
| `npm run ai:skills:sync` / `ai:skills:check`     | Generate, or verify, the AI skill entries            |
| `npm run type:check`                             | Type-check with `tsc`                                |
| `npm run lint` / `lint:fix`                      | Lint with ESLint, optionally applying fixes          |
| `npm run format` / `format:check`                | Format, or check formatting, with Prettier           |

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
│   ├── fixtures/       # Fixtures composed with mergeTests() (page objects)
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

test('signs out of the example app', { tag: '@regression' }, async ({ examplePage }) => {
  await examplePage.do.open();
  await examplePage.do.signOut();
  await expect(examplePage.on.displayName).toBeVisible();
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
in sync, runs all browser tests, and uploads the HTML report as an artifact. It needs no secrets or
external services.

## Variants

The template ships as three stacked branches; pick the one that matches what your team needs.

| Branch         | What it contains                                                                           | When to choose it                               |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `main`         | UI tests only: page objects, fixtures, tags, guideline rules, AI skills **(you are here)** | You only need functional UI automation.         |
| `ui-a11y`      | `main` plus axe-core accessibility scans and the `a11y-reviewer` skill                     | You also check accessibility on every UI state. |
| `ui-a11y-dast` | `ui-a11y` plus the OWASP ZAP passive-scan suite                                            | You also want passive security scanning (DAST). |

Maintenance rule: fix and change shared things on `main` only, then merge `main` into `ui-a11y`
and `ui-a11y` into `ui-a11y-dast`, in that order.

## AI assistant skills

Skills are step-by-step workflows that AI coding assistants can run on request. Each one is written
once in `.agents/skills/<name>/SKILL.md` and shared by every supported assistant.

| Skill                   | What it does                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| `create-page-object`    | Builds a page object and its first spec from the live application     |
| `pom-reviewer`          | Reviews page objects and specs against the Page Object Model rules    |
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

Coding conventions for page objects, fixtures, authentication, and API coverage are
in [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md). They are written for both
people and AI coding assistants.

Before opening a pull request, run:

```sh
npm run type:check && npm run lint && npm run format:check && npm test
```

# Repository guidelines

This repository is a reusable Playwright test template. Keep project URLs, credentials, customer
data and integrations out of the template. Use dummy values and environment configuration.

## Constitution

Quick-reference floor for every change; the sections below hold the detail. Rows marked with a
hook id are enforced by the shared rule table in `scripts/guideline-rules.mjs`.
`npm run guidelines:check` checks all tracked files in CI; the Husky pre-commit hook checks
staged index content. Claude Code also checks proposed writes through its PreToolUse hook, and
`review-branch` uses the same rules. Enforcement applies to every contributor, regardless of
editor or assistant. Only rules checkable with near-zero false positives are automated, so an
unmarked row is still binding. Specs that already broke a rule when it was introduced are listed in
`KNOWN_VIOLATIONS` there: that list only shrinks, and fixing one of those specs means removing it
from the list. When adopting the template, extend these tables with the project's own conventions.

### MUST

<!-- prettier-ignore -->
| Rule | Requirement |
| --- | --- |
| **Page objects** | Specs interact with the app only through `<Name>Page` → `Actions` / `Locators`; no raw `page.click()` / `page.locator()` in specs, and no locator built in a spec at all, not even chained off a page object locator (`examplePage.on.table.getByText(...)`): add a named locator to `<Name>Locators.ts` and use it only inside `expect(...)` or pass it to an action. Hook: `no-inline-locator-in-spec`. |
| **Fixtures** | Specs and setup files import `test` / `expect` from `@fixtures/base`, never from `@playwright/test`; type-only imports are fine. Hook: `no-playwright-test-in-spec`. |
| **Path aliases** | Imports outside the current folder use the `tsconfig.json` aliases (`@lib`, `@fixtures`, `@pages`, `@config`, `@shared`), including in `playwright.config.ts`; relative imports are only for same-folder siblings (`./x`). Lint: `no-restricted-imports`. |
| **Endpoints** | API paths live in `lib/api/endpoints/<domain>.ts` with a shared `BASE`. Hook: `no-hardcoded-api-path`. |
| **Constants** | HTTP methods and statuses come from `lib/api/api-constants.ts`; URLs and credentials from validated environment configuration. |
| **Schemas** | API responses are validated with Zod schemas under `src/models/<domain>/`, faithful to the contract and documented with endpoint and example. Hook: `schema-missing-jsdoc`. |
| **Test data** | Specs declare no test data: inputs and expected values (emails, codes, IDs, names, UI copy) live in `src/data/<domain>.data.ts` and are imported through `@data/*`. Users, URLs and settings come from `src/config/`. Hooks: `no-email-literal-in-spec` (email addresses), `no-string-constant-in-spec` (module-level string constants); the rest is checked in review. |
| **Reuse first** | Reuse existing fixtures, page objects, helpers, constants, and test data before adding new ones. A data value already present in a `<domain>.data.ts` is reused, not copied under a new key; when a second spec needs it, rename its key to a neutral, spec-agnostic name and point both specs at it. |
| **Test tags** | Every test in a UI spec carries exactly one suite tag through Playwright's options, `test('title', { tag: '@smoke' }, ...)` or `{ tag: '@regression' }`, and optionally `'@destructive'` (`{ tag: ['@regression', '@destructive'] }`) when it changes shared data. `npm test` and the per-browser scripts skip `@destructive`; `npm run test:smoke`, `test:regression` and `test:destructive` run one tag through `scripts/run-suite.mjs`, which filters only the spec projects so the auth setup still runs (a CLI `--grep` would filter it out). Hook: `spec-missing-suite-tag`. |
| **Auth reuse** | Specs reuse the storage state saved by the setup project; only login specs log in inline. |
| **Accessibility** | Call `scanAxe(label)` after reaching each meaningful UI state. |
| **Close review gaps** | When a review (human or AI) flags a violation that the rules or hooks let through, the same change also closes the gap: tighten the matching Constitution row or section, or add a new one, and add a rule to `scripts/guideline-rules.mjs` (with a case in `unit-tests/guidelines/`) when it can be checked mechanically with near-zero false positives (existing offenders go in `KNOWN_VIOLATIONS`). If a rule only states the requirement, the next review will just flag the same thing again. |
| **Verification** | Changed code passes `npm run type:check`, `npm run lint`, `npm run format:check`, and `npm run test:unit`, and affected specs are run before the work is called done. |

### SHOULD

<!-- prettier-ignore -->
| Rule | Recommendation |
| --- | --- |
| **Locators** | Prefer `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` over CSS. |
| **Direct navigation** | Navigate straight to the page under test instead of clicking through the UI to reach it. |
| **Steps** | Group spec flows in `test.step()` so reports read as a sequence of user actions. |
| **Why-comments** | Keep comments that explain a workaround, gotcha, or non-obvious decision. |
| **Unit tests** | Cover pure helper and report logic (parsers, classifiers, report builders, the guideline rules) with a `*.test.mjs` in `unit-tests/<area>/`, using `node:test` + `node:assert/strict`. A script that runs `main()` on import keeps its testable logic in a separate module. `npm run test:unit` runs them locally and in CI. |

### WON'T

<!-- prettier-ignore -->
| Rule | Violation |
| --- | --- |
| **No hard waits** | Never `waitForTimeout()`; wait on a condition (web-first assertion, `waitForResponse`, `toPass`). Hook: `no-hard-wait`. |
| **No XPath** | Never XPath selectors in pages or specs. Hook: `no-xpath`. |
| **No focused tests** | Never commit `test.only` / `describe.only`. Hook: `no-focused-test`. |
| **No unexplained soft assertions** | `expect.soft` is allowed only with a `// Soft: <reason>` comment right above saying why the test must go on if it fails. Otherwise it's a hard `expect`. Hook: `no-unexplained-soft-assertion`. |
| **No fixtures in specs** | Never `test.extend` inside a spec; fixtures live in `lib/fixtures/`. Hook: `no-fixture-in-spec`. |
| **No secrets or client data** | Never commit credentials, auth artifacts, project URLs, or customer data. |
| **No self-edited guards** | An agent never edits the files that enforce these rules: `.claude/scripts/**`, `.claude/settings.json`, `scripts/guideline-rules.mjs`, `scripts/check-guidelines.mjs` and `.husky/**`. The Claude Code hook blocks such writes; a human makes the change, or relaunches the agent with `ALLOW_GUARD_EDITS=1` set outside it. |
| **No loosened contracts** | Never loosen a schema or expected status to make a test green; record the discrepancy and link its issue. |

## File naming

`eslint-plugin-check-file` enforces file and folder names (`npm run lint`); identifier naming stays
in `eslint-rules/name-convention.js`, so the two do not overlap.

- `src/pages/**`: PascalCase `<Name>Locators.ts`, `<Name>Actions.ts` or `<Name>Page.ts`.
- `src/data/**`: kebab-case `<domain>.data.ts`.
- `src/tests/**`: kebab-case `<name>.spec.ts`, or `<name>.ui.setup.ts` for setup projects.
- `lib/fixtures/*`: kebab-case; every folder under `src/` and `lib/` is kebab-case.

## Generated test data

Generate values with `@faker-js/faker` only inside `src/data/<domain>.data.ts` (a typed factory such
as `buildDisplayName()`); specs call the factory and never import faker. Output is seeded: the default
seed is fixed, and `TEST_DATA_SEED=<number>` replays another sequence. The sequence is per worker
and follows call order, so each test generates and uses its own value and never relies on a value
another test produced. Constrain generated values to what the UI accepts (e.g. letters and one
space) so they cannot make a test flaky.

## Structure

- `lib/fixtures/`: shared fixture modules composed with `mergeTests()`.
- `lib/auth/`: storage-state paths and setup helpers.
- `lib/a11y/`: on-disk axe result shape and writer.
- `lib/api/`: HTTP constants.
- `lib/reporting/`: failure classifications (`FAILURE_REASONS`) and their types.
- `src/config/schemas/`: Zod-validated environment and user configuration.
- `src/config/environments/`: parsed runtime configuration.
- `src/data/`: test data, one `<domain>.data.ts` per domain.
- `src/pages/<domain>/`: page objects.
- `src/tests/setup/`: browser-specific authentication setup.
- `src/tests/ui/<domain>/`: UI specifications.
- `src/tests/security/zap/`: ZAP passive-scan journeys, run only by `playwright.zap.config.ts` (`npm run test:zap`, see `docs/zap/zap-proxy-scan.md`); the default config ignores them.
- `docs/zap/`: pinned ZAP baseline (`zap-baseline.json`), rule list and scan guide.
- `unit-tests/<area>/`: `node:test` unit tests for pure logic (`npm run test:unit`).

## Page objects and fixtures

Use `<Name>Locators.ts` for locator declarations, `<Name>Actions.ts` for interactions, and
`<Name>Page.ts` to compose both. Define every selector in `Locators.ts`, including selectors
derived from another locator with `.locator()` or `getByRole()`; `Actions.ts` consumes those named
locators instead of defining additional selectors. Specs assert through the page object. Prefer accessible roles
and labels. Include success, error and validation locators for forms; include loading and empty
states when the application has them. The synchronous local demo has no loading state.

Reuse shared helpers and fixtures. Never declare `test.extend()` in specs. Use test-scoped page
objects and option fixtures for configurable behavior. Add worker-scoped resources only when they
can safely be shared; use `use()` with `try/finally` for resources needing cleanup. Auto fixtures
run for every matching test, so add them only for universally required behavior.

## Authentication

Setup projects authenticate and assert the final UI before saving state. Dependent projects reuse
that state. Keep auth artifacts ignored, use separate files for concurrent setup projects, and never
commit credentials. Use web-first assertions and observable application state, not arbitrary sleeps.
The demo login stores a display name in localStorage and must be replaced for a real application.

## API coverage

Add domain endpoints under `lib/api/endpoints/` using one shared `BASE` per domain. GET and PATCH
at the same path share a key; dynamic paths use functions. Extend HTTP types before constants.
Add response schemas under `src/models/<domain>/` and document their endpoint and an example.
Required fields are not optional; nullable fields use `.nullable()`. Export schemas and inferred
types. Add aliases and barrel exports when introducing those directories. Do not loosen contracts
to hide application defects. Record the discrepancy and link its tracking issue.

## Accessibility and verification

Use `scanAxe(label)` from the shared fixture after reaching each meaningful UI state. The template
fails on violations and attaches full axe results. A report-only exception needs an explicit reason.
Automated checks do not replace manual accessibility testing.

Every scan is also written to disk, git-ignored, as
`reports/a11y/<runId>/<project>/<spec>--<label>.json` (shape `A11yScanFile` in
`lib/a11y/results.ts`: rule id, impact, help URL and node targets per violation). The run id is a
sortable UTC timestamp fixed once in `playwright.config.ts` (override with `A11Y_RUN_ID`), and each
scan owns its file, so parallel workers and the three browsers never overwrite each other.
Because labels name the files and identify a violation across runs, keep them stable.

- `npm run a11y:report [-- <run|latest|folder>]` writes `summary.md` and `issues.csv` (Excel-ready)
  into the run folder, grouped by rule, impact, page/state and browser, de-duplicated.
- `npm run a11y:compare -- <base> <head>` (defaults `previous` and `latest`) lists new, fixed and
  unchanged violations by rule, state, browser and target; it exits 1 on new violations unless
  `--no-fail`, and `--out <file>` also saves the Markdown. Logic lives in `scripts/a11y/` with tests in
  `unit-tests/a11y/`.

Before submitting changes, run type checking, lint (`npm run lint:fix` fixes what it can), formatting, unit tests and relevant browser tests (`npm run test:changed` runs only specs changed since the last commit). Never
add fixture logic or raw UI interactions to specs merely to make a test pass. Search both symbolic
and raw values before renaming enums or data constants.

# Repository guidelines

This repository is a reusable Playwright test template. Keep project URLs, credentials, customer
data and integrations out of the template. Use dummy values and environment configuration.

## Constitution

Quick-reference floor for every change; the sections below hold the detail. Rows marked with a
hook id are also enforced by the Claude Code PreToolUse hook (`.claude/scripts/guideline-rules.mjs`,
also run by `review-branch`). The hook only covers rules checkable with near-zero false positives,
so an unmarked row is still binding. When adopting the template, extend these tables with the
project's own conventions.

### MUST

<!-- prettier-ignore -->
| Rule | Requirement |
| --- | --- |
| **Page objects** | Specs interact with the app only through `<Name>Page` → `Actions` / `Locators`; no raw `page.click()` / `page.locator()` in specs. |
| **Fixtures** | Specs and setup files import `test` / `expect` from `@fixtures/base`, never from `@playwright/test`; type-only imports are fine. Hook: `no-playwright-test-in-spec`. |
| **Path aliases** | Imports outside the current folder use the `tsconfig.json` aliases (`@lib`, `@fixtures`, `@pages`, `@config`, `@shared`), including in `playwright.config.ts`; relative imports are only for same-folder siblings (`./x`). Lint: `no-restricted-imports`. |
| **Endpoints** | API paths live in `lib/api/endpoints/<domain>.ts` with a shared `BASE`. Hook: `no-hardcoded-api-path`. |
| **Constants** | HTTP methods and statuses come from `lib/api/api-constants.ts`; URLs and credentials from validated environment configuration. |
| **Schemas** | API responses are validated with Zod schemas under `src/models/<domain>/`, faithful to the contract and documented with endpoint and example. Hook: `schema-missing-jsdoc`. |
| **Auth reuse** | Specs reuse the storage state saved by the setup project; only login specs log in inline. |
| **Accessibility** | Call `scanAxe(label)` after reaching each meaningful UI state. |
| **Verification** | Changed code passes `npm run type:check`, `npm run lint`, and `npm run format:check`, and affected specs are run before the work is called done. |

### SHOULD

<!-- prettier-ignore -->
| Rule | Recommendation |
| --- | --- |
| **Locators** | Prefer `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` over CSS. |
| **Direct navigation** | Navigate straight to the page under test instead of clicking through the UI to reach it. |
| **Steps** | Group spec flows in `test.step()` so reports read as a sequence of user actions. |
| **Why-comments** | Keep comments that explain a workaround, gotcha, or non-obvious decision. |

### WON'T

<!-- prettier-ignore -->
| Rule | Violation |
| --- | --- |
| **No hard waits** | Never `waitForTimeout()`; wait on a condition (web-first assertion, `waitForResponse`, `toPass`). Hook: `no-hard-wait`. |
| **No XPath** | Never XPath selectors in pages or specs. Hook: `no-xpath`. |
| **No focused tests** | Never commit `test.only` / `describe.only`. Hook: `no-focused-test`. |
| **No fixtures in specs** | Never `test.extend` inside a spec; fixtures live in `lib/fixtures/`. Hook: `no-fixture-in-spec`. |
| **No secrets or client data** | Never commit credentials, auth artifacts, project URLs, or customer data. |
| **No loosened contracts** | Never loosen a schema or expected status to make a test green; record the discrepancy and link its issue. |

## Structure

- `lib/fixtures/`: shared fixture modules composed with `mergeTests()`.
- `lib/auth/`: storage-state paths and setup helpers.
- `lib/api/`: HTTP constants and failure classifications.
- `src/config/schemas/`: Zod-validated environment and user configuration.
- `src/config/environments/`: parsed runtime configuration.
- `src/pages/<domain>/`: page objects.
- `src/tests/setup/`: browser-specific authentication setup.
- `src/tests/ui/<domain>/`: UI specifications.

## Page objects and fixtures

Use `<Name>Locators.ts` for locator declarations, `<Name>Actions.ts` for interactions, and
`<Name>Page.ts` to compose both. Specs assert through the page object. Prefer accessible roles
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

Before submitting changes, run type checking, lint, formatting and relevant browser tests. Never
add fixture logic or raw UI interactions to specs merely to make a test pass. Search both symbolic
and raw values before renaming enums or data constants.

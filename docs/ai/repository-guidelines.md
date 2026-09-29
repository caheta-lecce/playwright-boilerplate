# Repository guidelines

This repository is a reusable Playwright test template. Keep project URLs, credentials, customer
data and integrations out of the template. Use dummy values and environment configuration.

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

---
name: pom-reviewer
description: Use this skill to review new or changed Playwright page objects and spec files for adherence to this repo's Page Object Model conventions, as documented in docs/ai/repository-guidelines.md. Trigger it after writing/editing files under src/pages/ or src/tests/ui/, or before a PR that touches them. Do not use it for reviewing test-plan documents (that's the review-scenarios skill) or for general code review unrelated to POM structure.
---

# POM reviewer

Review Playwright page objects and spec files against this repository's Page Object Model
conventions. Ground every finding in `docs/ai/repository-guidelines.md` — read it first if it isn't
already in context. Use `src/pages/example/` as the reference implementation of the pattern.

ESLint already enforces naming conventions (`eslint-rules/name-convention.js`) and Playwright best
practices (`eslint-plugin-playwright`). Do not re-flag issues those rules already catch — focus on
structural and semantic issues linting can't see.

## Scope

If the caller handed you a list of files, review those. Otherwise use `git diff` (staged and/or
against the target branch) to find changed files under `src/pages/` and `src/tests/ui/`. Review only
what changed plus enough surrounding context to judge it, not the whole tree.

## Checklist

1. **Three-file separation.** Each page is `<Name>Locators.ts` / `<Name>Actions.ts` /
   `<Name>Page.ts`.
   - `Locators.ts` contains only `Locator` declarations built from `page.getByRole` /
     `getByLabel` / `getByText` / etc. — no interaction methods, no assertions.
   - `Actions.ts` contains the interaction methods (click, fill, navigate) and uses locators from
     the `Locators` class — no raw `page.locator(...)` calls that bypass the Locators file.
   - `Page.ts` composes both and exposes them as `on` (locators) and `do` (actions). It is the only
     thing specs should use.
   - Flag any spec that calls `page.click()`, `page.locator()`, `page.getByRole()` or similar
     directly instead of going through a page object action. A locator from `.on` may appear in a
     spec only as the target of an `expect(...)`. A raw locator with no page object equivalent yet
     is a missing-locator finding, not a pass.

2. **Locator strategy.** Prefer accessible locators (`getByRole` > `getByLabel` >
   `getByPlaceholder` > `getByText` > `getByTestId`) over brittle CSS/XPath (`.some-class`, `#id`,
   deep `>` chains, `nth()` to dodge duplicates). Flag brittle selectors and suggest the accessible
   equivalent when the intent is clear from context.

3. **Reuse before introducing new abstractions.** Check `lib/fixtures/`, `lib/`, and `src/pages/`
   for something that already does what a new addition duplicates. Extending an existing page
   object beats creating a parallel one for the same DOM.

4. **Fixtures.** Page objects are injected through `lib/fixtures/page-fixture.ts` and composed in
   `lib/fixtures/base.ts`. Specs import `test`/`expect` from `@fixtures/base`. Flag any
   `test.extend()` declared inside a spec, and any spec that constructs a page object with `new`.

5. **Authentication reuse.** Specs rely on the storage state saved by
   `src/tests/setup/auth.ui.setup.ts`, not hand-rolled login flows inside a spec or page object.
   A spec that needs a signed-out state should say so explicitly
   (`test.use({ storageState: { cookies: [], origins: [] } })`).

6. **Test data and configuration.** Users, URLs and settings come from `src/config/` (validated by
   the Zod schemas in `src/config/schemas/`). Flag credentials, URLs or user data typed literally in
   specs or page objects.

7. **API coverage additions, if present.** When a change touches `lib/api/`, `src/models/` or
   `src/shared/types/api-types.ts`, check it against the "API coverage" section of the guidelines.

8. **Domain placement.** Specs belong under `src/tests/ui/<domain>/` and page objects under
   `src/pages/<domain>/`, matching the domain the spec targets.

9. **Feedback-locator completeness.** A page object covering a form or CRUD flow needs locators for
   more than the happy path — check it has (or the flow genuinely doesn't need) locators for
   success feedback, error feedback, field-level validation messages, and loading/empty states.
   Flag the missing state rather than assuming it wasn't needed.

## Output

This skill is read-only: report findings, don't edit files unless the user asks.

For each finding: file path, line number, what's wrong, why it matters (cite the guideline), and a
concrete fix. Group by severity (structural violations first, style suggestions last). If
everything checked out, say so plainly — don't invent findings to fill space.

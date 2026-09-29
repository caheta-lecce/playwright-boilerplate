# Review lens

Use this reference when a PR needs deeper investigation than a simple summary. Treat the questions as prompts for judgment, not as a rigid checklist.

## Intent and scope

- What problem does the PR appear to solve?
- Does the changed surface match the PR title and description?
- Are there unrelated edits, broad refactors, generated changes, or formatting churn?
- Are important assumptions documented in the PR, code, tests, or comments?

## Behavior

- What user-visible or internal behavior changes?
- Are edge cases, empty states, errors, retries, permissions, authentication, and environment differences handled?
- Does the PR affect shared helpers, fixtures, constants, components, or Page Objects used elsewhere?

## Tests

- Do tests cover the changed behavior rather than only the happy path?
- Are failures likely to be deterministic?
- Are waits, selectors, storage state, data setup, and cleanup stable?
- Are assertions strong enough to detect regressions?
- If tests are absent, is the reason clear and acceptable?

## Playwright signals

- Spec files should contain only Page Object action calls and assertions — no inline locators or direct `page.*` interactions. Any interaction (click, fill, hover, press, etc.) belongs in the page/component's Actions class and gets called from the spec (`await somePage.do.someAction(...)`); Locators-class members should appear in a spec only as the target of an `expect(...)` assertion, never with an interaction chained onto them. When a spec reimplements a locator that already exists as a Page Object method, that's the fix — reuse the existing method instead of inlining `page.getByRole(...)`/`page.locator(...)`. Check _every_ remaining `page.*` call in the spec against this rule, not just the ones that happen to have an obvious existing PO equivalent — a raw locator with no PO equivalent yet isn't a pass, it's a missing-locator finding (add the locator to the Locators class, don't leave the `page.*` call inline).
- Prefer shared labels, endpoint constants, fixtures, and authentication helpers over duplicated setup.
- Keep users, URLs and settings in `src/config/` (validated by the Zod schemas in `src/config/schemas/`), and shared test data in a shared module rather than inside specs. Flag arrays/objects of expected values (names, codes, addresses, IDs, ...) declared as local `const`s inside a spec — that's the same inline-instead-of-shared problem as locators, just for data instead of selectors.
- Look for selectors and waits that may be flaky across roles, locales, viewports, environments, or timing variations.
- When a spec's assertion checks a hardcoded string/substring (e.g. `toContainText`), verify the literal's exact casing and formatting against what the real UI renders — `toContainText` is case-sensitive by default. A miscased or mistyped literal either fails against the real page or, if too loose to be meaningful, passes without actually verifying the value.
- Flag leftover `expect.soft` / `.soft(...)` assertions: soft assertions are a development-time aid and must not remain in the final PR. Treat them as a blocker unless the author documents a deliberate, justified reason for keeping them.
- Spec files should contain only tests, not fixture definitions. A `test.extend<...>({...})` (or any custom fixture) declared inline in a `*.spec.ts` file is a blocker — fixtures belong in `lib/fixtures/` (or another shared fixtures module) and get imported into the spec. This applies regardless of how many specs use it yet — see the "Page objects and fixtures" section of repository-guidelines.md. A one-off case that genuinely needs fixture semantics (guaranteed teardown, DI) belongs in `lib/fixtures/` on first use, not in the spec.

## Review comments and CI

- Are requested changes still unresolved?
- Do inline comments refer to code that has moved or changed?
- Are CI failures caused by this PR, pre-existing, or unsupported by enough evidence?
- If a check is considered flaky, what evidence supports that conclusion?

## Finding classification

- **Blocker:** must be fixed before approval.
- **Question:** requires clarification from the author.
- **Suggestion:** improves maintainability or readability but does not block approval.
- **Follow-up:** acceptable after merge only when explicitly tracked.
- **No issue:** mention only when it materially reduces reviewer uncertainty.

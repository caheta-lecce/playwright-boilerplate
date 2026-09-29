---
name: create-page-object
description: Create a new Playwright page object (Locators/Actions/Page) and its first spec from the live application — explore the real UI first, capture every state including success, error, validation, loading and empty feedback, choose accessible locators, register the fixture, and verify with type check, lint, tests and the pom-reviewer and a11y-reviewer skills. Use when the user asks to add a page object, cover a new page or flow, or write tests for a page that has no page object yet. For moving code out of an existing spec use refactor-spec instead.
---

# Create a page object from the live application

Build page objects from what the application really renders, not from designs, documentation or
guesses. Follow `docs/ai/repository-guidelines.md`; `src/pages/example/` is the reference
implementation.

## Rules

- **Explore before writing locators.** Every locator must come from the real UI. If the application
  can't be reached, or login fails, stop and tell the user exactly what is missing (URL,
  credentials, environment). Never ship placeholder or guessed locators.
- **Capture more than the happy path.** Forms and CRUD flows need locators for success feedback,
  error feedback, field validation messages, and loading or empty states where the app has them.
- **Locator priority:** `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` >
  `getByTestId`. No XPath; CSS classes or IDs only as a last resort, with a comment saying why.
- **No fixed sleeps.** Wait for observable state with web-first assertions or
  `page.waitForResponse(...)`.

## Process

### 1. Check what already exists

Look in `src/pages/` and `lib/fixtures/page-fixture.ts` for a page object that already owns this
DOM. If one exists, extend it instead of creating a parallel one. Read a sibling page object in the
same domain to match its naming.

### 2. Explore the live application

Open the page the way a user would, using whichever browser tool is available: a browser
automation tool or MCP in your environment, or Playwright's recorder:

```bash
npx playwright codegen <BASE_URL>/<path>
```

For pages behind login, reuse the saved session so you don't record the login each time. The setup
project writes it to `.auth/<env>/<browser>.json` (run `npm run test:chromium` once to create it):

```bash
npx playwright codegen --load-storage=.auth/<env>/chromium.json <BASE_URL>/<path>
```

At each state, note forms and their labels, buttons and links with their accessible names, and
feedback elements. Trigger the flows (submit empty, submit invalid, submit valid, cancel) to see the
**exact** messages the app shows. Codegen output is raw material for locators, not code to paste
into a spec.

### 3. Plan the coverage

List the states the tests will reach: happy path, validation, errors, and edge cases such as empty
lists. If acceptance criteria exist, cross-check them against what you saw. Share the list with
the user if the scope is unclear.

### 4. Write the three files

Under `src/pages/<domain>/`:

- `<Name>Locators.ts` — `readonly` `Locator` properties only, grouped as interactive elements, then
  feedback and validation messages. Use a method returning a `Locator` when it needs a parameter.
- `<Name>Actions.ts` — one method per user intent (`open`, `signIn`, `submitOrder`), using the
  locators class. No assertions except stability guards an interaction needs.
- `<Name>Page.ts` — composes both as `on` (locators) and `do` (actions).

### 5. Register the fixture

Add the page object to `lib/fixtures/page-fixture.ts`. Specs receive it by name and never call
`new`. Never declare `test.extend()` inside a spec.

### 6. Write the first spec

Under `src/tests/ui/<domain>/`, import `test` and `expect` from `@fixtures/base`. Drive the flow
through `<page>.do.*`, assert through `<page>.on.*`, and call `scanAxe('<state>')` after each
meaningful state is reached and asserted. Read users and settings from `src/config/`, never
literals. For a signed-out state, use `test.use({ storageState: { cookies: [], origins: [] } })`.

### 7. Verify

```bash
npm run type:check
npm run lint
npx playwright test src/tests/ui/<domain>/ --repeat-each=3
```

Then apply the `pom-reviewer` and `a11y-reviewer` skills to the new files — in subagents if your
tool supports them (Claude Code: the `pom-reviewer` and `a11y-reviewer` agents) — and fix what they
flag.

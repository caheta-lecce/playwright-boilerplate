---
name: refactor-spec
description: Refactor an existing Playwright spec in src/tests/ui/ to this repository's Page Object Model conventions — relocating raw locators/interactions into Locators/Actions/Page classes, replacing hardcoded data with configuration, and reusing existing fixtures/page objects instead of duplicating them. Use when the developer asks to refactor a spec, clean it up, or make it follow repo guidelines.
---

# Refactor a spec to repository conventions

Use this skill to bring an existing Playwright spec in `src/tests/ui/` up to this repository's Page
Object Model conventions, as documented in `docs/ai/repository-guidelines.md`. Treat that document
as the source of truth for structure; this workflow is the step-by-step process for applying it to
a specific spec.

## When this applies

The developer asks to refactor, clean up, or "follow repo guidelines" on a spec file (or a small set
of them). Not for writing a brand-new spec from scratch, and not for reviewing a diff without
changing it (the `pom-reviewer` skill does that).

## Process

1. **Read the target spec fully**, plus `docs/ai/repository-guidelines.md`. Note the fixtures it
   destructures from `test()` — these point at the page objects that already own this flow.

2. **Read every Locators/Actions/Page file behind those fixtures** before writing anything. This
   tells you the naming conventions (`.on` for locators, `.do` for actions), which methods already
   exist, and where similar interactions were already modeled — reusing an existing method beats
   adding a near-duplicate one. `src/pages/example/` is the reference implementation.

3. **Find a sibling spec that already exercises the same page correctly.** Specs in the same
   `src/tests/ui/<domain>/` folder, or ones using the same fixtures, often show the idiomatic way to
   drive a flow. Mirror that shape instead of inventing a new one.

4. **Catalog every raw Playwright call and hardcoded value in the spec**: `page.locator(...)`,
   `page.getByRole(...)`, `page.mouse.*`, `page.goto(...)`, hardcoded URLs, users and test data.
   Each one is a candidate to relocate or replace.

5. **Relocate raw locators and interactions into the right page object**, following the three-file
   pattern (`<Name>Locators.ts`, `<Name>Actions.ts`, `<Name>Page.ts`):
   - Locators go in the `Locators` class as named `readonly` properties (or a method returning a
     `Locator` when parameterized by index or name).
   - Multi-step interactions (fill-then-submit, drag-and-drop, open-then-confirm) go in the
     `Actions` class as one method with a clear name — don't leave the sequence inline in the spec.
   - Decide the home by DOM ownership, not by which spec needs it: a locator inside a dialog
     belongs to the dialog's page object, not to the page that merely opens it.
   - If you create a new page object, register it in `lib/fixtures/page-fixture.ts` so specs receive
     it as a fixture. Never declare `test.extend()` in the spec.
   - Preserve pre-existing stability guards (for example an `expect(...).toBeVisible()` before an
     interaction) when moving code — they were often added to work around a specific timing issue.

6. **Replace hardcoded data with its source of truth.** URLs come from `BASE_URL` (use relative
   paths with `page.goto`), and users and settings come from `src/config/`, validated by the Zod
   schemas in `src/config/schemas/`. Add a field to the schema instead of typing a value literally
   in the spec. Never commit credentials — read them from environment variables.

7. **Remove debug leftovers**: `page.pause()`, stray `console.log`, `test.only`, fixed
   `waitForTimeout` sleeps (replace with a web-first assertion on observable state), and TODO
   comments that no longer apply. Fix `test.step` titles that no longer describe what the step does.

8. **Don't change test behavior.** This is a structural refactor: same assertions, same order, same
   data. The only behavior-adjacent changes allowed are the ones the guidelines require.

9. **Prefer robust selectors when relocating a fragile one.** If an inline locator used something
   brittle (e.g. `page.locator('div').filter(...).nth(N)`), look for an accessible alternative (a
   role with a name, a label, an `aria-live` region, a `data-testid`) before copying the brittle
   version into the page object. Fixing it here is cheap; leaving it means every future consumer
   inherits the fragility.

## Verify

10. Run the type checker and linter (`npm run type:check`, `npx eslint <changed files>`), then the
    refactored spec (`npx playwright test <spec path>`). All must be clean.

11. Apply the `pom-reviewer` skill (`.agents/skills/pom-reviewer/SKILL.md`) to the changed spec and
    page object files — in a subagent if your tool supports one (Claude Code: the `pom-reviewer`
    agent), so the check is independent of the context that wrote the code. Feed it the list of
    changed files and a short description of what moved where. Apply anything it flags as a real
    convention mismatch.

12. If the spec reaches UI states that deserve an accessibility scan and doesn't have one, flag it
    to the developer rather than adding it silently. Apply the `a11y-reviewer` skill
    (`.agents/skills/a11y-reviewer/SKILL.md`) the same way for that check.

## Common pitfalls

- Don't invent a new page object when an existing one already owns the DOM you're touching —
  extend it.
- Don't silently drop a comment that explains _why_ a locator or interaction is written the way it
  is (timing workarounds, strict-mode scoping) when relocating it — carry the comment with the code.
- Don't abstract a truly one-off, single-use read into a page object method just for the sake of it
  if a sibling-spec convention already does it inline in an `expect`.

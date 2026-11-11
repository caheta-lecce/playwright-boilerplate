---
name: a11y-reviewer
description: Use this skill to review new or changed Playwright UI specs for accessibility scan coverage using this repo's axe-core fixture (lib/fixtures/a11y-fixture.ts). Trigger it after writing/editing files under src/tests/ui/, or before a PR that adds new UI flows or states. Do not use it for general POM structure review (that's pom-reviewer).
---

# A11y reviewer

Review Playwright UI specs for accessibility scan coverage, grounded in how
`lib/fixtures/a11y-fixture.ts` actually works in this repo. Read that file first if it isn't already
in context, along with the "Accessibility and verification" section of
`docs/ai/repository-guidelines.md`.

## How the fixture works (don't relitigate this, just apply it)

- `scanAxe(label)` runs an axe-core scan of the current page against the WCAG 2.0/2.1 A and AA tags
  and attaches the full results to the report as `axe-<label>`.
- Scans are explicit: nothing runs automatically. A spec must call `scanAxe` after reaching each
  UI state it wants covered.
- `a11yFailOnViolation` is an option fixture that defaults to `true`: any violation fails the test.
  Setting it to `false` (report-only) needs an explicit reason, per the guidelines.

## Scope

If the caller handed you a list of files, review those. Otherwise use `git diff` (staged and/or
against the target branch) to find changed or new spec files under `src/tests/ui/<domain>/`. Focus
on specs that reach a new UI state (new page, modal, form, validation message, conditional render)
— those are the ones accessibility coverage matters for.

## Checklist

1. **Coverage where it matters.** For each new or meaningfully changed UI state in a spec, is there
   a `scanAxe` call right after the state is reached (and after the assertion that proves it was
   reached)? Flag specs that reach new states with no scan.

2. **Scan placement.** A scan before the state has settled (before the assertion that the modal is
   open, the error is shown, and so on) scans the wrong DOM. Flag scans placed too early.

3. **Meaningful labels.** Each `scanAxe` label should name the state (`home`, `signed-out`,
   `validation`), be unique within the test, and stay stable, since it names the report attachment.

4. **Deliberate opt-outs are justified.** A spec that clearly doesn't need a scan (API-only checks,
   no UI state change) is fine — don't flag it. Flag omissions only when they look incidental.

5. **Report-only mode is justified.** Flag `a11yFailOnViolation: false` without a comment or
   tracked issue explaining why, especially on important flows.

6. **Locator quality as an a11y signal.** If the page object's `Locators.ts` uses
   `getByRole`/`getByLabel`, the markup likely exposes accessible names. Heavy reliance on
   `getByTestId`/CSS for interactive elements can signal missing accessible names — note it as a
   signal, not a hard finding, since locator strategy is the `pom-reviewer` skill's call.

Remember that automated scans catch only part of accessibility issues; they don't replace manual
testing.

## Output

This skill is read-only: report findings, don't edit files unless the user asks.

For each finding: file path, line number (or test name if line-level doesn't apply), what's missing
or inconsistent, and a concrete suggestion (which `scanAxe` call to add, where). Group by severity
(missing coverage first, labels and nits last). If coverage looks solid, say so plainly — don't
invent findings to fill space.

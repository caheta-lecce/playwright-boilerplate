---
name: pr-description-writer
description: Write a short PR description for the changes on the current branch, ready to paste into GitHub or pass to gh pr create --body. Flags stray diffs and suggests a branch split when a diff bundles multiple unrelated changes. Use when the user asks to draft/write a PR description or open a PR with no more specific instructions.
---

# Write a PR description

Use this workflow to draft a short PR description for the changes on the current branch, ready
to paste into GitHub or pass to `gh pr create --body`.

## When this applies

The developer asks to draft or write a PR description (or open a PR) for the current branch,
with no more specific instructions than that.

## Gather the diff

1. **Find the base branch.** Default to `main` unless the repository clearly uses something
   else (check the remote's default branch or recent merge commits if unsure).
2. **Gather the diff:**
   - Commit history for the branch (base..HEAD).
   - Which files changed and by how much (base...HEAD, stat form).
   - The diff itself for the non-trivial files from the stat — skip lockfiles, generated files,
     and anything whose diff is self-explanatory from the stat alone.

## Categorize and check for scope creep

3. **Categorize the changes by intent, not by file:** tooling/CI, docs, bug fix, new feature,
   refactor, dependency bump, config/lint. A single PR often mixes categories (e.g. a tooling
   change plus an incidental typo fix it uncovered) — call out the incidental ones separately so
   they don't get mistaken for the main point.
4. **Check for stray/unrelated diffs, and decide if the branch should be split.** Two different
   signals:
   - A small one-off diff unrelated to the branch's apparent purpose (a drive-by rename, a
     leftover debug line) — flag it inline in the Summary as a side note; don't fold it silently
     into the main bullets.
   - Multiple _substantial_, independent changes bundled into one diff (e.g. a new feature plus
     an unrelated refactor, or two unrelated features) — when this happens, add a
     `## Suggested branch split` section proposing how to pull them apart, one branch per
     logical change, each named `feature/<short-description>`. Skip this section entirely when
     the diff is already one coherent change; don't force a split suggestion onto a
     single-purpose PR just to have the section.

## Write the description

5. **Check the applicable Change Type box(es).** Map the categories identified in step 3 onto the
   template's checklist: Feature, Bug Fix, Enhancement, Refactoring, Configuration Change, CI/CD,
   Documentation, Other. Check every box backed by a substantial part of the diff; leave the rest
   unchecked. Most PRs check exactly one box — check more than one only when the diff genuinely
   spans categories (e.g. a new feature that also updates its docs), not for a small incidental
   change already called out as a side note in Summary (step 4).

6. **Write in plain, reviewer-friendly language.** Summary bullets should read like explaining
   the change out loud to a reviewer who doesn't already know the codebase — lead with what
   changed and why it matters, not an inventory of every file, schema, or function touched. Keep
   exhaustive technical detail (table/column names, type names, exact file paths) out of the
   prose; that detail belongs in the code itself or in an inline link, not spelled out in the
   bullet text. One bullet, one idea.

   Use this format:

   ```markdown
   ## Change Type

   - [ ] Feature
   - [ ] Bug Fix
   - [ ] Enhancement
   - [ ] Refactoring
   - [ ] Configuration Change
   - [ ] CI/CD
   - [ ] Documentation
   - [ ] Other

   ## Summary

   - <bullet per logical change, in plain language, why it was made not just what changed>

   ## Changes by file

   - `<path>` — <one-line, technical note of what changed in this file>

   ## Test plan

   - [ ] <concrete verification step — only include steps that make sense for this diff>
   ```

   The **Changes by file** section is the technical inventory the Summary bullets
   deliberately leave out (table/column names, function names, exact paths) — always
   include it, one bullet per changed file. Group a pure rename with its destination on one
   line (`old/path → new/path` — renamed, no content change) instead of listing it twice.
   Skip lockfiles and generated/report output the same way step 2 does when gathering the
   diff; everything else that changed gets a line, even a one-liner.

   Add `## Suggested branch split` (see above) only when the diff bundles multiple independent
   changes:

   ```markdown
   ## Suggested branch split

   - `feature/<name-1>` — <what belongs here>
   - `feature/<name-2>` — <what belongs here>
   ```

   Keep it tight for small PRs: if the whole change is one logical thing (e.g. "add pre-commit
   hooks"), one checked Change Type box, one Summary bullet, and one Test plan line is enough —
   don't pad it with restating the diff stat.

7. **Don't invent a test plan.** Only list verification steps that are actually meaningful for
   what changed (e.g. "run the linter" only if lint config changed; "run the affected spec" only
   if a spec/page-object changed). If nothing is meaningfully testable (pure docs/config), say so
   briefly instead of fabricating steps.

## Output

Output the description as chat text (don't write it to a file) unless the developer has a GitHub
CLI available and asks to actually open the PR — in that case, check status/diff/log, then open
the PR with the description as its body.

## Repository-specific notes

Follow `docs/ai/repository-guidelines.md`. In particular:

- This is a Playwright end-to-end suite — most feature PRs touch `src/pages/`, `src/tests/ui/`,
  `lib/fixtures/`, or `lib/api/`. Tooling/CI PRs (Husky, ESLint, the CI workflow, `tsconfig.json`
  paths) are common too and don't need a test plan beyond "hooks/CI run clean."
- If `package.json` scripts, `lint-staged`, or `.husky/` changed, the test plan should mention
  verifying the hook actually fires (e.g. committing a deliberately unformatted file) rather than
  just "tests pass."
- If `.agents/skills/` changed, the test plan should mention `npm run ai:skills:check`.
- If Zod schemas (configuration or API responses) changed, the test plan should mention running
  the spec(s) that depend on them.

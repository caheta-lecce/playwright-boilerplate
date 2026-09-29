# Agent instructions

Read and follow [docs/ai/repository-guidelines.md](docs/ai/repository-guidelines.md) before editing.
Keep shared conventions there. Add tool-specific configuration only in the corresponding tool folder.

## Skills

Reusable workflows live in `.agents/skills/<name>/SKILL.md`, the single source of truth for every
assistant. When a request matches a skill, read its `SKILL.md` completely and follow it. After
adding or editing a skill, run `npm run ai:skills:sync` to regenerate the tool-specific entry points
(`.claude/skills/`, `.claude/agents/`, `.github/prompts/` and the list below). Never edit generated
files directly.

<!-- skills:start -->

- [`a11y-reviewer`](.agents/skills/a11y-reviewer/SKILL.md) — Use this skill to review new or changed Playwright UI specs for accessibility scan coverage using this repo's axe-core fixture (lib/fixtures/a11y-fixture.ts).
- [`create-page-object`](.agents/skills/create-page-object/SKILL.md) — Create a new Playwright page object (Locators/Actions/Page) and its first spec from the live application — explore the real UI first, capture every state including success, error, validation, loading and empty feedback, choose accessible locators, register the fixture, and verify with type check, lint, tests and the pom-reviewer and a11y-reviewer skills.
- [`debug-test`](.agents/skills/debug-test/SKILL.md) — Triage a failing, flaky or unexpectedly behaving Playwright test — read the failure message, classify the failure mode (timeout on action/assertion/navigation, strict-mode violation, assertion mismatch, Zod validation error, network error, fixture/import error, order dependence), reproduce it narrowly, pick the right tool (UI Mode, Trace Viewer, headed run), and fix the cause without suppressing it.
- [`investigate-pr`](.agents/skills/investigate-pr/SKILL.md) — Investigate GitHub pull requests before review by gathering PR metadata, branch context, commits, changed files, diff, review comments, unresolved threads, and CI status.
- [`log-test-error`](.agents/skills/log-test-error/SKILL.md) — Diagnose a newly encountered Playwright test-run error and log it to docs/troubleshooting.md with root cause and fix.
- [`pom-reviewer`](.agents/skills/pom-reviewer/SKILL.md) — Use this skill to review new or changed Playwright page objects and spec files for adherence to this repo's Page Object Model conventions, as documented in docs/ai/repository-guidelines.md.
- [`pr-description-writer`](.agents/skills/pr-description-writer/SKILL.md) — Write a short PR description for the changes on the current branch, ready to paste into GitHub or pass to gh pr create --body.
- [`refactor-spec`](.agents/skills/refactor-spec/SKILL.md) — Refactor an existing Playwright spec in src/tests/ui/ to this repository's Page Object Model conventions — relocating raw locators/interactions into Locators/Actions/Page classes, replacing hardcoded data with configuration, and reusing existing fixtures/page objects instead of duplicating them.
- [`review-branch`](.agents/skills/review-branch/SKILL.md) — Review a local Git branch's diff against this repository's own conventions — three-dot diff, routed checks (pom-reviewer/a11y-reviewer/API coverage), lint/typecheck/test verification scoped to changed files, and a tiered report with a confidence score.
- [`review-scenarios`](.agents/skills/review-scenarios/SKILL.md) — Review test-plan documents (docs/test-plans/*.md) before implementation, checking test completeness, automation feasibility, merge correctness, missing test data, and open-point coverage.
- [`safe-rename`](.agents/skills/safe-rename/SKILL.md) — Safely change a shared value — a constant or enum member, its key, a configuration field, a UI message used in assertions, an endpoint path, or shared test data — with impact analysis first (search both the symbol and the raw value), atomic updates of every consumer, no loosening of schemas, and full verification.

<!-- skills:end -->

# Contributing

Read [`docs/ai/repository-guidelines.md`](docs/ai/repository-guidelines.md) first: its
**Constitution** section holds the MUST / SHOULD / WON'T rules that apply to every change, whether
a person or an AI assistant makes it. Use [conventional commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `refactor:`, ...).

## Setup

```bash
nvm use            # Node 22, see .nvmrc
npm ci
npx playwright install
```

## Before opening a PR

```bash
npm run type:check
npm run lint
npm run format:check
npm run guidelines:check
npm run test:unit
npm run ai:skills:check
npm test
```

After a run, `npm run a11y:report` turns the axe results in `reports/a11y/` into `summary.md` and
`issues.csv`, and `npm run a11y:compare -- <base> <head>` lists new, fixed and unchanged violations
(exit 1 on new ones, `--no-fail` to disable; defaults `previous` and `latest`).

`npm run test:ci` is `npm test` plus `--forbid-only`, as CI runs it (the config already sets
`forbidOnly` when `CI` is set; the script makes the same check available locally). While working,
`npm run test:changed` runs only specs changed since the last commit (`test:changed:main` against
`main`; the auth setup still runs because spec projects depend on it), `npm run test:debug` opens the
Playwright inspector and `npm run lint:fix` applies ESLint fixes. File names are checked by lint, see
"File naming" in the guidelines.

`npm test` skips `@destructive` tests. Every test carries exactly one suite tag (`@smoke` or
`@regression`); run one suite with `npm run test:smoke` or `npm run test:regression`.

The Husky pre-commit hook runs `lint-staged` and the guideline rules on staged files, and CI runs
the same checks. Do not bypass hooks (`--no-verify`) and do not weaken a rule to get green.

## Where things live

- Rules: `docs/ai/repository-guidelines.md`; the mechanical checks are in
  `scripts/guideline-rules.mjs` with their tests in `unit-tests/guidelines/`.
- Skills: `.agents/skills/<name>/SKILL.md` is the only source of truth.
- Generated files: `.claude/skills/`, `.claude/agents/`, `.github/prompts/` and the skill list in
  `AGENTS.md` are produced by `npm run ai:skills:sync`. Never edit them by hand; edit the canonical
  skill, run the sync, and commit the result. `npm run ai:skills:check` fails CI if they drift.

## Guard files

Claude Code's PreToolUse hook blocks any Write, Edit or MultiEdit by the agent on the files that
enforce the rules: `.claude/scripts/**`, `.claude/settings.json`, `scripts/guideline-rules.mjs`,
`scripts/check-guidelines.mjs` and `.husky/**`. A person edits them by hand, or relaunches the agent
with `ALLOW_GUARD_EDITS=1` set in the environment outside the agent (for example
`ALLOW_GUARD_EDITS=1 claude`). The agent reports the change it needs instead of working around it.

## Branch variants and where to fix things

The repository ships in three stacked variants (see the "Variants" table in the README). Fix bugs and
add shared changes on `main`, then merge `main` into `ui-a11y`, and `ui-a11y` into
`ui-a11y-dast`. Never fix something only on an upper branch, or the variants drift apart.

## Pull requests

Keep a PR to one concern, fill in the pull request template, and mention anything you could not
verify.

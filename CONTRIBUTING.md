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

## Pull requests

Keep a PR to one concern, fill in the pull request template, and mention anything you could not
verify.

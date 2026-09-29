---
name: review-branch
description: Review a local Git branch's diff against this repository's own conventions — three-dot diff, routed checks (pom-reviewer/a11y-reviewer/API coverage), lint/typecheck/test verification scoped to changed files, and a tiered report with a confidence score. Use when the user names a branch alongside a review intent, even without a GitHub PR ("review branch X", "is branch Y good to merge", "audit the changes on branch Z"). Do not use for reviewing an existing GitHub PR's mergeability/CI/threads (that's investigate-pr) or for authoring new tests/page objects from scratch.
---

# Review a branch against repository conventions

Use this skill to review an entire local branch's diff against this repository's own conventions —
a routed, verified, tiered code-quality pass that doesn't require a GitHub PR to exist. Treat
`docs/ai/repository-guidelines.md` as the source of truth for every rule cited here.

This is distinct from the `investigate-pr` skill, which requires an existing GitHub PR and focuses
on mergeability, CI status, and review threads. It is also distinct from the `pom-reviewer` and
`a11y-reviewer` skills, which review a fixed set of files handed to them rather than resolving a
branch diff, routing it, and running verification themselves. This skill composes those two as
delegated checks instead of duplicating their logic.

## Input

The user supplies a branch name and a review intent (e.g. "review branch feature/login", "is branch
X good to merge"). The base branch is auto-resolved, not hardcoded; accept an override if the user
names a different base.

## Process

### 1. Resolve base & fetch

```bash
BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
BASE=${BASE:-main}

git fetch origin "<branch>" "$BASE"
```

- **Dirty working tree** — if `git status --porcelain` is non-empty, stop and ask before switching
  branches. Never switch over uncommitted work silently.
- **Missing branch** — if the branch isn't on `origin`, check for a local branch of that name; if
  neither exists, report that and stop.
- Read the branch without switching the working tree when possible (e.g. `git diff` against
  `origin/<branch>`); only switch if verification requires a live checkout, and restore the original
  branch afterward.

### 2. Three-dot diff, mandatory

```bash
git diff "$BASE"...origin/<branch> --stat
git diff "$BASE"...origin/<branch>
```

Always three dots (`$BASE...branch`), which diffs against the merge-base — the point where the
branch forked — so only what the branch actually authored is reviewed. A two-dot diff drags in every
commit that landed on the base branch after the fork and produces false findings against code the
branch's author never wrote. Read the whole diff before forming an opinion; if a finding's hunk
doesn't appear in the three-dot diff, it isn't a finding.

### 3. Route changed paths

The changed files decide which checks apply. Map every changed path before reviewing:

| Changed path (glob)                                            | What to apply                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/**`, `src/tests/ui/**`, `lib/fixtures/**`           | Apply the `pom-reviewer` skill (`.agents/skills/pom-reviewer/SKILL.md`) to these files — in a subagent if your tool supports one (Claude Code: the `pom-reviewer` agent). |
| `src/tests/ui/**` that reach new UI states                     | Apply the `a11y-reviewer` skill (`.agents/skills/a11y-reviewer/SKILL.md`) the same way.                                                                                   |
| `lib/api/**`, `src/models/**`, `src/shared/types/api-types.ts` | Apply the "API coverage" section of `docs/ai/repository-guidelines.md`.                                                                                                   |
| `.agents/skills/**`                                            | Check `npm run ai:skills:check` passes (generated entry points are in sync).                                                                                              |
| anything else                                                  | Apply the general rules in `docs/ai/repository-guidelines.md`.                                                                                                            |

If a change spans multiple rows, apply all that match.

### 4. Verify — run the checks, don't just read

Scope lint and format checks to the changed files only; don't treat pre-existing issues as the
branch's fault.

```bash
CHANGED=$(git diff "$BASE"...origin/<branch> --name-only --diff-filter=d -- '*.ts' '*.mjs' '*.js')

[ -n "$CHANGED" ] && echo "$CHANGED" | xargs npx eslint
[ -n "$CHANGED" ] && echo "$CHANGED" | xargs npx prettier --check
```

**Typecheck, narrowed to changed files.** `tsc --noEmit` always type-checks the whole project —
passing individual files to `tsc` ignores `tsconfig.json` and gives wrong results, so don't. Run the
full check, then filter its output to the changed paths:

```bash
npx tsc --noEmit 2>&1 | grep -F -f <(echo "$CHANGED") \
  && echo ">>> tsc errors above are in changed files — the branch's responsibility" \
  || echo "no tsc errors in changed files"
```

Then run the affected Playwright spec(s). Read the real project names from `playwright.config.ts`
first rather than assuming them — by default there is one project per browser (`chromium`,
`firefox`, `webkit`), each depending on its own `<browser>-setup` authentication project:

```bash
npx playwright test <changed spec path> --project=chromium
```

**Missing env vars or credentials are an environment limitation, not a branch defect.** If a spec
needs credentials that aren't available locally, report that verbatim (e.g. "could not run — missing
`<var>`; run manually before merge") and move on. Never invent, hardcode, or stub a credential to
force a green run.

### 5. Mandatory gate — mechanical scan before writing the report

Do not write the report until this step is done. Run the same rule table the Claude Code
guideline-enforcement hook uses, in scan mode over every changed file's current content:

```bash
node --input-type=module -e "
  const { RULES } = await import('./.claude/scripts/guideline-rules.mjs');
  const fs = await import('node:fs');
  const changed = process.argv[1].split('\n').filter(Boolean);
  for (const relPath of changed) {
    const content = fs.readFileSync(relPath, 'utf8');
    for (const rule of RULES) {
      if (rule.pathTest(relPath) && rule.contentTest(content)) {
        console.log(\`[\${rule.id}] \${relPath}: \${rule.message}\`);
      }
    }
  }
" "$CHANGED"
```

Every hit is a finding. Combine this with the routed checks from step 3 — nothing gets marked fine
without actually being checked.

### 6. Report

Produce a tiered report using the same verdicts as the `investigate-pr` skill:

```markdown
**Verdict: <APPROVE | NEEDS CHANGES | UNDETERMINED>**

<One sentence saying what to do now.>

**🔴 Must fix**

- <file:line — problem — why it matters (cite the rule) — concrete fix>

**🟠 Should consider**

- <same format, lower priority>

**🟡 Minor**

- <same format, style nits>

**✅ Done well**

- <what is done well — don't invent items to fill space>

**Confidence: <1-10>** — <one line on why, and what remains uncertain (e.g. specs not runnable for
missing credentials)>

**Open questions for the author**

- <things that can't be resolved by reading the repository alone>
```

Reserve `NEEDS CHANGES` for demonstrated problems with material impact, and use `UNDETERMINED` when
verification couldn't actually run (missing environment, unreadable diff) rather than guessing.

**Empty tiers stay empty.** When a tier (`🔴`, `🟠`, `🟡`) has no findings, write exactly `None` and
stop — no trailing sentence. A sentence under a "must fix" heading reads as an open item regardless
of its wording. On a re-review where an earlier finding was fixed, confirm it under **✅ Done well**
instead.

Report in chat by default. Never edit files, commit, push, or open or comment on a pull request
unless the user explicitly asks afterward.

### 7. Optional, gated — only if the user asks after seeing the report

Offer to implement specific findings. Only then edit files, following the routed guidance from step
3 and matching sibling patterns. Re-run step 4's verification on whatever changed. Ask permission
before committing — never commit without explicit approval.

## Guardrails

- Read-only through step 6. A request to "review" a branch gets a report and nothing else.
- Three-dot diff always — diffing against the base branch's own later commits is the most common
  source of false findings in this kind of review.
- Every finding needs a hook: a rule from `docs/ai/repository-guidelines.md`, a real bug, or a
  concrete coverage gap. Style opinions without a rule behind them are noise, not findings.
- Environment or credential failures are not branch defects — distinguish "the branch is wrong" from
  "I lack the credentials to run it locally."

---
name: investigate-pr
description: Investigate GitHub pull requests before review by gathering PR metadata, branch context, commits, changed files, diff, review comments, unresolved threads, and CI status. Use when the user asks to investigate, explain, summarize, understand, review, or re-check a PR and wants a verdict, risks, questions, or a technical checklist without immediately changing code.
---

# Investigate a pull request

Use this skill to understand a GitHub pull request before review. The goal is to explain its intent, verify what changed, identify blockers and risks, and recommend one clear reviewer action without changing code.

## Inputs and access

Accept a PR URL or number. If neither is provided, infer the PR from the current branch when possible.

Authenticated access to the repository host is a prerequisite. Before inspecting the diff, verify that the available GitHub integration or GitHub CLI (`gh`) can read PR metadata, CI/checks, reviews, comments, and unresolved threads. Use local `git` only after this access check, to inspect branches, diffs, nearby patterns, and tests.

If authentication is missing, expired, or insufficient, stop and initiate or request login. For GitHub Enterprise, authenticate against the hostname found in the repository remote. After login, verify access with `gh auth status --hostname <host>` and a read-only `gh pr view`. Do not investigate or issue a verdict from local Git refs alone.

Check `gh --version` first. On Windows, if `gh` isn't on `PATH`, try
`C:\Program Files\GitHub CLI\gh.exe --version` and, if it works, use that path for every `gh`
call — a missing `PATH` entry is not a missing installation. To log in:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth login --hostname <github-enterprise-host> --web
```

When running in a sandbox, verify an apparent authentication failure with the required network and system-keyring permission before requesting another login. A sandbox may report a valid keyring token as missing or invalid because it cannot access the credential store or GitHub Enterprise API.

## Investigation

1. Identify the repository, PR number, title, author, state, base branch, and head branch.
2. Read the PR description, labels, linked issues, reviewers, requested changes, and mergeability state.
3. Inspect commits, changed files, and the diff, starting from a file-level summary.
4. Check CI status and investigate relevant failing or pending checks.
5. Read review comments and unresolved inline threads when available.
6. Compare the local checkout with the remote PR if the local branch may be stale.
7. Read the changed code and the surrounding implementation needed to understand its behavior.
8. Search for existing nearby patterns before judging a change.
9. Check whether the PR scope matches its stated purpose and whether tests cover the changed behavior.
10. Classify important findings as blockers, questions, suggestions, or follow-ups.

For this repository, follow `docs/ai/repository-guidelines.md`. Pay particular attention to existing fixtures, Page Objects, shared constants, authentication patterns, stable selectors, test data, environment coupling, and deterministic waits.

## Investigation guidance

- Prefer GitHub integrations for read-only PR data and `gh` for gaps.
- Inspect the diff at summary level before reading individual files.
- Use `rg` to find nearby repository patterns before evaluating an implementation.
- Read [`references/review-lens.md`](references/review-lens.md) when the PR is broad, risky, failing, or requires more than a simple summary.
- For accessibility specs, flag as a blocker: a new UI state reached without a `scanAxe` call, `a11yFailOnViolation: false` without a documented reason, or caught/ignored errors that could let the overall test pass.
- Flag specs that inline `page.getByRole(...)`/`page.locator(...)` interactions instead of calling a page object action (`<page>.do.*`): specs should contain only page object action calls and assertions. A locator (`<page>.on.*`) should only ever appear inside an `expect(...)` in a spec. This applies even when no page object locator exists yet for that element — that's a missing-locator finding (add it), not something to skip past because there's nothing to "reuse."
- Flag users, URLs, credentials or settings typed literally in a spec instead of coming from `src/config/`. Also check hardcoded assertion strings for casing/formatting typos against the real UI — `toContainText` is case-sensitive by default, so a miscased literal silently breaks the check's intent.
- Put at most one or two blockers in the main answer; group lesser findings briefly.
- For a re-check, state what changed since the previous analysis and whether the previous blocker is resolved.
- Do not edit code, submit reviews, resolve threads, or post comments unless the user separately authorizes that action.

Useful fallback commands:

```bash
gh pr view <pr> --json number,title,state,author,baseRefName,headRefName,body,labels,reviewRequests,reviews,comments,commits,files,mergeStateStatus,statusCheckRollup
gh pr diff <pr> --name-only
gh pr diff <pr>
gh pr checks <pr>
git status --short --branch
git diff --stat <base>...HEAD
git log --oneline <base>..HEAD
```

## Decision rules

Use exactly one verdict:

- `APPROVE`: the code was verified, relevant checks are green, and no blocking issue remains.
- `NEEDS CHANGES`: code, tests, checks, or unresolved feedback reveal a blocker that should be addressed before approval.
- `UNDETERMINED`: missing access, unavailable evidence, or pending checks prevent a reliable decision.

If the code appears correct but relevant checks are pending or unavailable, do not mark it approvable. Explain what must complete or be verified.

Separate observed facts from inferences. Do not implement fixes unless the user explicitly asks after the investigation.

Reserve `NEEDS CHANGES` for demonstrated problems with material impact. Classify defensive hardening, style, naming, and unlikely edge cases as non-blocking suggestions unless concrete evidence makes them blockers.

## Response

Keep the verdict and immediate action visible without scrolling. Default to this compact structure and omit empty sections:

```markdown
**Verdict: <APPROVE | NEEDS CHANGES | UNDETERMINED>**

<One sentence stating what the reviewer should do now.>

<Two to four short sentences explaining the PR, the main reason for the verdict, and any access or check limitation.>

**Message for the author**

> <Short, polite, copy-ready message with the problem or requested confirmation and expected result.>

**Technical details, only if needed**

- <One to three concise findings with file/line evidence or exact verification steps.>
```

Lead with blockers. Mention files only when they demonstrate the purpose, a blocker, or an important risk. Avoid raw command logs, large diffs, long file inventories, and unexplained implementation jargon.

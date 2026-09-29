---
name: log-test-error
description: Diagnose a newly encountered Playwright test-run error and log it to docs/troubleshooting.md with root cause and fix. Use when the user pastes a stack trace, FAILED ON STEP output, or a CI failure log and wants it documented.
---

# Log a test-run error

Use this workflow to turn a raw test-run failure into a diagnosed, greppable entry in
`docs/troubleshooting.md`, the running log of known failures for this Playwright suite.

## Inputs

Accept a raw error: a stack trace, a `FAILED ON STEP` block, a CI log excerpt, or similar,
possibly with no further explanation from the developer. The job is to produce a diagnosed
entry, not to transcribe the error as-is.

## Investigation

1. **Check for a duplicate first.** Search `docs/troubleshooting.md` for an existing entry
   covering the same failure (same error class, same file/line, same root cause) even if the
   exact message text differs slightly (different user key, different path, different
   environment). If found, update that entry instead of creating a new one — add any new
   trigger or fix detail found.
2. **Root-cause it before writing anything.** Do not paste the error under a placeholder cause —
   investigate:
   - Trace the error back to the code that throws it (search for the message fragment, or for
     the API/library call that produces that error shape).
   - Read the surrounding code to understand what conditions lead there.
   - If the cause depends on runtime/environment state that cannot be inspected directly (a CI
     secret, a remote service), state that limitation explicitly in the entry rather than
     guessing.

## Entry format

Write the entry in the same style as the existing ones in `docs/troubleshooting.md`:

```markdown
## <short, greppable title — usually the distinctive part of the error message>

**Error:**

\`\`\`
<verbatim error text, trimmed of run-specific noise like timestamps if they add nothing>
\`\`\`

**Cause:**

<what in the code/config produces this, with relative markdown links to the relevant files,
e.g. [file.ts](../path/to/file.ts)>

**Fix:**

<concrete, actionable steps — not "investigate further">
```

Append the entry to the end of `docs/troubleshooting.md`, separated by a `---` from the previous
entry. If the file does not exist yet, create it matching this repository's existing doc
conventions (check a sibling doc for header/intro style before inventing a new one).

Keep entries specific enough to be greppable (exact error text) but general enough to match
future occurrences — parameterize things like usernames, environment names, and paths with
`<placeholders>` the way existing entries do.

## Scope

This workflow only documents the error — it does not fix the underlying bug. If the root cause
looks like an actual defect (not just a usage/config pitfall), say so and ask whether the
developer also wants it fixed.

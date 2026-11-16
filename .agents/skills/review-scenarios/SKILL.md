---
name: review-scenarios
description: Review test-plan documents (docs/test-plans/*.md) before implementation, checking test completeness, automation feasibility, merge correctness, missing test data, and open-point coverage. Use when the user asks to review, check, or validate a test plan or list of scenarios before automating them.
---

# Review test-plan scenarios

Use this workflow to review test-plan documents before their tests are implemented.

## Scope

Review the plan file(s) the user names. If none is named, review every file matching
`docs/test-plans/*.md`; if that folder doesn't exist, ask the user where the plans live. Read each
plan fully before reporting — do not summarize from memory. For each plan, analyze every test
listed.

## What to check per test

1. **Completeness** — Does the test have a clear precondition, action, and assertion? Flag any test
   where the expected result is vague (e.g., "N results", "correct record") without a concrete
   assertion strategy.
2. **Automation feasibility** — Flag tests that are hard to automate reliably:
   - Depend on external state that cannot be controlled (e.g., "the last 5 recently viewed items",
     "a delay of N seconds still to be defined").
   - Require a one-time user state (e.g., a user that has never logged in).
   - Depend on pages, URLs or features marked as not yet available.
   - Require third-party systems (email, SMS, payment) with no test double or sandbox.
3. **Merge correctness** — For merged tests (shown as "TC3 + TC11" or similar), verify the merge is
   coherent: the combined steps don't create ambiguous test scope or conflate independent
   assertions.
4. **Missing test data** — Identify any test that needs data or users not listed in the plan's test
   data section, or not available through the configuration in `src/config/`.
5. **Open points coverage** — For each open point listed in the plan, identify which tests are
   blocked by it and confirm those tests are either deferred or have a workaround noted.
6. **Naming consistency** — Check that test IDs follow the plan's own naming convention and that
   test names describe the scenario clearly.
7. **Accessibility states** — Note the UI states each test reaches that should get an accessibility
   scan (`scanAxe`), so they aren't forgotten during implementation.

## Output format

For each plan file, produce a structured report:

```markdown
## Review: <filename>

### Summary

- Total manual test cases: X
- Total automated tests: Y
- Tests ready to implement: Z
- Tests blocked / deferred: W

### Issues found

| Test ID | Issue type | Description | Suggestion |
| ------- | ---------- | ----------- | ---------- |

### Open points still unresolved

List any open point from the plan that has no workaround and blocks one or more tests.

### Verdict

READY / NEEDS ATTENTION / BLOCKED
```

If no issues are found for a plan, state "No issues found — plan is ready for implementation."

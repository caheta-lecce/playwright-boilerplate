---
name: safe-rename
description: Safely change a shared value — a constant or enum member, its key, a configuration field, a UI message used in assertions, an endpoint path, or shared test data — with impact analysis first (search both the symbol and the raw value), atomic updates of every consumer, no loosening of schemas, and full verification. Use before renaming or changing the value of anything imported by more than one file, or when a test fails because a shared value drifted.
---

# Safely rename or change a shared value

Shared values feed page objects, specs, schemas and assertions. Changing one without finding every
consumer produces silent failures: assertions that still pass against the wrong text, or code that
bypassed the constant and never gets updated.

## Rules

- **Find every consumer before editing anything.**
- **Search for both the symbol and the raw value.** Search `HTTP_STATUS.NOT_FOUND` _and_ `404`,
  `Messages.REQUIRED` _and_ `'This field is required'`. Consumers that hardcoded the value won't
  follow the constant.
- **Update every consumer in the same change.** No intermediate broken state.
- **Never loosen a schema to make the new value pass.** Update `z.literal`, `z.enum` or the field
  type to the new value; the schema is the contract.
- **No blind global find-and-replace.** It hits unrelated matches and misses case variants.
  Inspect each match.

## Process

### 1. Find all consumers

```bash
# the symbol
git grep -n "<Symbol.KEY>"
# the raw value, exact and case-insensitive
git grep -n "<raw value>"
git grep -ni "<raw value>"
```

Include documentation (`*.md`, including `docs/ai/` and `.agents/skills/`), since guidelines and
skills may cite the old name. Ignore generated output (`playwright-report/`, `test-results/`).

### 2. Classify the impact

| Consumer                                                   | Effect of the change             | Action                                                 |
| ---------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| Code using the symbol                                      | Follows a value change           | None for a value change; rename for a key rename       |
| Code with the raw value hardcoded                          | Silently keeps the old value     | Replace with the symbol, or update                     |
| Assertions (`toHaveText`, `toContainText`) on the old text | Fail, or pass against wrong text | Update, preferably through the symbol                  |
| Zod schemas (`z.literal`, `z.enum`, `.default(...)`)       | Reject the new value             | Update the schema                                      |
| `.env.example`, CI workflow variables                      | Out of date for new users        | Update                                                 |
| Barrel files (`index.ts`) and path aliases                 | May hide stale re-exports        | Check                                                  |
| Docs, guidelines and skills                                | Mislead readers and assistants   | Update; run `npm run ai:skills:sync` if skills changed |

Share the list of affected files with the user before editing when it's large or touches public
configuration.

### 3. Apply the change

Edit the definition and every consumer in one change. Prefer replacing hardcoded copies with the
symbol so the next change is a one-line edit.

### 4. Verify

```bash
npm run type:check      # catches renamed keys and stale imports
npm run lint
npm test                # catches assertion drift
git grep -n "<old symbol>"; git grep -n "<old raw value>"   # should return nothing unexpected
```

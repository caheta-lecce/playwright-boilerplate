// Shared rule table for mechanically-detectable violations of
// docs/ai/repository-guidelines.md (its Constitution section lists which
// rule id backs each entry) and .agents/skills/pom-reviewer/SKILL.md.
//
// Tool-neutral enforcement shared by every contributor. Consumers:
//   - scripts/check-guidelines.mjs (staged files in pre-commit, all tracked files in CI)
//   - .claude/scripts/enforce-guidelines.mjs (PreToolUse hook: checks content
//     about to be written)
//   - .agents/skills/review-branch/SKILL.md (scan mode: checks a whole changed
//     file's existing content during a branch review)
//
// Every rule here is scoped to a small, well-grounded case with near-zero
// false-positive risk. Rules with meaningfully higher false-positive risk
// (e.g. detecting endpoint constants missing the shared BASE prefix) are
// intentionally left out until validated against real files.

function schemaMissingJsdoc(content) {
  const lines = content.split('\n');
  const schemaExportRe = /export\s+const\s+\w+\s*=\s*z\.(strictObject|object)\(/;

  for (let i = 0; i < lines.length; i++) {
    if (!schemaExportRe.test(lines[i])) continue;

    let hasJsdoc = false;
    for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
      const line = lines[j].trim();
      if (line === '') continue;
      if (line.endsWith('*/')) {
        hasJsdoc = true;
        break;
      }
      if (!line.startsWith('*') && !line.startsWith('/**') && !line.startsWith('//')) break;
    }

    if (!hasJsdoc) return true;
  }

  return false;
}

// True for lines that are only comment text (JSDoc body, // or /* lines), so
// rules matching documentation-friendly strings (e.g. "Base path: /api/v1/...")
// don't flag schema JSDoc.
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*');
}

function codeLines(content) {
  return content.split('\n').filter((line) => !isCommentLine(line));
}

// Check each import separately to avoid backtracking across unrelated statements.
function importsPlaywrightTest(content) {
  return codeLines(content)
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .some(
      (statement) =>
        /^import\s+(?!type\b)/.test(statement) &&
        /\bfrom\s+['"]@playwright\/test['"]/.test(statement)
    );
}

function hardcodedApiPath(content) {
  return codeLines(content).some((line) => /['"`]\/api\/v\d+\//.test(line));
}

const TEST_FILE = /(^|\/)src\/tests\/.+\.(spec|setup)\.ts$/;
const SPEC_FILE = /(^|\/)src\/tests\/.+\.spec\.ts$/;
const SRC_OR_LIB_TS = /(^|\/)(src|lib)\/.+\.ts$/;

// Specs that already broke a rule when it was introduced. They are skipped so CI
// stays green on main, while every other spec is held to the rule from day one.
// This is debt to pay off, not an allowlist to grow: when one of these files is
// fixed, remove it from its list. Never add a new entry. When adopting a new rule
// in a project with existing specs, list the current offenders here (repo-relative
// paths) instead of disabling the rule.
const KNOWN_VIOLATIONS = {
  'no-inline-locator-in-spec': new Set([]),
  'no-email-literal-in-spec': new Set([]),
  'no-string-constant-in-spec': new Set([]),
};

function isKnownViolation(ruleId, relPath) {
  const normalized = relPath.replaceAll('\\', '/');
  return [...KNOWN_VIOLATIONS[ruleId]].some((known) => normalized.endsWith(known));
}

// Building a locator in a spec, including one chained off a page object locator
// (`examplePage.on.table.getByText(...)`, `examplePage.on.table.locator('tbody tr')`).
// A line that starts with `.getByText(` (chain split by Prettier) is caught too.
const INLINE_LOCATOR =
  /\.(getBy(Role|Text|Label|Placeholder|TestId|AltText|Title)|locator|frameLocator)\(/;

// A quoted string with something before an `@`: an email-like literal, valid
// or not (`'user@@example'`). Tags (`'@smoke'`) and import aliases
// (`'@fixtures/…'`) start with `@`, so they don't match.
const EMAIL_LITERAL = /['"`][^'"`\s@]+@/;

// A module-level `const NAME = 'literal'` in a spec: test data declared in the spec instead of a
// `src/data/<domain>.data.ts` file. Only top-level (column 0) declarations of a plain string
// literal, or a template literal without `${}` interpolation, are matched; locals derived inside a
// test body are left to review.
const MODULE_STRING_CONSTANT = /^(export\s+)?const\s+\w+\s*(:\s*string\s*)?=\s*(['"]|`[^`$]*`)/;

// A soft assertion with no reason given: every `.soft(` call needs a comment mentioning "soft" on
// its line or in the 8 lines above (the `// Soft: <reason>` convention; the reason can sit above
// the setup lines that compute the asserted value).
function unexplainedSoftAssertion(content) {
  const lines = content.split('\n');
  return lines.some((line, i) => {
    if (!line.includes('.soft(') || isCommentLine(line)) return false;
    const trailingComment = line.indexOf('//');
    if (trailingComment >= 0 && /\bsoft\b/i.test(line.slice(trailingComment))) return false;
    for (let j = i - 1; j >= 0 && j >= i - 8; j--) {
      if (isCommentLine(lines[j]) && /\bsoft\b/i.test(lines[j])) return false;
    }
    return true;
  });
}

export const RULES = [
  {
    id: 'no-hardcoded-api-path',
    pathTest: (relPath) =>
      SRC_OR_LIB_TS.test(relPath) && !/(^|\/)lib\/api\/endpoints\//.test(relPath),
    contentTest: hardcodedApiPath,
    message:
      'API paths belong in lib/api/endpoints/<domain>.ts (shared BASE + named route), never as ' +
      'string literals elsewhere (see docs/ai/repository-guidelines.md, Constitution / API coverage).',
  },
  {
    id: 'no-hard-wait',
    pathTest: (relPath) => SRC_OR_LIB_TS.test(relPath),
    contentTest: (content) => codeLines(content).some((line) => line.includes('waitForTimeout(')),
    message:
      '`waitForTimeout()` is forbidden. Wait on a condition instead: a web-first assertion ' +
      '(`expect(locator).toBeVisible()`), `waitForResponse`, or `expect(...).toPass()` ' +
      '(see docs/ai/repository-guidelines.md, Constitution).',
  },
  {
    id: 'no-focused-test',
    pathTest: (relPath) => TEST_FILE.test(relPath),
    contentTest: (content) =>
      codeLines(content).some((line) => /\b(test|describe|setup)(\.describe)?\.only\(/.test(line)),
    message:
      '`.only` must never be written into a test file; it silently skips the rest of the suite.',
  },
  {
    id: 'no-playwright-test-in-spec',
    pathTest: (relPath) => TEST_FILE.test(relPath),
    // Joined so multi-line `import {\n  test,\n} from ...` is still caught.
    contentTest: importsPlaywrightTest,
    message:
      'Specs and setup files import `test`/`expect` from @fixtures/base, never from ' +
      '@playwright/test. Type-only imports (`import type { Page }`) are fine ' +
      '(see docs/ai/repository-guidelines.md, Page objects and fixtures).',
  },
  {
    id: 'no-fixture-in-spec',
    pathTest: (relPath) => TEST_FILE.test(relPath),
    contentTest: (content) => codeLines(content).some((line) => /\.extend\s*[<(]/.test(line)),
    message:
      'Specs never declare their own `test.extend` fixture — fixtures live in lib/fixtures/ and ' +
      'are imported (see docs/ai/repository-guidelines.md, Page objects and fixtures).',
  },
  {
    id: 'no-inline-locator-in-spec',
    pathTest: (relPath) =>
      SPEC_FILE.test(relPath) && !isKnownViolation('no-inline-locator-in-spec', relPath),
    contentTest: (content) => codeLines(content).some((line) => INLINE_LOCATOR.test(line)),
    message:
      'Specs never build locators, not even chained off a page object locator ' +
      '(`examplePage.on.table.getByText(...)`). Add a named locator to `<Name>Locators.ts` and ' +
      'use it only inside `expect(...)` or pass it to an action (see ' +
      'docs/ai/repository-guidelines.md, Constitution / Page objects).',
  },
  {
    id: 'no-email-literal-in-spec',
    pathTest: (relPath) =>
      SPEC_FILE.test(relPath) && !isKnownViolation('no-email-literal-in-spec', relPath),
    contentTest: (content) => codeLines(content).some((line) => EMAIL_LITERAL.test(line)),
    message:
      'Test data (here an email address, valid or not) never lives in a spec. Put it in ' +
      'src/data/<domain>.data.ts and import it through `@data/*` (see ' +
      'docs/ai/repository-guidelines.md, Constitution / Test data).',
  },
  {
    id: 'no-string-constant-in-spec',
    pathTest: (relPath) =>
      SPEC_FILE.test(relPath) && !isKnownViolation('no-string-constant-in-spec', relPath),
    contentTest: (content) => content.split('\n').some((line) => MODULE_STRING_CONSTANT.test(line)),
    message:
      'A spec never declares test data as a module-level string constant. Put the value in ' +
      'src/data/<domain>.data.ts (reuse an existing key first) and import it through `@data/*` ' +
      '(see docs/ai/repository-guidelines.md, Constitution / Test data).',
  },
  {
    id: 'no-unexplained-soft-assertion',
    pathTest: (relPath) => SPEC_FILE.test(relPath),
    contentTest: unexplainedSoftAssertion,
    message:
      '`expect.soft` needs its reason in a comment right above ' +
      '(`// Soft: <why the test must go on if this fails>`). Otherwise use a hard `expect` (see ' +
      'docs/ai/repository-guidelines.md, Constitution).',
  },
  {
    id: 'no-xpath',
    pathTest: (relPath) => /(^|\/)(src\/pages|src\/components|src\/tests)\//.test(relPath),
    contentTest: (content) => /xpath=|locator\(\s*[`'"]\/\//.test(content),
    message:
      'XPath selectors are discouraged here. Prefer getByRole > getByLabel > getByPlaceholder > ' +
      'getByText > getByTestId (see .agents/skills/pom-reviewer/SKILL.md, locator strategy).',
  },
  {
    id: 'schema-missing-jsdoc',
    pathTest: (relPath) =>
      /(^|\/)src\/models\/.+\.ts$/.test(relPath) && !relPath.endsWith('/index.ts'),
    contentTest: schemaMissingJsdoc,
    message:
      'Zod schema exports need a JSDoc block documenting purpose, endpoint mapping, and an ' +
      '@example (see docs/ai/repository-guidelines.md, API coverage).',
  },
];

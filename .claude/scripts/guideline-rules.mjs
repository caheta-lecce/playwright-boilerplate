// Shared rule table for mechanically-detectable violations of
// docs/ai/repository-guidelines.md (its Constitution section lists which
// rule id backs each entry) and .agents/skills/pom-reviewer/SKILL.md.
//
// Used by two consumers:
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

function hardcodedApiPath(content) {
  return codeLines(content).some((line) => /['"`]\/api\/v\d+\//.test(line));
}

const TEST_FILE = /(^|\/)src\/tests\/.+\.(spec|setup)\.ts$/;
const SRC_OR_LIB_TS = /(^|\/)(src|lib)\/.+\.ts$/;

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
    contentTest: (content) =>
      /(^|\n)\s*import\s+(?!type\b)[^;]*?from\s+['"]@playwright\/test['"]/.test(
        codeLines(content).join('\n')
      ),
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

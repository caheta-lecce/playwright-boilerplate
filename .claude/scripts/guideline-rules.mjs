// Shared rule table for mechanically-detectable violations of
// docs/ai/repository-guidelines.md and .agents/skills/pom-reviewer/SKILL.md.
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

export const RULES = [
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

#!/usr/bin/env node
// Checks files against the mechanically-enforceable rules in
// scripts/guideline-rules.mjs (the hook ids in the Constitution section of
// docs/ai/repository-guidelines.md). Tool-neutral: it runs the same for anyone,
// whether the code was written by hand, Claude, Codex, or Copilot.
//
//   node scripts/check-guidelines.mjs            every tracked file (CI)
//   node scripts/check-guidelines.mjs --staged   staged files, as committed (pre-commit)
//
// Exits 1 and lists every violation when any rule fails.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { RULES } from './guideline-rules.mjs';

const staged = process.argv.includes('--staged');

function gitLines(command) {
  return execSync(command, { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// In --staged mode read the index, not the working tree, so a partially staged
// file is checked as it will actually be committed.
function readContent(relPath) {
  if (!staged) return fs.readFileSync(relPath, 'utf8');
  return execSync(`git show ":${relPath}"`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

const files = staged
  ? gitLines('git diff --cached --name-only --diff-filter=ACMR')
  : gitLines('git ls-files');

const violations = [];
for (const relPath of files) {
  const applicable = RULES.filter((rule) => rule.pathTest(relPath));
  if (applicable.length === 0) continue;

  const content = readContent(relPath);
  for (const rule of applicable) {
    if (rule.contentTest(content)) violations.push({ relPath, rule });
  }
}

if (violations.length > 0) {
  console.log(`❌ ${violations.length} guideline violation(s):`);
  for (const { relPath, rule } of violations) {
    console.log(`  - ${relPath} [${rule.id}] ${rule.message}`);
  }
  process.exit(1);
}

console.log(`✔ Guideline rules passed (${files.length} file(s) checked).`);

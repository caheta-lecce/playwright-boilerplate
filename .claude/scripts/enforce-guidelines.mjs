#!/usr/bin/env node
// PreToolUse hook: deterministic enforcement of docs/ai/repository-guidelines.md.
//
// Blocks Write / Edit / MultiEdit calls that would introduce content forbidden
// by our own documented conventions. The agent-facing guidance stays in
// docs/ai/repository-guidelines.md and the reviewer agents; this hook is the
// hard backstop for the handful of rules checkable mechanically with (near)
// zero false-positive risk.
//
// Contract (Claude Code hooks):
//   stdin  -- JSON payload: {"tool_name": ..., "tool_input": {...}}
//   exit 0 -- allow the tool call
//   exit 2 -- block the tool call; stderr is fed back to the agent

import fs from 'node:fs';
import path from 'node:path';
import { RULES } from './guideline-rules.mjs';

// Applies one old_string -> new_string replacement the way Edit/MultiEdit would.
function applyReplacement(content, oldString, newString, replaceAll) {
  if (!oldString) return content;
  if (replaceAll) return content.split(oldString).join(newString);
  const index = content.indexOf(oldString);
  if (index === -1) return content;
  return content.slice(0, index) + newString + content.slice(index + oldString.length);
}

// Reconstructs the file content the tool call would produce, not just the
// snippet it passes. Rules like schema-missing-jsdoc need to see a JSDoc
// block that sits outside the edited fragment (e.g. adding a field to an
// already-documented schema) — checking new_string alone flags that as a
// false positive even though the resulting file is correctly documented.
function resultingContent(toolName, toolInput, filePath) {
  if (toolName === 'Write') return toolInput.content ?? '';

  let current;
  try {
    current = fs.readFileSync(filePath, 'utf8');
  } catch {
    // File unreadable (e.g. race, permissions): fall back to the raw
    // fragment rather than skip the check entirely.
    return (
      toolInput.new_string ?? (toolInput.edits ?? []).map((e) => e.new_string ?? '').join('\n')
    );
  }

  if (toolName === 'Edit') {
    return applyReplacement(
      current,
      toolInput.old_string ?? '',
      toolInput.new_string ?? '',
      toolInput.replace_all
    );
  }

  if (toolName === 'MultiEdit') {
    return (toolInput.edits ?? []).reduce(
      (acc, edit) =>
        applyReplacement(acc, edit.old_string ?? '', edit.new_string ?? '', edit.replace_all),
      current
    );
  }

  return '';
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    return 0; // malformed payload: never block on hook infrastructure errors
  }

  const toolName = payload.tool_name ?? '';
  const toolInput = payload.tool_input ?? {};
  const filePath = toolInput.file_path ?? '';
  if (!filePath || !['Write', 'Edit', 'MultiEdit'].includes(toolName)) return 0;

  const relPath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
  const content = resultingContent(toolName, toolInput, filePath);

  const violations = RULES.filter((rule) => rule.pathTest(relPath) && rule.contentTest(content));

  if (violations.length > 0) {
    process.stderr.write(
      `BLOCKED by guideline enforcement hook (${relPath}):\n` +
        violations.map((v) => `  - [${v.id}] ${v.message}`).join('\n') +
        '\n'
    );
    return 2;
  }

  return 0;
}

main().then((code) => process.exit(code));

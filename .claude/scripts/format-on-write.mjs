#!/usr/bin/env node
// PostToolUse hook: best-effort lint --fix + format for .ts files just written/edited.
//
// Node instead of a POSIX shell pipeline (jq | case) so it works the same way
// on Windows, macOS and Linux.
//
// Contract (Claude Code hooks):
//   stdin  -- JSON payload: {"tool_name": ..., "tool_input": {...}}
//   exit 0 -- always; formatting is best-effort and never blocks the tool call

import { execFileSync } from 'node:child_process';

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
    return 0; // malformed payload: never fail the hook on infrastructure errors
  }

  const filePath = payload.tool_input?.file_path ?? '';
  if (!filePath.endsWith('.ts')) return 0;

  const isWindows = process.platform === 'win32';
  for (const args of [
    ['eslint', '--fix', filePath],
    ['prettier', '--write', filePath],
  ]) {
    try {
      execFileSync('npx', args, { stdio: 'ignore', shell: isWindows });
    } catch {
      // best-effort: a fix/format failure must not block the edit that triggered it
    }
  }

  return 0;
}

main().then((code) => process.exit(code));

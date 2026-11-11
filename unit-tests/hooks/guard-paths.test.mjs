import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGuardPath,
  toRepoRelative,
  guardBlockMessage,
} from '../../.claude/scripts/guard-paths.mjs';

const WIN_ROOT = 'C:\\work\\repo';
const POSIX_ROOT = '/home/dev/repo';

describe('isGuardPath', () => {
  it('blocks the guard files by relative path', () => {
    for (const file of [
      '.claude/scripts/enforce-guidelines.mjs',
      '.claude/settings.json',
      'scripts/guideline-rules.mjs',
      'scripts/check-guidelines.mjs',
      '.husky/pre-commit',
    ]) {
      assert.ok(isGuardPath(file, POSIX_ROOT), file);
    }
  });

  it('handles Windows separators and absolute paths', () => {
    assert.ok(isGuardPath('C:\\work\\repo\\.claude\\scripts\\guard-paths.mjs', WIN_ROOT));
    assert.ok(isGuardPath('c:/work/repo/.husky/pre-commit', WIN_ROOT));
    assert.ok(isGuardPath('.husky\\pre-commit', WIN_ROOT));
    assert.ok(isGuardPath('C:\\WORK\\Repo\\Scripts\\guideline-rules.mjs', WIN_ROOT));
  });

  it('handles POSIX absolute paths and dot segments', () => {
    assert.ok(isGuardPath('/home/dev/repo/scripts/check-guidelines.mjs', POSIX_ROOT));
    assert.ok(isGuardPath('./scripts/../.claude/settings.json', POSIX_ROOT));
  });

  it('allows ordinary files, look-alikes and paths outside the repo', () => {
    assert.ok(!isGuardPath('src/tests/ui/example/example.spec.ts', POSIX_ROOT));
    assert.ok(!isGuardPath('scripts/demo-server.mjs', POSIX_ROOT));
    assert.ok(!isGuardPath('.claude/settings.local.json', POSIX_ROOT));
    assert.ok(!isGuardPath('docs/scripts/guideline-rules.mjs', POSIX_ROOT));
    assert.ok(!isGuardPath('/elsewhere/.husky/pre-commit', POSIX_ROOT));
    assert.ok(!isGuardPath('C:\\other\\.husky\\pre-commit', WIN_ROOT));
  });
});

describe('toRepoRelative', () => {
  it('returns null outside the repository', () => {
    assert.equal(toRepoRelative('/tmp/x', POSIX_ROOT), null);
  });
});

describe('guardBlockMessage', () => {
  it('tells the agent a human must edit or ALLOW_GUARD_EDITS=1 must be set', () => {
    const message = guardBlockMessage('.husky/pre-commit');
    assert.match(message, /^BLOCKED/);
    assert.match(message, /human/);
    assert.match(message, /ALLOW_GUARD_EDITS=1/);
  });
});

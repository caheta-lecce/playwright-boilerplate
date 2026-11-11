// Pure helpers for the "agents never edit their own guards" check in enforce-guidelines.mjs.
// Kept apart from the hook (which runs main() on import) so unit-tests/hooks/ can cover them.

// Files that enforce the rules. An agent that may rewrite them could switch its own checks off.
const GUARD_PATTERNS = [
  /^\.claude\/scripts\//,
  /^\.claude\/settings\.json$/,
  /^scripts\/guideline-rules\.mjs$/,
  /^scripts\/check-guidelines\.mjs$/,
  /^\.husky\//,
];

const normalize = (value) => value.replaceAll('\\', '/').replace(/\/+/g, '/');
const isAbsolutePath = (value) => value.startsWith('/') || /^[a-z]:\//i.test(value);

// Repo-relative POSIX path of `filePath` (absolute or relative, `\` or `/` separators), or null
// when it points outside `cwd`. Lower-cased because Windows file systems ignore case.
export function toRepoRelative(filePath, cwd) {
  const file = normalize(filePath);
  const root = normalize(cwd).replace(/\/$/, '');
  let relative = file;
  if (isAbsolutePath(file)) {
    if (!file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return null;
    relative = file.slice(root.length + 1);
  }
  const collapsed = relative
    .split('/')
    .reduce((parts, part) => {
      if (part === '..') parts.pop();
      else if (part !== '.' && part !== '') parts.push(part);
      return parts;
    }, [])
    .join('/');
  return collapsed.toLowerCase();
}

export function isGuardPath(filePath, cwd) {
  const relative = toRepoRelative(filePath, cwd);
  return relative !== null && GUARD_PATTERNS.some((pattern) => pattern.test(relative));
}

export function guardBlockMessage(filePath) {
  return (
    `BLOCKED: ${filePath} is one of the repository's own guards (.claude/scripts/**, ` +
    '.claude/settings.json, scripts/guideline-rules.mjs, scripts/check-guidelines.mjs, ' +
    '.husky/**). A human must make this change, or relaunch the agent with ALLOW_GUARD_EDITS=1 ' +
    'set in the environment outside the agent. Report the change you need instead of working ' +
    'around this block.\n'
  );
}

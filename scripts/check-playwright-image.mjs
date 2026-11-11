// Fails when the Playwright container image tag in .github/workflows/ci.yml does not match the
// exact @playwright/test version pinned in package.json and resolved in package-lock.json.
// Plain Node, no dependencies. Run with `npm run playwright:image:check`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const IMAGE_RE = /image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)(?:-[\w.-]+)?/;
const EXACT_RE = /^\d+\.\d+\.\d+$/;

/**
 * Compares the CI image tag with the pinned and locked @playwright/test versions.
 * @param {{ imageTag: string | null, pinned: string | null, locked: string | null }} versions
 * @returns {string[]} one message per problem; empty when everything matches
 */
export function checkPlaywrightImage({ imageTag, pinned, locked }) {
  const problems = [];
  if (!imageTag) {
    problems.push(
      'No Playwright image tag found in .github/workflows/ci.yml. Expected ' +
        '`image: mcr.microsoft.com/playwright:v<version>-<distro>` in the test job.'
    );
  }
  if (!pinned || !EXACT_RE.test(pinned)) {
    problems.push(
      `package.json must pin @playwright/test to an exact version (found "${pinned ?? 'none'}"). ` +
        'Run `npm i -D -E @playwright/test@<version>`; ranges such as ^ or ~ are not allowed.'
    );
  }
  if (!locked) {
    problems.push('@playwright/test was not found in package-lock.json. Run `npm install`.');
  }
  if (problems.length > 0) return problems;
  if (pinned !== locked) {
    problems.push(
      `package.json pins @playwright/test ${pinned} but package-lock.json resolves ${locked}. ` +
        'Run `npm install` to sync them.'
    );
  }
  if (imageTag !== locked) {
    problems.push(
      `The CI image tag is v${imageTag} but @playwright/test is ${locked}. Edit the \`image:\` ` +
        `line in .github/workflows/ci.yml to mcr.microsoft.com/playwright:v${locked}-noble ` +
        '(or bump package.json and the lockfile if the image is the version you tested).'
    );
  }
  return problems;
}

export function extractImageTag(workflowText) {
  return IMAGE_RE.exec(workflowText)?.[1] ?? null;
}

function main() {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const problems = checkPlaywrightImage({
    imageTag: extractImageTag(read('.github/workflows/ci.yml')),
    pinned:
      pkg.devDependencies?.['@playwright/test'] ?? pkg.dependencies?.['@playwright/test'] ?? null,
    locked: lock.packages?.['node_modules/@playwright/test']?.version ?? null,
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(`playwright:image:check: ${problem}`);
    process.exit(1);
  }
  console.log('playwright:image:check: CI image tag, package.json and lockfile agree.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

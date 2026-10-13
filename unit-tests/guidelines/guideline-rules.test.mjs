import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../../scripts/guideline-rules.mjs';

const SPEC = 'src/tests/ui/example/example.spec.ts';

function violates(ruleId, relPath, content) {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  assert.ok(rule, `unknown rule ${ruleId}`);
  return rule.pathTest(relPath) && rule.contentTest(content);
}

describe('no-inline-locator-in-spec', () => {
  it('flags a locator chained off a page object locator', () => {
    assert.ok(
      violates('no-inline-locator-in-spec', SPEC, 'await expect(page.on.table.getByText("x"));')
    );
  });

  it('flags a chain split onto its own line by Prettier', () => {
    assert.ok(violates('no-inline-locator-in-spec', SPEC, '  .locator("tbody tr")'));
  });

  it('allows a named page object locator', () => {
    assert.ok(
      !violates(
        'no-inline-locator-in-spec',
        SPEC,
        'await expect(examplePage.on.error).toBeVisible();'
      )
    );
  });

  it('does not apply to page objects', () => {
    assert.ok(
      !violates(
        'no-inline-locator-in-spec',
        'src/pages/example/ExampleLocators.ts',
        "this.error = page.getByRole('alert');"
      )
    );
  });
});

describe('no-email-literal-in-spec', () => {
  it('flags an email address, valid or not', () => {
    assert.ok(violates('no-email-literal-in-spec', SPEC, "await fill('user@example.com');"));
    assert.ok(violates('no-email-literal-in-spec', SPEC, "await fill('user@@example');"));
  });

  it('allows tags and import aliases', () => {
    assert.ok(!violates('no-email-literal-in-spec', SPEC, "test('x', { tag: '@smoke' }, fn);"));
    assert.ok(
      !violates('no-email-literal-in-spec', SPEC, "import { test } from '@fixtures/base';")
    );
  });
});

describe('no-string-constant-in-spec', () => {
  it('flags a module-level string constant', () => {
    assert.ok(violates('no-string-constant-in-spec', SPEC, "const NAME = 'Mario';"));
    assert.ok(violates('no-string-constant-in-spec', SPEC, 'const NAME: string = `Mario`;'));
  });

  it('allows indented locals and interpolated templates', () => {
    assert.ok(!violates('no-string-constant-in-spec', SPEC, "  const name = 'Mario';"));
    assert.ok(!violates('no-string-constant-in-spec', SPEC, 'const label = `Hi ${user}`;'));
  });
});

describe('no-unexplained-soft-assertion', () => {
  it('flags a soft assertion without a reason', () => {
    assert.ok(
      violates('no-unexplained-soft-assertion', SPEC, 'await expect.soft(a).toBeVisible();')
    );
  });

  it('allows a soft assertion with a `// Soft:` comment above', () => {
    const content = [
      '// Soft: the banner is decorative, the flow must still reach checkout.',
      'const banner = examplePage.on.banner;',
      'await expect.soft(banner).toBeVisible();',
    ].join('\n');
    assert.ok(!violates('no-unexplained-soft-assertion', SPEC, content));
  });

  it('allows a trailing soft comment on the same line', () => {
    assert.ok(
      !violates(
        'no-unexplained-soft-assertion',
        SPEC,
        'await expect.soft(a).toBeVisible(); // soft: decorative'
      )
    );
  });
});

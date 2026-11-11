import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPlaywrightImage, extractImageTag } from '../../scripts/check-playwright-image.mjs';

describe('checkPlaywrightImage', () => {
  it('passes when tag, pin and lockfile match', () => {
    assert.deepEqual(
      checkPlaywrightImage({ imageTag: '1.63.0', pinned: '1.63.0', locked: '1.63.0' }),
      []
    );
  });

  it('names both versions when the tag differs', () => {
    const [msg] = checkPlaywrightImage({ imageTag: '1.62.0', pinned: '1.63.0', locked: '1.63.0' });
    assert.match(msg, /v1\.62\.0/);
    assert.match(msg, /1\.63\.0/);
    assert.match(msg, /ci\.yml/);
  });

  it('reports a missing tag', () => {
    const [msg] = checkPlaywrightImage({ imageTag: null, pinned: '1.63.0', locked: '1.63.0' });
    assert.match(msg, /No Playwright image tag/);
  });

  it('rejects a ranged version', () => {
    const [msg] = checkPlaywrightImage({ imageTag: '1.63.0', pinned: '^1.63.0', locked: '1.63.0' });
    assert.match(msg, /exact version/);
  });
});

describe('extractImageTag', () => {
  it('reads the version from the image line', () => {
    assert.equal(
      extractImageTag('    container:\n      image: mcr.microsoft.com/playwright:v1.63.0-noble\n'),
      '1.63.0'
    );
  });

  it('returns null without a tag', () => {
    assert.equal(extractImageTag('image: node:22'), null);
  });
});

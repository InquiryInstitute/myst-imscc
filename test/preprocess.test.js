import { test } from 'node:test';
import assert from 'node:assert';
import { applyVariantBlocks } from '../src/preprocess-variant.mjs';

test('variant block includes matching key', () => {
  const src = `a
<!-- myst-imscc-variant: basic -->
ONLY_BASIC
<!-- /myst-imscc-variant -->
b`;
  assert.ok(applyVariantBlocks(src, 'basic').includes('ONLY_BASIC'));
  assert.ok(!applyVariantBlocks(src, 'codespace').includes('ONLY_BASIC'));
});

test('variant all always includes', () => {
  const src = `<!-- myst-imscc-variant: all -->
X
<!-- /myst-imscc-variant -->`;
  assert.ok(applyVariantBlocks(src, 'anything').includes('X'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCantonList } from '../../src/state/maplayer';

test('a list of canton codes separated by commas is accepted', () => {
  assert.doesNotThrow(() => assertCantonList('ZH,BE,AG'));
});

test('a space in the second or a later canton is refused, not only in the first', () => {
  assert.throws(() => assertCantonList('ZH, BE'), /splited by ","/);
  assert.throws(() => assertCantonList('ZH,BE, AG'), /splited by ","/);
});

test('a trailing space around the whole list is ignored', () => {
  assert.doesNotThrow(() => assertCantonList(' ZH,BE '));
});

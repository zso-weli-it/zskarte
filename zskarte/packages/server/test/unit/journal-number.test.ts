import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMessageNumber } from '../../src/api/journal-entry/lib/message-number';

const taken = (...numbers: number[]) => async (n: number) => numbers.includes(n);
const highest = (n: number) => async () => n;

test('a submitted number that is free is used as it is', async () => {
  const r = await chooseMessageNumber(7, taken(3), highest(10));
  assert.deepEqual(r, { conflict: false, messageNumber: 7, automatic: false });
});

test('a submitted number that is already taken is a conflict', async () => {
  const r = await chooseMessageNumber(3, taken(3), highest(10));
  assert.deepEqual(r, { conflict: true });
});

test('a negative (offline) number takes its positive twin when that is free', async () => {
  const r = await chooseMessageNumber(-4, taken(3), highest(10));
  assert.deepEqual(r, { conflict: false, messageNumber: 4, automatic: true });
});

test('a negative number whose twin is taken gets the next free number', async () => {
  const r = await chooseMessageNumber(-4, taken(4), highest(10));
  assert.deepEqual(r, { conflict: false, messageNumber: 11, automatic: true });
});

test('no number or zero gets highest + 1', async () => {
  assert.deepEqual(await chooseMessageNumber(undefined, taken(), highest(10)), {
    conflict: false,
    messageNumber: 11,
    automatic: true,
  });
  assert.deepEqual(await chooseMessageNumber(0, taken(), highest(0)), {
    conflict: false,
    messageNumber: 1,
    automatic: true,
  });
});

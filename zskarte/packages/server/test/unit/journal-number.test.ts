import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMessageNumber, isNumberTaken } from '../../src/api/journal-entry/lib/message-number';

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

test('a number used by nobody is free for an update', () => {
  assert.equal(isNumberTaken([], 'entry-1'), false);
});

test('a number used only by the entry itself is not a conflict', () => {
  assert.equal(isNumberTaken(['entry-1'], 'entry-1'), false);
});

test('a number used by another entry is a conflict', () => {
  assert.equal(isNumberTaken(['entry-2'], 'entry-1'), true);
});

test('a number used by several entries is a conflict, even when one of them is this entry', () => {
  assert.equal(isNumberTaken(['entry-1', 'entry-2'], 'entry-1'), true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { claimShortCode, createShortCode } from '../../src/api/access/lib/short-code';

// A fake table whose delete removes the row matching the where clause, like the database does.
const tableWith = (rows: { documentId: string; accessToken: string }[]) => async ({ where }) => {
  const before = rows.length;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].documentId === where.documentId && rows[i].accessToken === where.accessToken) rows.splice(i, 1);
  }
  return { count: before - rows.length };
};

test('a short code can be claimed once', async () => {
  const rows = [{ documentId: 'a1', accessToken: '123456' }];
  const deleteMany = tableWith(rows);
  assert.equal(await claimShortCode(deleteMany, 'a1', '123456'), true);
  assert.equal(await claimShortCode(deleteMany, 'a1', '123456'), false, 'second use is refused');
});

test('two requests racing for the same code: only one wins', async () => {
  const rows = [{ documentId: 'a1', accessToken: '123456' }];
  const deleteMany = tableWith(rows);
  const results = await Promise.all([
    claimShortCode(deleteMany, 'a1', '123456'),
    claimShortCode(deleteMany, 'a1', '123456'),
  ]);
  assert.deepEqual(results.sort(), [false, true]);
});

test('claiming one code does not remove another', async () => {
  const rows = [
    { documentId: 'a1', accessToken: '123456' },
    { documentId: 'a2', accessToken: '654321' },
  ];
  assert.equal(await claimShortCode(tableWith(rows), 'a1', '123456'), true);
  assert.equal(rows.length, 1);
});

test('the highest six digit code 999999 can be issued', (t) => {
  const randomInt = t.mock.method(crypto, 'randomInt', () => 999_999);
  assert.equal(createShortCode(), '999999');
  assert.equal(randomInt.mock.calls[0].arguments[0], 1_000_000, 'the range covers 0 to 999999');
});

test('short codes keep their leading zeros', (t) => {
  t.mock.method(crypto, 'randomInt', () => 42);
  assert.equal(createShortCode(), '000042');
});

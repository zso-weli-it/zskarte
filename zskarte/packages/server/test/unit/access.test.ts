import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFailedTryLimiter } from '../../src/api/access/lib/failed-try-limiter';
import { withOperationFilter } from '../../src/api/access/lib/list-filter';

test('blocks an IP after the max number of wrong codes', () => {
  const limiter = createFailedTryLimiter(3, 60_000);
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) limiter.recordFailure('1.2.3.4', t);
  assert.equal(limiter.isBlocked('1.2.3.4', t), true);
  assert.equal(limiter.isBlocked('5.6.7.8', t), false, 'other clients are not affected');
});

test('unblocks after the window has passed', () => {
  const limiter = createFailedTryLimiter(2, 60_000);
  const t = 1_000_000;
  limiter.recordFailure('1.2.3.4', t);
  limiter.recordFailure('1.2.3.4', t);
  assert.equal(limiter.isBlocked('1.2.3.4', t + 59_999), true);
  assert.equal(limiter.isBlocked('1.2.3.4', t + 60_000), false);
});

test('operation filter keeps the organisation restriction from accessControl', () => {
  const fromAccessControl = { operation: { organization: { documentId: { $eq: 'org-mine' } } } };
  const filter = withOperationFilter(fromAccessControl, 'op-other');
  // the organisation condition must still be part of the query, next to the operation condition
  assert.deepEqual(filter.$and[0], fromAccessControl);
  assert.deepEqual(filter.$and[1], { operation: { documentId: { $eq: 'op-other' } } });
});

test('operation filter works without a filter from accessControl', () => {
  assert.deepEqual(withOperationFilter(undefined, 'op-1').$and[0], {});
});

test('clients that stopped failing are forgotten when another client fails', () => {
  const limiter = createFailedTryLimiter(3, 60_000);
  const t = 1_000_000;
  limiter.recordFailure('1.2.3.4', t);
  limiter.recordFailure('5.6.7.8', t);
  assert.equal(limiter.trackedClients(), 2);
  limiter.recordFailure('9.9.9.9', t + 60_000);
  assert.equal(limiter.trackedClients(), 1, 'the two old clients are gone, only the new one is tracked');
});

test('many clients failing in one window are all counted, and expired ones are dropped at the next window', () => {
  const limiter = createFailedTryLimiter(3, 60_000);
  const t = 1_000_000;
  for (let i = 0; i < 500; i++) limiter.recordFailure(`10.0.0.${i}`, t + i);
  assert.equal(limiter.trackedClients(), 500);
  assert.equal(limiter.isBlocked('10.0.0.1', t + 600), false, 'one failure is below the limit of three');
  limiter.recordFailure('11.0.0.1', t + 60_500);
  assert.equal(limiter.trackedClients(), 1);
});

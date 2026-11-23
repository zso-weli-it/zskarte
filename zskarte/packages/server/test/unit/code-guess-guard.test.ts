import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCodeGuessGuard } from '../../src/api/access/lib/code-guess-guard';

const guard = () =>
  createCodeGuessGuard({ maxTries: 2, windowMs: 60_000 }, { maxTries: 5, windowMs: 900_000 });

test('one client is blocked after its own wrong codes', () => {
  const g = guard();
  const t = 1_000_000;
  g.recordFailure('1.1.1.1', t);
  g.recordFailure('1.1.1.1', t);
  assert.equal(g.isBlocked('1.1.1.1', t), true);
  assert.equal(g.isBlocked('2.2.2.2', t), false);
});

test('many clients together are blocked by the total limit', () => {
  const g = guard();
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) g.recordFailure(`10.0.0.${i}`, t);
  assert.equal(g.isBlocked('10.9.9.9', t), true, 'a new client is blocked too');
});

test('the total limit has its own, longer window', () => {
  const g = guard();
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) g.recordFailure(`10.0.0.${i}`, t);
  assert.equal(g.isBlocked('10.9.9.9', t + 60_000), true, 'still blocked after the per-client window');
  assert.equal(g.isBlocked('10.9.9.9', t + 900_000), false);
});

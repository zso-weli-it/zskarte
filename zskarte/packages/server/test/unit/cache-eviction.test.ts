import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVICT_AFTER_MS, isEvictable } from '../../src/state/cache-eviction';

const now = 10_000_000;
const idle = { connections: [], mapStateChanged: false, lastUsed: now - EVICT_AFTER_MS - 1 };

test('an unused cache with nothing to save is evicted', () => {
  assert.equal(isEvictable(idle, now), true);
});

test('a cache with a connected user is kept', () => {
  assert.equal(isEvictable({ ...idle, connections: [{}] }, now), false);
});

test('a cache with changes that are not saved yet is kept', () => {
  assert.equal(isEvictable({ ...idle, mapStateChanged: true }, now), false);
});

test('a recently used cache is kept', () => {
  assert.equal(isEvictable({ ...idle, lastUsed: now - 1000 }, now), false);
});

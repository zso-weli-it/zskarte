import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteOldSnapshots, SNAPSHOT_RETENTION_MS } from '../../src/state/operation';

const silentLog = { info() {}, error() {}, warn() {}, debug() {} };

test('snapshots older than the retention period are deleted and newer ones are kept', async () => {
  const now = Date.parse('2026-11-27T10:00:00Z');
  const deleteCalls: any[] = [];
  const strapi: any = {
    log: silentLog,
    db: { query: () => ({ deleteMany: async (params: unknown) => void deleteCalls.push(params) }) },
  };

  await deleteOldSnapshots(strapi, now);

  assert.equal(deleteCalls.length, 1);
  const cutoff: Date = deleteCalls[0].where.createdAt.$lt;
  assert.equal(cutoff.getTime(), now - SNAPSHOT_RETENTION_MS);
  assert.equal(SNAPSHOT_RETENTION_MS, 30 * 24 * 60 * 60 * 1000);
});

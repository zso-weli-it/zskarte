import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleOperation, operationCaches } from '../../src/state/operation';
import { OperationPhases, StrapiLifecycleHooks } from '../../src/definitions';

const silentLog = { info() {}, error() {}, warn() {}, debug() {} };

/** Installs a fake strapi whose update() records the map state it saves and can be made to fail. */
const useFakeStrapi = (failUpdate: boolean) => {
  const saved: unknown[] = [];
  (globalThis as any).strapi = {
    log: silentLog,
    documents: () => ({
      findOne: async () => ({ documentId: 'op-arch', phase: OperationPhases.ARCHIVED, organization: {} }),
      update: async ({ data }: { data: { mapState?: unknown } }) => {
        if (failUpdate) throw new Error('database unavailable');
        saved.push(data.mapState);
      },
    }),
  };
  return saved;
};

test('archiving an operation saves its unsaved map changes before the cache is dropped', async () => {
  const pending = { symbol: 'unsaved' };
  operationCaches['op-arch'] = { operation: {} as any, connections: [], mapState: pending, mapStateChanged: true } as any;
  const saved = useFakeStrapi(false);
  await lifecycleOperation(StrapiLifecycleHooks.AFTER_UPDATE, { documentId: 'op-arch' } as any);
  assert.deepEqual(saved, [pending]);
  assert.equal(operationCaches['op-arch'], undefined);
});

test('archiving keeps the cache when the final save fails, so the changes are retried', async () => {
  operationCaches['op-arch'] = { operation: {} as any, connections: [], mapState: { a: 1 }, mapStateChanged: true } as any;
  useFakeStrapi(true);
  await lifecycleOperation(StrapiLifecycleHooks.AFTER_UPDATE, { documentId: 'op-arch' } as any);
  assert.equal(operationCaches['op-arch'].mapStateChanged, true);
  delete operationCaches['op-arch'];
});

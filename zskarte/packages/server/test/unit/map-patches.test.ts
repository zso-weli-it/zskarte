import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operationCaches, updateMapState } from '../../src/state/operation';

const silentLog = { info() {}, error() {}, warn() {}, debug() {} };

test('only the patches that changed the map are sent to the other users', async () => {
  (globalThis as any).strapi = { log: silentLog };
  const sentToOther: unknown[] = [];
  operationCaches['op-patches'] = {
    operation: {} as any,
    connections: [{ identifier: 'other', socket: { emit: (_event: string, patches: unknown) => sentToOther.push(patches) } }],
    mapState: { a: 1 },
    mapStateChanged: false,
  } as any;
  const valid = { op: 'replace', path: ['a'], value: 2, timestamp: 1 } as any;
  const notAnObject = { op: 'copy', path: ['a'], value: 3, timestamp: 2 } as any;
  const pathMissing = { op: 'replace', path: ['missing', 'child'], value: 4, timestamp: 3 } as any;

  await updateMapState('op-patches', 'sender', [notAnObject, pathMissing, valid]);

  assert.deepEqual(operationCaches['op-patches'].mapState, { a: 2 });
  assert.deepEqual(sentToOther, [[valid]]);
  delete operationCaches['op-patches'];
});

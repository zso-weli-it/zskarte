import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operationCaches, persistMapStates } from '../../src/state/operation';

const silentLog = { info() {}, error() {}, warn() {}, debug() {} };

test('a change that arrives while a save runs is still marked for the next save', async () => {
  operationCaches['op-race'] = { operation: {} as any, connections: [], users: [], mapState: { a: 1 }, mapStateChanged: true };
  const strapi: any = {
    log: silentLog,
    documents: () => ({
      update: async () => {
        // a drawing patch arrives while the database write is still running
        operationCaches['op-race'].mapStateChanged = true;
      },
    }),
  };
  await persistMapStates(strapi);
  assert.equal(operationCaches['op-race'].mapStateChanged, true);
  delete operationCaches['op-race'];
});

test('a failed save keeps the change flag so the state is retried', async () => {
  operationCaches['op-fail'] = { operation: {} as any, connections: [], users: [], mapState: { a: 1 }, mapStateChanged: true };
  const strapi: any = {
    log: silentLog,
    documents: () => ({
      update: async () => {
        throw new Error('database unavailable');
      },
    }),
  };
  await persistMapStates(strapi);
  assert.equal(operationCaches['op-fail'].mapStateChanged, true);
  delete operationCaches['op-fail'];
});

test('an unchanged map state is not written', async () => {
  operationCaches['op-clean'] = { operation: {} as any, connections: [], users: [], mapState: { a: 1 }, mapStateChanged: false };
  let writes = 0;
  const strapi: any = { log: silentLog, documents: () => ({ update: async () => void writes++ }) };
  await persistMapStates(strapi);
  assert.equal(writes, 0);
  delete operationCaches['op-clean'];
});

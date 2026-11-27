import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidLocation } from '../../src/api/operation/lib/location';
import { operationCaches, updateCurrentLocation } from '../../src/state/operation';

test('an empty body clears the location', () => {
  assert.equal(isValidLocation(undefined), true);
  assert.equal(isValidLocation({}), true);
});

test('a longitude and a latitude that are both numbers are accepted', () => {
  assert.equal(isValidLocation({ long: 8.5, lat: 47.4 }), true);
});

test('a latitude that is not a number is refused', () => {
  assert.equal(isValidLocation({ long: 8.5, lat: 'abc' } as any), false);
});

test('a longitude without a latitude is refused', () => {
  assert.equal(isValidLocation({ long: 8.5 } as any), false);
});

test('clearing a location removes it from the connection instead of storing an empty one', async () => {
  (globalThis as any).strapi = { log: { info() {}, error() {}, warn() {}, debug() {} } };
  const sent: unknown[] = [];
  const connection = {
    identifier: 'phone',
    currentLocation: { long: 8.5, lat: 47.4 },
    socket: { emit: (_event: string, payload: unknown) => sent.push(payload) },
  };
  operationCaches['op-location'] = { operation: {} as any, connections: [connection], mapState: {}, mapStateChanged: false } as any;
  await updateCurrentLocation('op-location', 'phone', undefined);
  assert.equal(connection.currentLocation, undefined);
  delete operationCaches['op-location'];
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMemberOfOperation } from '../../src/state/membership';

const operation = { organization: { users: [{ id: 1 }, { id: 2 }] } };

test('a member of the organisation may connect', () => {
  assert.equal(isMemberOfOperation({ id: 2 }, operation), true);
});

test('a user removed from the organisation may not connect', () => {
  assert.equal(isMemberOfOperation({ id: 3 }, operation), false);
});

test('an operation without an organisation admits nobody', () => {
  assert.equal(isMemberOfOperation({ id: 1 }, { organization: undefined }), false);
  assert.equal(isMemberOfOperation({ id: 1 }, null), false);
});

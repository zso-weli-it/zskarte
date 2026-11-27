import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AccessTypes } from '../../src/definitions/constants/AccessType';

// Every share type needs an operation user (operation_read, operation_write), so only these two can log in.
test('share links have the types read and write only', () => {
  assert.deepEqual(Object.values(AccessTypes).sort(), ['read', 'write']);
});

test('the schema of the access collection accepts the same types', () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../src/api/access/content-types/access/schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual([...schema.attributes.type.enum].sort(), Object.values(AccessTypes).sort());
});

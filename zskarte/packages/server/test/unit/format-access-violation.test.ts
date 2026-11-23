import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAccessViolation } from '../../src/middlewares/format-access-violation';

const base = {
  message: 'create with no operation',
  url: '/api/journal-entries',
  ip: '1.2.3.4',
  userAgent: 'Mozilla/5.0',
  userOrganisationId: 'org-1',
  jwtOperationId: 'op-1',
};

test('a normal violation is one line with all fields', () => {
  const line = formatAccessViolation(base);
  assert.equal(
    line,
    '[global::accessControl]: create with no operation, url:"/api/journal-entries", ' +
      'userOrganisationId:org-1, jwtOperationId:op-1, ip:"1.2.3.4", user-agent:"Mozilla/5.0"',
  );
});

test('a line break in the url or the user agent cannot add a log line', () => {
  const line = formatAccessViolation({
    ...base,
    url: '/x\n[global::accessControl]: fake entry',
    userAgent: 'agent\r\nforged',
  });
  assert.equal(line.includes('\n'), false);
  assert.equal(line.includes('\r'), false);
});

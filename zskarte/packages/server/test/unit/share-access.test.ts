import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isShareAccessUsable, isShareLinkUsable } from '../../src/api/access/lib/share-access';
import { operationCaches } from '../../src/state/operation';
import { disconnectShareSockets } from '../../src/state/socketio';

const NOW = Date.parse('2026-11-27T10:00:00Z');
const fakeStrapi = (access: unknown) =>
  ({ documents: () => ({ findOne: async () => access }) }) as any;

test('an active share link without expiry is usable', () => {
  assert.equal(isShareAccessUsable({ active: true, expiresOn: null }, NOW), true);
});

test('an inactive share link is not usable', () => {
  assert.equal(isShareAccessUsable({ active: false, expiresOn: null }, NOW), false);
});

test('a share link past its expiry is not usable, one before it is', () => {
  assert.equal(isShareAccessUsable({ active: true, expiresOn: new Date(NOW - 1).toISOString() }, NOW), false);
  assert.equal(isShareAccessUsable({ active: true, expiresOn: new Date(NOW + 1).toISOString() }, NOW), true);
});

test('a token without a share link id is not usable', async () => {
  assert.equal(await isShareLinkUsable(fakeStrapi({ active: true, expiresOn: null }), undefined), false);
});

test('a token whose share link was deleted is not usable', async () => {
  assert.equal(await isShareLinkUsable(fakeStrapi(null), 'deleted-link'), false);
});

test('a token whose share link is still active is usable', async () => {
  assert.equal(await isShareLinkUsable(fakeStrapi({ active: true, expiresOn: null }), 'link-1'), true);
});

test('deleting a share link closes the live sockets that came in with it', () => {
  const closed: string[] = [];
  const socketWith = (id: string, accessId: string) => ({
    id,
    data: { accessId },
    disconnect: () => closed.push(id),
  });
  operationCaches['op-revoke'] = {
    operation: {} as any,
    connections: [
      { socket: socketWith('s1', 'link-1') as any, identifier: 'a', label: 'a', user: {} as any },
      { socket: socketWith('s2', 'link-2') as any, identifier: 'b', label: 'b', user: {} as any },
    ],
    users: [],
    mapState: {},
    mapStateChanged: false,
  } as any;
  disconnectShareSockets('link-1');
  assert.deepEqual(closed, ['s1']);
  delete operationCaches['op-revoke'];
});

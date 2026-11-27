import { test } from 'node:test';
import assert from 'node:assert/strict';
import accessControl from '../../src/middlewares/accessControl';
import { AccessControlTypes } from '../../src/definitions';

const silentLog = { info() {}, error() {}, warn() {}, debug() {} };

const OPERATION_A = { documentId: 'op-A', phase: 'active', organization: { documentId: 'org-1' } };
const OPERATION_B = { documentId: 'op-B', phase: 'active', organization: { documentId: 'org-1' } };

const OPERATIONS: Record<string, object> = { 'op-A': OPERATION_A, 'op-B': OPERATION_B };

/** A fake strapi with one login token, the share links and the operations it can read. */
const fakeStrapi = (token: object | null, accesses: Record<string, object>) => ({
  log: silentLog,
  plugins: { 'users-permissions': { services: { jwt: { getToken: async () => token } } } },
  documents: (uid: string) => ({
    findOne: async ({ documentId }: { documentId: string }) =>
      (uid === 'api::access.access' ? accesses : OPERATIONS)[documentId] ?? null,
  }),
});

/** A request that uses the middleware; forbidden() and unauthorized() record the status they set. */
const runRequest = async (config: object, strapi: object, params: Record<string, string> = {}) => {
  const ctx: any = {
    status: 200,
    params,
    query: {},
    request: { url: '/api/x', ip: '1.2.3.4', headers: {}, body: {} },
    state: { route: { handler: 'operation.findOne' }, user: undefined },
    forbidden() {
      this.status = 403;
      return 'forbidden';
    },
    unauthorized() {
      this.status = 401;
      return 'unauthorized';
    },
  };
  const middleware = accessControl(config as any, { strapi } as any);
  const result = await middleware(ctx, async () => 'next');
  return { ctx, result };
};

const shareToken = (operationId: string, accessId: string) => ({ operationId, accessId, id: 7 });
const activeLink = { 'link-1': { documentId: 'link-1', active: true, expiresOn: null } };
const byIdOperation = { type: 'api::operation.operation', check: AccessControlTypes.BY_ID };

test('a share link for operation A cannot read operation B by id', async () => {
  const strapi = fakeStrapi(shareToken('op-A', 'link-1'), activeLink);
  const { ctx, result } = await runRequest(byIdOperation, strapi, { id: 'op-B' });
  assert.equal(result, 'forbidden');
  assert.equal(ctx.status, 403);
});

test('a share link for operation A can read operation A by id', async () => {
  const strapi = fakeStrapi(shareToken('op-A', 'link-1'), activeLink);
  const { result } = await runRequest(byIdOperation, strapi, { id: 'op-A' });
  assert.equal(result, 'next');
});

test('a share link that was deleted is refused even though the token is still valid', async () => {
  const strapi = fakeStrapi(shareToken('op-A', 'link-gone'), activeLink);
  const { ctx, result } = await runRequest(byIdOperation, strapi, { id: 'op-A' });
  assert.equal(result, 'unauthorized');
  assert.equal(ctx.status, 401);
});

test('a share link list only shows the operation of the link', async () => {
  const strapi = fakeStrapi(shareToken('op-A', 'link-1'), activeLink);
  const { ctx, result } = await runRequest({ type: 'api::operation.operation', check: AccessControlTypes.LIST }, strapi);
  assert.equal(result, 'next');
  assert.deepEqual(ctx.query.filters, { documentId: { $eq: 'op-A' }, phase: { $eq: 'active' } });
});

test('a request without any login is refused', async () => {
  const strapi = fakeStrapi(null, activeLink);
  const { ctx, result } = await runRequest(byIdOperation, strapi, { id: 'op-A' });
  assert.equal(result, 'unauthorized');
  assert.equal(ctx.status, 401);
});

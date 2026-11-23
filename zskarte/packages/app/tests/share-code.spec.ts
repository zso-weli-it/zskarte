import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Regression test for the one-time share code. It uses the running local stack: it creates a short
// access row directly in the database (docker must be available), redeems it in parallel, and cleans up.
const API = 'http://localhost:1337';
const CODE = String(Math.floor(100000 + Math.random() * 899999));

const sql = (query: string) =>
  execFileSync('docker', ['exec', 'postgresql-zskarte', 'psql', '-U', 'postgres', '-d', 'zskarte', '-At', '-c', query], {
    encoding: 'utf8',
  }).trim();

test.describe('share code is single use', () => {
  let operationId: string;
  let organizationId: string;

  test.beforeAll(() => {
    [operationId, organizationId] = sql(
      'select ol.operation_id, og.organization_id from operations_organization_lnk og ' +
        'join operations_organization_lnk ol on ol.organization_id = og.organization_id limit 1',
    ).split('|');
    const accessId = sql(
      `insert into accesses (access_token, type, name, active, expires_on, created_at, updated_at, document_id, locale) ` +
        `values ('${CODE}', 'read', 'share-code-test', true, now() + interval '15 minutes', now(), now(), 'sharecodetest${CODE}', 'de') returning id`,
    ).split('\n')[0];
    sql(`insert into accesses_operation_lnk (access_id, operation_id, id) values (${accessId}, ${operationId}, (select coalesce(max(id),0)+1 from accesses_operation_lnk))`);
    sql(`insert into accesses_organization_lnk (access_id, organization_id, id) values (${accessId}, ${organizationId}, (select coalesce(max(id),0)+1 from accesses_organization_lnk))`);
  });

  test.afterAll(() => {
    sql(`delete from accesses where access_token = '${CODE}'`);
  });

  test('of six parallel redemptions of one code only one gets a login', async ({ request }) => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => request.post(`${API}/api/accesses/auth/token`, { data: { accessToken: CODE } })),
    );
    const statuses = responses.map((r) => r.status()).sort();
    expect(statuses).toEqual([200, 401, 401, 401, 401, 401]);
  });

  test('a code that was already used gets no login', async ({ request }) => {
    const response = await request.post(`${API}/api/accesses/auth/token`, { data: { accessToken: CODE } });
    expect(response.status()).toBe(401);
  });
});

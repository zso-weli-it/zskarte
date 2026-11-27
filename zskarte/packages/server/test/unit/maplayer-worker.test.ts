import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishWithWorker } from '../../src/state/maplayer';

test('the worker is stopped after the final step', async () => {
  const events: string[] = [];
  await finishWithWorker(
    async () => void events.push('finish'),
    async () => void events.push('stop'),
  );
  assert.deepEqual(events, ['finish', 'stop']);
});

test('the worker is stopped even when the final step fails, and the error is still reported', async () => {
  let stopped = false;
  await assert.rejects(
    finishWithWorker(
      async () => {
        throw new Error('database unavailable');
      },
      async () => void (stopped = true),
    ),
    /database unavailable/,
  );
  assert.equal(stopped, true);
});

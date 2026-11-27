import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLosingRace, renumberUntilFree } from '../../src/api/journal-entry/lib/message-number';

test('the entry saved first keeps its number, a later entry with the same number loses the race', () => {
  assert.equal(isLosingRace(['first', 'second'], 'first'), false);
  assert.equal(isLosingRace(['first', 'second'], 'second'), true);
});

test('an entry whose number nobody else uses does not lose a race', () => {
  assert.equal(isLosingRace(['only'], 'only'), false);
});

test('a losing entry moves up to the next number that is free', async () => {
  // number 5 is used by the earlier entry "first"; number 6 is taken by "other" as well
  const usage: Record<number, string[]> = { 5: ['first', 'loser'], 6: ['other', 'loser'], 7: ['loser'] };
  const saved: Array<[string, number]> = [];
  const entry = { documentId: 'loser', messageNumber: 5 };

  const result = await renumberUntilFree(
    entry,
    async (n) => usage[n] ?? [],
    async (documentId, n) => void saved.push([documentId, n]),
  );

  assert.equal(result, 7);
  assert.equal(entry.messageNumber, 7);
  assert.deepEqual(saved, [
    ['loser', 6],
    ['loser', 7],
  ]);
});

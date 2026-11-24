const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const libraryPath = path.join(__dirname, 'embed-parents.sh');

const checkEmbedParents = (value) =>
  spawnSync('bash', ['-c', 'source "$1"; check_embed_parents "$2"', 'check', libraryPath, value], {
    encoding: 'utf8',
  });

test('an empty list is accepted, so only the own page may embed zskarte', () => {
  assert.equal(checkEmbedParents('').status, 0);
});

test('one or several origins with port are accepted', () => {
  assert.equal(checkEmbedParents('https://intranet.example.org').status, 0);
  assert.equal(checkEmbedParents('https://a.example.org http://b.example.org:8443').status, 0);
});

test('a value that could add a CSP directive is rejected', () => {
  const result = checkEmbedParents("https://x.example.org;script-src 'unsafe-eval'");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ZSK_EMBED_PARENTS must be/);
});

test('paths, other schemes and wildcards are rejected', () => {
  assert.notEqual(checkEmbedParents('https://x.example.org/path').status, 0);
  assert.notEqual(checkEmbedParents('javascript:alert(1)').status, 0);
  assert.notEqual(checkEmbedParents('https://*.example.org').status, 0);
});

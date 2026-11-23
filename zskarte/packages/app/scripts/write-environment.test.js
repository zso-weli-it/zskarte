const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildEnvironmentSource } = require('./write-environment');

// the generated file is a TypeScript module: its object literal is evaluated to read the values back
const readEnvironment = (source) => {
  const script = source.replace('export const environment =', 'globalThis.environment =');
  const sandbox = { globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(script, sandbox);
  return sandbox.environment;
};

test('an organisation name with quotes and backslashes is written as the same text', () => {
  const name = `O'Neil "Zentrale" \ Nord`;
  const environment = readEnvironment(buildEnvironmentSource({ ZSK_ORG_NAME: name }));
  assert.equal(environment.searchLabel, `${name} (lokale Suche)`);
});

test('a value with a line break keeps the file valid', () => {
  const environment = readEnvironment(buildEnvironmentSource({ ZSK_API_URL: 'https://a.example\n/x' }));
  assert.equal(environment.apiUrl, 'https://a.example\n/x');
});

test('defaults are used when no variable is set', () => {
  const environment = readEnvironment(buildEnvironmentSource({}));
  assert.equal(environment.apiUrl, 'http://localhost:1337');
  assert.equal(environment.codeLoginEnabled, true);
  assert.equal(environment.searchLabel, 'Lokale Suche');
});

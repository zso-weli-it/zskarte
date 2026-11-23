import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin, isAllowedOrigin } from '../../src/state/allowed-origin';

const allowed = appOrigin('https://karte.example.ch');

test('the origin of the app is scheme, host and port, without a path', () => {
  assert.equal(appOrigin('https://karte.example.ch/some/path'), 'https://karte.example.ch');
});

test('an app address that is not a URL stops the start with a clear message', () => {
  assert.throws(() => appOrigin('karte.example.ch'), /ZSK_APP_URL is not a valid URL/);
});

test('the app itself may connect', () => {
  assert.equal(isAllowedOrigin('https://karte.example.ch', allowed), true);
});

test('another website may not connect', () => {
  assert.equal(isAllowedOrigin('https://evil.example.net', allowed), false);
});

test('a different port or scheme of the app is another origin', () => {
  assert.equal(isAllowedOrigin('http://karte.example.ch', allowed), false);
  assert.equal(isAllowedOrigin('https://karte.example.ch:8443', allowed), false);
});

test('a request without Origin (no browser) is not blocked by this check', () => {
  assert.equal(isAllowedOrigin(undefined, allowed), true);
});

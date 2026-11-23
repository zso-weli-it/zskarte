import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../../src/state/allowed-origin';

const appUrl = 'https://karte.example.ch';

test('the app itself may connect', () => {
  assert.equal(isAllowedOrigin('https://karte.example.ch', appUrl), true);
});

test('another website may not connect', () => {
  assert.equal(isAllowedOrigin('https://evil.example.net', appUrl), false);
});

test('a different port or scheme of the app is another origin', () => {
  assert.equal(isAllowedOrigin('http://karte.example.ch', appUrl), false);
  assert.equal(isAllowedOrigin('https://karte.example.ch:8443', appUrl), false);
});

test('a request without Origin (no browser) is not blocked by this check', () => {
  assert.equal(isAllowedOrigin(undefined, appUrl), true);
});

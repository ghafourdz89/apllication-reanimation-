import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration } from './rcp.js';

test('formatDuration affiche mm:ss', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(65_400), '01:05');
  assert.equal(formatDuration(-5), '00:00');
});

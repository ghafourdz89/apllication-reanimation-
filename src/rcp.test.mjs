import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENTS,
  adrenalineStatus,
  cycleRemaining,
  formatDuration,
  nextAmiodarone,
} from './rcp.js';

test('formatDuration affiche mm:ss', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(65_400), '01:05');
  assert.equal(formatDuration(-5), '00:00');
});

test('cycleRemaining décompte 2 minutes sans passer sous zéro', () => {
  assert.equal(cycleRemaining(0, 30_000), 90_000);
  assert.equal(cycleRemaining(0, 200_000), 0);
});

test('adrenalineStatus suit la fenêtre 3-5 minutes', () => {
  assert.equal(adrenalineStatus(null, 1000).level, 'none');
  assert.equal(adrenalineStatus(0, 60_000).level, 'ok');
  assert.equal(adrenalineStatus(0, 180_000).level, 'due');
  assert.equal(adrenalineStatus(0, 300_000).level, 'late');
});

test('nextAmiodarone propose 300 mg puis 150 mg puis rien', () => {
  assert.equal(nextAmiodarone([]), EVENTS.AMIODARONE_1);
  assert.equal(nextAmiodarone([{ label: EVENTS.AMIODARONE_1 }]), EVENTS.AMIODARONE_2);
  assert.equal(
    nextAmiodarone([{ label: EVENTS.AMIODARONE_1 }, { label: EVENTS.AMIODARONE_2 }]),
    null,
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASES,
  RYTHMES,
  adrenalineGuidance,
  amiodaroneGuidance,
  initialState,
  reducer,
} from './algorithme.js';

const run = (actions) => actions.reduce(reducer, initialState);
const choc = (at) => [
  { type: 'ANALYSE', at },
  { type: 'RHYTHM', rhythm: RYTHMES.CHOQUABLE, at },
  { type: 'SHOCK', at },
];

test('rythme choquable : analyse → choc → cycle de RCP', () => {
  let s = run([{ type: 'START', at: 0 }, { type: 'RHYTHM', rhythm: RYTHMES.CHOQUABLE, at: 1 }]);
  assert.equal(s.phase, PHASES.CHOC);
  s = reducer(s, { type: 'SHOCK', at: 2 });
  assert.equal(s.phase, PHASES.RCP);
  assert.equal(s.shocks, 1);
  assert.equal(s.cycleNumber, 1);
});

test('rythme choquable : pas d’adrénaline ni d’amiodarone avant le 3e choc', () => {
  const s = run([
    { type: 'START', at: 0 },
    { type: 'RHYTHM', rhythm: RYTHMES.CHOQUABLE, at: 0 },
    { type: 'SHOCK', at: 0 },
    ...choc(1),
  ]);
  assert.equal(s.shocks, 2);
  assert.equal(adrenalineGuidance(s, 2).level, 'attente');
  assert.equal(amiodaroneGuidance(s).level, 'attente');
});

test('rythme choquable : adrénaline et amiodarone 300 mg après le 3e choc, 150 mg après le 5e', () => {
  let s = run([
    { type: 'START', at: 0 },
    { type: 'RHYTHM', rhythm: RYTHMES.CHOQUABLE, at: 0 },
    { type: 'SHOCK', at: 0 },
    ...choc(1),
    ...choc(2),
  ]);
  assert.equal(adrenalineGuidance(s, 3).level, 'due');
  assert.match(amiodaroneGuidance(s).text, /300 mg/);
  assert.equal(amiodaroneGuidance(s).level, 'due');
  s = reducer(s, { type: 'AMIODARONE', at: 3 });
  assert.equal(amiodaroneGuidance(s).level, 'attente');
  s = [...choc(4), ...choc(5)].reduce(reducer, s);
  assert.match(amiodaroneGuidance(s).text, /150 mg/);
  assert.equal(amiodaroneGuidance(s).level, 'due');
  s = reducer(s, { type: 'AMIODARONE', at: 6 });
  assert.equal(amiodaroneGuidance(s), null);
});

test('rythme non choquable : adrénaline immédiate, pas d’amiodarone', () => {
  const s = run([{ type: 'START', at: 0 }, { type: 'RHYTHM', rhythm: RYTHMES.NON_CHOQUABLE, at: 0 }]);
  assert.equal(s.phase, PHASES.RCP);
  assert.equal(adrenalineGuidance(s, 0).level, 'due');
  assert.equal(amiodaroneGuidance(s), null);
});

test('adrénaline répétée toutes les 3-5 minutes', () => {
  const s = run([
    { type: 'START', at: 0 },
    { type: 'RHYTHM', rhythm: RYTHMES.NON_CHOQUABLE, at: 0 },
    { type: 'ADRENALINE', at: 0 },
  ]);
  assert.equal(adrenalineGuidance(s, 60_000).level, 'ok');
  assert.equal(adrenalineGuidance(s, 180_000).level, 'due');
  assert.equal(adrenalineGuidance(s, 300_000).level, 'retard');
});

test('RACS puis récidive : retour à l’analyse du rythme', () => {
  let s = run([
    { type: 'START', at: 0 },
    { type: 'RHYTHM', rhythm: RYTHMES.NON_CHOQUABLE, at: 0 },
    { type: 'ROSC', at: 10 },
  ]);
  assert.equal(s.phase, PHASES.RACS);
  s = reducer(s, { type: 'REARREST', at: 20 });
  assert.equal(s.phase, PHASES.ANALYSE);
});

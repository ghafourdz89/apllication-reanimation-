import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterMedecin,
  assigner,
  compterGardes,
  joursDuMois,
  moisDecale,
  planningVide,
  supprimerMedecin,
} from './logique.js';

test('joursDuMois : nombre de jours et week-ends', () => {
  const fevrier = joursDuMois(2028, 1);
  assert.equal(fevrier.length, 29);
  const octobre = joursDuMois(2026, 9);
  assert.equal(octobre.length, 31);
  assert.equal(octobre[0].cle, '2026-10-01');
  assert.equal(octobre[0].nomJour, 'Jeu');
  assert.equal(octobre[2].weekend, true);
});

test('moisDecale passe d’une année à l’autre', () => {
  assert.deepEqual(moisDecale(2026, 11, 1), { annee: 2027, mois: 0 });
  assert.deepEqual(moisDecale(2026, 0, -1), { annee: 2025, mois: 11 });
});

test('ajouterMedecin ignore un nom vide et attribue une couleur', () => {
  let p = ajouterMedecin(planningVide, '  ', 'x');
  assert.equal(p.medecins.length, 0);
  p = ajouterMedecin(p, ' Dr Amine ', 'a');
  assert.deepEqual(p.medecins[0].nom, 'Dr Amine');
  assert.ok(p.medecins[0].couleur);
});

test('assigner, libérer et compter les gardes', () => {
  let p = ajouterMedecin(planningVide, 'A', 'a');
  p = ajouterMedecin(p, 'B', 'b');
  p = assigner(p, '2026-10-01', 'jour', 'a');
  p = assigner(p, '2026-10-01', 'nuit', 'b');
  p = assigner(p, '2026-10-02', 'nuit', 'a');
  p = assigner(p, '2026-11-01', 'jour', 'a');
  const c = compterGardes(p, 2026, 9);
  assert.equal(c.a.total, 2);
  assert.equal(c.a.nuit, 1);
  assert.equal(c.b.total, 1);
  p = assigner(p, '2026-10-02', 'nuit', null);
  assert.equal(p.gardes['2026-10-02'], undefined);
});

test('supprimerMedecin libère ses créneaux', () => {
  let p = ajouterMedecin(planningVide, 'A', 'a');
  p = ajouterMedecin(p, 'B', 'b');
  p = assigner(p, '2026-10-01', 'jour', 'a');
  p = assigner(p, '2026-10-01', 'nuit', 'b');
  p = supprimerMedecin(p, 'a');
  assert.equal(p.medecins.length, 1);
  assert.deepEqual(p.gardes['2026-10-01'], { nuit: 'b' });
});

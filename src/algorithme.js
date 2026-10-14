// Algorithme de réanimation avancée de l'adulte (recommandations ERC).
// Logique pure (sans React) : un réducteur d'état + des fonctions de consignes.

import { ADRENALINE_DUE_MS, ADRENALINE_LATE_MS, CYCLE_MS, formatDuration } from './rcp.js';

export const RYTHMES = {
  CHOQUABLE: 'choquable',
  NON_CHOQUABLE: 'non_choquable',
};

export const PHASES = {
  ACCUEIL: 'accueil',
  ANALYSE: 'analyse',
  CHOC: 'choc',
  RCP: 'rcp',
  RACS: 'racs',
  FIN: 'fin',
};

export const CAUSES = [
  { id: 'hypoxie', groupe: '4H', label: 'Hypoxie' },
  { id: 'hypovolemie', groupe: '4H', label: 'Hypovolémie' },
  { id: 'hypokaliemie', groupe: '4H', label: 'Hypo/hyperkaliémie, troubles métaboliques' },
  { id: 'hypothermie', groupe: '4H', label: 'Hypothermie / hyperthermie' },
  { id: 'thrombose', groupe: '4T', label: 'Thrombose (coronaire ou embolie pulmonaire)' },
  { id: 'pneumothorax', groupe: '4T', label: 'Pneumothorax sous tension' },
  { id: 'tamponnade', groupe: '4T', label: 'Tamponnade' },
  { id: 'toxiques', groupe: '4T', label: 'Toxiques' },
];

export const initialState = {
  phase: PHASES.ACCUEIL,
  startedAt: null,
  endedAt: null,
  cycleStart: null,
  cycleNumber: 0,
  shocks: 0,
  lastRhythm: null,
  nonShockableSeen: false,
  adrenalineTimes: [],
  amiodaroneDoses: 0,
  airway: false,
  access: false,
  causes: {},
  log: [],
};

function withLog(state, at, label) {
  return { ...state, log: [{ id: `${at}-${state.log.length}`, at, label }, ...state.log] };
}

function newCycle(state, at) {
  return { ...state, phase: PHASES.RCP, cycleStart: at, cycleNumber: state.cycleNumber + 1 };
}

export function reducer(state, action) {
  const { at } = action;
  switch (action.type) {
    case 'START':
      return withLog({ ...initialState, phase: PHASES.ANALYSE, startedAt: at }, at, 'Début RCP');
    case 'ANALYSE':
      if (state.phase !== PHASES.RCP) return state;
      return { ...state, phase: PHASES.ANALYSE };
    case 'RHYTHM':
      if (state.phase !== PHASES.ANALYSE) return state;
      if (action.rhythm === RYTHMES.CHOQUABLE) {
        return withLog(
          { ...state, phase: PHASES.CHOC, lastRhythm: RYTHMES.CHOQUABLE },
          at,
          'Rythme choquable (FV / TV sans pouls)',
        );
      }
      return withLog(
        newCycle({ ...state, lastRhythm: RYTHMES.NON_CHOQUABLE, nonShockableSeen: true }, at),
        at,
        'Rythme non choquable (asystolie / AESP)',
      );
    case 'SHOCK':
      if (state.phase !== PHASES.CHOC) return state;
      return withLog(newCycle({ ...state, shocks: state.shocks + 1 }, at), at, `Choc n°${state.shocks + 1} délivré`);
    case 'ADRENALINE':
      return withLog(
        { ...state, adrenalineTimes: [...state.adrenalineTimes, at] },
        at,
        `Adrénaline 1 mg (dose n°${state.adrenalineTimes.length + 1})`,
      );
    case 'AMIODARONE': {
      if (state.amiodaroneDoses >= 2) return state;
      const dose = state.amiodaroneDoses === 0 ? '300 mg' : '150 mg';
      return withLog({ ...state, amiodaroneDoses: state.amiodaroneDoses + 1 }, at, `Amiodarone ${dose}`);
    }
    case 'AIRWAY':
      return withLog({ ...state, airway: true }, at, 'Voie aérienne avancée (intubation / supraglottique)');
    case 'ACCESS':
      return withLog({ ...state, access: true }, at, 'Voie veineuse / intra-osseuse posée');
    case 'TOGGLE_CAUSE':
      return { ...state, causes: { ...state.causes, [action.id]: !state.causes[action.id] } };
    case 'ROSC':
      return withLog({ ...state, phase: PHASES.RACS }, at, 'RACS (reprise d’activité cardiaque)');
    case 'REARREST':
      if (state.phase !== PHASES.RACS) return state;
      return withLog({ ...state, phase: PHASES.ANALYSE }, at, 'Récidive d’arrêt cardiaque');
    case 'STOP':
      return withLog({ ...state, phase: PHASES.FIN, endedAt: at }, at, 'Arrêt de la réanimation');
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function cycleRemaining(state, now) {
  if (state.cycleStart == null) return CYCLE_MS;
  return Math.max(0, CYCLE_MS - (now - state.cycleStart));
}

// Consigne adrénaline. level : 'attente' | 'ok' | 'due' | 'retard'.
export function adrenalineGuidance(state, now) {
  const last = state.adrenalineTimes[state.adrenalineTimes.length - 1];
  if (last == null) {
    if (state.nonShockableSeen) {
      return { level: 'due', text: 'Adrénaline 1 mg IV/IO dès que possible (rythme non choquable)' };
    }
    if (state.shocks >= 3) {
      return { level: 'due', text: 'Adrénaline 1 mg IV/IO maintenant (après le 3e choc)' };
    }
    return {
      level: 'attente',
      text: `Rythme choquable : pas d’adrénaline avant le 3e choc (${state.shocks}/3)`,
    };
  }
  const elapsed = now - last;
  if (elapsed >= ADRENALINE_LATE_MS) {
    return { level: 'retard', text: `Adrénaline en retard : dernière dose il y a ${formatDuration(elapsed)}` };
  }
  if (elapsed >= ADRENALINE_DUE_MS) {
    return { level: 'due', text: `Adrénaline 1 mg maintenant (dernière il y a ${formatDuration(elapsed)})` };
  }
  return {
    level: 'ok',
    text: `Prochaine adrénaline dans ${formatDuration(ADRENALINE_DUE_MS - elapsed)} (toutes les 3-5 min)`,
  };
}

// Consigne amiodarone (uniquement pour un rythme choquable). null si non concernée.
export function amiodaroneGuidance(state) {
  if (state.lastRhythm !== RYTHMES.CHOQUABLE || state.amiodaroneDoses >= 2) return null;
  if (state.amiodaroneDoses === 0) {
    return state.shocks >= 3
      ? { level: 'due', text: 'Amiodarone 300 mg IV/IO maintenant (après le 3e choc)' }
      : { level: 'attente', text: `Amiodarone 300 mg après le 3e choc (${state.shocks}/3)` };
  }
  return state.shocks >= 5
    ? { level: 'due', text: 'Amiodarone 150 mg IV/IO maintenant (après le 5e choc)' }
    : { level: 'attente', text: `Amiodarone 150 mg après le 5e choc (${state.shocks}/5)` };
}

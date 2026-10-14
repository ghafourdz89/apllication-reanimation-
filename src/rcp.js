// Logique pure de l'assistant RCP (sans React), testable avec `npm test`.

export const CYCLE_MS = 2 * 60 * 1000;
export const ADRENALINE_DUE_MS = 3 * 60 * 1000;
export const ADRENALINE_LATE_MS = 5 * 60 * 1000;
export const COMPRESSION_BPM = 110;
export const BEAT_MS = Math.round(60000 / COMPRESSION_BPM);

export const EVENTS = {
  START: 'Début RCP',
  SHOCK: 'Choc délivré',
  NO_SHOCK: 'Rythme non choquable',
  ADRENALINE: 'Adrénaline 1 mg',
  AMIODARONE_1: 'Amiodarone 300 mg',
  AMIODARONE_2: 'Amiodarone 150 mg',
  AIRWAY: 'Intubation / voie aérienne',
  ROSC: 'RACS (reprise d’activité cardiaque)',
  STOP: 'Arrêt de la réanimation',
};

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatClock(timestamp) {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export function cycleRemaining(cycleStart, now) {
  return Math.max(0, CYCLE_MS - (now - cycleStart));
}

// 'none' : aucune dose ; 'ok' : < 3 min ; 'due' : 3 à 5 min ; 'late' : > 5 min.
export function adrenalineStatus(lastDoseAt, now) {
  if (lastDoseAt == null) return { level: 'none', elapsed: 0 };
  const elapsed = now - lastDoseAt;
  if (elapsed >= ADRENALINE_LATE_MS) return { level: 'late', elapsed };
  if (elapsed >= ADRENALINE_DUE_MS) return { level: 'due', elapsed };
  return { level: 'ok', elapsed };
}

export function countEvents(log, label) {
  return log.filter((e) => e.label === label).length;
}

// Amiodarone : 300 mg puis 150 mg, puis plus de dose proposée.
export function nextAmiodarone(log) {
  const given = countEvents(log, EVENTS.AMIODARONE_1) + countEvents(log, EVENTS.AMIODARONE_2);
  if (given === 0) return EVENTS.AMIODARONE_1;
  if (given === 1) return EVENTS.AMIODARONE_2;
  return null;
}

// Constantes et utilitaires de l'assistant RCP (sans React), testables avec `npm test`.

export const CYCLE_MS = 2 * 60 * 1000;
export const ADRENALINE_DUE_MS = 3 * 60 * 1000;
export const ADRENALINE_LATE_MS = 5 * 60 * 1000;
export const COMPRESSION_BPM = 110;
export const BEAT_MS = Math.round(60000 / COMPRESSION_BPM);

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

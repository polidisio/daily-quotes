// Logica pura de fechas y seleccion de cita. Se usa en navegador y en la API,
// asi ambos lados eligen siempre la misma cita para una fecha dada.
import { QUOTES } from './quotes.js';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function parts(iso) {
  const m = ISO_RE.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Devuelve true si `iso` es una fecha real con formato YYYY-MM-DD. */
export function isValidISODate(iso) {
  if (typeof iso !== 'string') return false;
  const p = parts(iso);
  if (!p) return false;
  const [y, m, d] = p;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Fecha LOCAL del usuario como YYYY-MM-DD (toISOString usaria UTC y cambiaria de dia antes de tiempo). */
export function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Numero de dia absoluto (dias desde 1970). Sin saltos por cambio de hora ni reinicio anual. */
export function dayNumber(iso) {
  const [y, m, d] = parts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Suma (o resta) dias a una fecha ISO. */
export function addDays(iso, n) {
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Cita bilingue asignada a una fecha. */
export function quoteForDate(iso) {
  const len = QUOTES.length;
  return QUOTES[((dayNumber(iso) % len) + len) % len];
}

/** Date local (mediodia, para evitar bordes de DST) a partir de una fecha ISO. */
export function isoToLocalDate(iso) {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d, 12);
}

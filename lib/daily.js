// Logica pura de fechas y seleccion de cita.
//
// Rotacion con semilla: el tiempo se divide en ciclos de N dias (N = numero de citas).
// Cada ciclo usa una permutacion distinta (barajada con la semilla + numero de ciclo), asi
// que todas las citas salen una vez por ciclo, el orden cambia cada ciclo y nunca se repite
// una cita dos dias seguidos. Es determinista: misma fecha + misma semilla = misma cita.
import { QUOTES } from './quotes.js';

export const DEFAULT_SEED = 'daily-quotes';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function parts(iso) {
  const m = ISO_RE.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** true si `iso` es una fecha real con formato YYYY-MM-DD. */
export function isValidISODate(iso) {
  if (typeof iso !== 'string') return false;
  const p = parts(iso);
  if (!p) return false;
  const [y, m, d] = p;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Fecha LOCAL como YYYY-MM-DD (toISOString usaria UTC y cambiaria de dia antes de tiempo). */
export function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dias desde 1970. Sin saltos por cambio de hora ni reinicio anual. */
export function dayNumber(iso) {
  const [y, m, d] = parts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function addDays(iso, n) {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Date local (mediodia, para evitar bordes de DST) a partir de una fecha ISO. */
export function isoToLocalDate(iso) {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d, 12);
}

// ---------- PRNG con semilla ----------
function hash(str) {                       // FNV-1a 32 bits
  let h = 2166136261;
  for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();
function rawPermutation(seed, cycle, len) {
  const key = `${seed}|${cycle}|${len}`;
  let p = cache.get(key);
  if (!p) {
    p = Array.from({ length: len }, (_, i) => i);
    const rnd = mulberry32(hash(key));
    for (let i = len - 1; i > 0; i--) {    // Fisher-Yates
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    cache.set(key, p);
  }
  return p;
}
function permutation(seed, cycle, len) {
  const p = rawPermutation(seed, cycle, len);
  if (len < 3) return p;
  // Evita repetir cita entre el ultimo dia del ciclo anterior y el primero de este.
  const prevLast = rawPermutation(seed, cycle - 1, len)[len - 1];
  if (p[0] !== prevLast) return p;
  const fixed = p.slice();
  [fixed[0], fixed[1]] = [fixed[1], fixed[0]];
  return fixed;
}

/** Indice (en QUOTES) de la cita asignada a una fecha. */
export function quoteIndexForDate(iso, seed = DEFAULT_SEED, len = QUOTES.length) {
  const n = dayNumber(iso);
  const cycle = Math.floor(n / len);
  return permutation(seed, cycle, len)[n - cycle * len];
}

/** Cita bilingue asignada a una fecha. */
export function quoteForDate(iso, seed = DEFAULT_SEED) {
  return QUOTES[quoteIndexForDate(iso, seed)];
}

/** Proxima fecha (>= desde) en la que sale la cita `index`. Siempre existe en <= 2N dias. */
export function nextDateForQuote(index, from, seed = DEFAULT_SEED) {
  for (let i = 0; i < QUOTES.length * 2; i++) {
    const d = addDays(from, i);
    if (quoteIndexForDate(d, seed) === index) return d;
  }
  return from;
}

/** Datos del ciclo para una fecha: numero de ciclo y posicion (1..N) dentro de el. */
export function cycleInfo(iso, len = QUOTES.length) {
  const n = dayNumber(iso);
  const cycle = Math.floor(n / len);
  return { cycle, position: n - cycle * len + 1, length: len };
}

// Colores de "nota" tipicos de la paleta de 16/256 colores de Windows, para variar el fondo de la cita.
export const NOTE_COLORS = ['#ffffd0', '#d0ffd0', '#d0f0ff', '#ffd8d0', '#e8d0ff', '#ffe8b0', '#d8ffe8', '#f0f0f0'];

/** Color de nota del dia: cambia cada dia de forma pseudoaleatoria con la semilla. */
export function noteColorForDate(iso, seed = DEFAULT_SEED) {
  return NOTE_COLORS[hash(`${seed}|note|${dayNumber(iso)}`) % NOTE_COLORS.length];
}

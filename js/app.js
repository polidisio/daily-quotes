// Logica de la app: cita del dia, navegacion por dias, idioma, copiar y ventanas del escritorio.
import { quoteForDate, localISODate, addDays, isoToLocalDate, noteColorForDate, DEFAULT_SEED } from '../lib/daily.js';
import { STRINGS, LABELS } from './i18n.js';
import { initDesktop, showDialog } from './desktop.js';
import { createApps } from './apps.js';

const $ = (sel) => document.querySelector(sel);

// localStorage puede lanzar (modo privado, cookies bloqueadas)
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin persistencia */ } },
};

const initialLang = () => {
  const saved = store.get('lang');
  if (saved === 'es' || saved === 'en') return saved;
  return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
};

// La semilla decide el orden de las citas. Con ?seed=loquesea cada persona puede tener su propia secuencia.
const seed = new URLSearchParams(location.search).get('seed')?.slice(0, 64) || DEFAULT_SEED;

const state = {
  lang: initialLang(),
  today: localISODate(),
  viewing: localISODate(),
};
const t = () => STRINGS[state.lang];

// ---------- Render ----------
function setStatus(text) { $('#status').textContent = text; }

function formatDate(iso) {
  return isoToLocalDate(iso).toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function renderLabels() {
  const labels = LABELS[state.lang];
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = labels[el.dataset.i18n] ?? el.textContent;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const label = labels[el.dataset.i18nTitle];
    if (label) { el.title = label; el.setAttribute('aria-label', label); }
  });
  $('#lang-es').setAttribute('aria-checked', String(state.lang === 'es'));
  $('#lang-en').setAttribute('aria-checked', String(state.lang === 'en'));
  desktop.setCtlLabels(labels.ctl);
}

function render() {
  const q = quoteForDate(state.viewing, seed)[state.lang];
  const isToday = state.viewing === state.today;
  $('#quote').textContent = `"${q.text}"`;
  $('#quote').style.setProperty('--note', noteColorForDate(state.viewing, seed));
  $('#author').textContent = `— ${q.author}`;
  $('#date').textContent = `${t().quoteOf} ${formatDate(state.viewing)}`;
  $('#currentDate').textContent = formatDate(state.today);
  $('#viewDate').textContent = isToday ? t().today : state.viewing;
  $('#btn-today').disabled = isToday;
  renderLabels();
  desktop.setClockTitle(`${t().clockTitle} ${formatDate(state.today)}`);
}

// ---------- Acciones ----------
function setLang(lang) {
  state.lang = lang;
  store.set('lang', lang);
  render();
  apps.refresh();
  setStatus(t().langSwitched);
}

function go(deltaDays) {
  state.viewing = addDays(state.viewing, deltaDays);
  render();
  setStatus(t().ready);
}

function openQuote(iso) {
  state.viewing = iso;
  render();
  setStatus(t().ready);
  desktop.openWindow('wordpad');
}

async function copyQuote() {
  const q = quoteForDate(state.viewing, seed)[state.lang];
  try {
    await navigator.clipboard.writeText(`"${q.text}" — ${q.author}`);
    setStatus(t().copied);
  } catch {
    setStatus(t().copyFail);
  }
}

// ---------- Arranque ----------
const desktop = initDesktop({
  copy: copyQuote,
  prev: () => go(-1),
  next: () => go(1),
  today: () => openQuote(state.today),
  'lang-es': () => setLang('es'),
  'lang-en': () => setLang('en'),
  about: () => showDialog({ title: t().aboutTitle, message: t().aboutBody, buttons: [{ id: 'ok', label: t().ok }] }),
  'open-wordpad': () => desktop.openWindow('wordpad'),
  'close-wordpad': () => desktop.closeWindow('wordpad'),
  'open-folder': () => apps.open('folder'),
  'open-search': () => apps.open('search'),
  'open-system': () => apps.open('system'),
  'open-bin': () => apps.open('bin'),
});

const apps = createApps(desktop, {
  t,
  lang: () => state.lang,
  seed: () => seed,
  today: () => state.today,
  openQuote,
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  if (document.querySelector('.dialog-backdrop')) return;
  if (!desktop.isOpen('wordpad') || !$('#wordpad').classList.contains('active')) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
});

render();
setStatus(t().ready);

// Si la pestaña queda abierta pasada la medianoche, refresca al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const now = localISODate();
  if (now === state.today) return;
  const followingToday = state.viewing === state.today;
  state.today = now;
  if (followingToday) state.viewing = now;
  render();
});

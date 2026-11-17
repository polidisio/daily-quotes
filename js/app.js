// Logica de la app: cita del dia, navegacion por dias, idioma, copiar y guardado en Notion.
import { quoteForDate, localISODate, addDays, isoToLocalDate } from '../lib/daily.js';
import { STRINGS, LABELS } from './i18n.js';
import { initDesktop, showDialog } from './desktop.js';

const $ = (sel) => document.querySelector(sel);
const DEBUG = new URLSearchParams(location.search).has('debug');

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

const state = {
  lang: initialLang(),
  today: localISODate(),
  viewing: localISODate(),
  saving: false,
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
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = LABELS[state.lang][el.dataset.i18n] ?? el.textContent;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const label = LABELS[state.lang][el.dataset.i18nTitle];
    if (label) { el.title = label; el.setAttribute('aria-label', label); }
  });
  $('#lang-es').setAttribute('aria-checked', String(state.lang === 'es'));
  $('#lang-en').setAttribute('aria-checked', String(state.lang === 'en'));
}

function render() {
  const q = quoteForDate(state.viewing)[state.lang];
  const isToday = state.viewing === state.today;
  $('#quote').textContent = `"${q.text}"`;
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
  setStatus(t().langSwitched);
}

function go(deltaDays) {
  state.viewing = addDays(state.viewing, deltaDays);
  render();
  setStatus(t().ready);
}

async function copyQuote() {
  const q = quoteForDate(state.viewing)[state.lang];
  const text = `"${q.text}" — ${q.author}`;
  try {
    await navigator.clipboard.writeText(text);
    setStatus(t().copied);
  } catch {
    setStatus(t().copyFail);
  }
}

// ---------- Notion ----------
const savedKey = (iso) => `quoteSaved:${iso}`;
const isSaved = (iso) => store.get(savedKey(iso)) === '1';

async function saveToNotion({ manual = false } = {}) {
  if (state.saving) return;
  const date = state.today;
  if (isSaved(date) && !manual) { setStatus(t().alreadySaved); return; }

  state.saving = true;
  setStatus(t().saving);
  try {
    const res = await fetch('/api/save-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(result.error || `HTTP ${res.status}`);
      err.detail = result;
      throw err;
    }
    store.set(savedKey(date), '1');
    setStatus(result.duplicate ? t().alreadySaved : t().saved);
    if (DEBUG) console.info('[daily-quotes] guardado', result);
  } catch (err) {
    setStatus(t().saveError);
    console.error('[daily-quotes] error al guardar', err.detail ?? err);
    // Un visitante ocasional no necesita ver errores de Notion: solo con ?debug o al guardar a mano.
    if (manual || DEBUG) {
      const choice = await showDialog({
        title: t().saveErrorTitle,
        message: `${t().saveErrorBody}\n\n(${err.message}${err.detail?.code ? ` / ${err.detail.code}` : ''})`,
        buttons: [{ id: 'retry', label: t().retry }, { id: 'ok', label: t().ok }],
      });
      state.saving = false;
      if (choice === 'retry') return saveToNotion({ manual: true });
    }
  } finally {
    state.saving = false;
  }
}

// ---------- Arranque ----------
const desktop = initDesktop({
  copy: copyQuote,
  prev: () => go(-1),
  next: () => go(1),
  today: () => { state.viewing = state.today; render(); setStatus(t().ready); },
  'lang-es': () => setLang('es'),
  'lang-en': () => setLang('en'),
  save: () => saveToNotion({ manual: true }),
  about: () => showDialog({ title: t().aboutTitle, message: t().aboutBody, buttons: [{ id: 'ok', label: t().ok }] }),
  unavailable: () => showDialog({ title: t().unavailableTitle, message: t().unavailableBody, buttons: [{ id: 'ok', label: t().ok }] }),
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  if (document.querySelector('.dialog-backdrop')) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
});

render();
setStatus(t().ready);
saveToNotion();

// Si la pestaña queda abierta pasada la medianoche, refresca al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const now = localISODate();
  if (now !== state.today) {
    const followingToday = state.viewing === state.today;
    state.today = now;
    if (followingToday) state.viewing = now;
    render();
    saveToNotion();
  }
});

if (DEBUG) {
  console.info('[daily-quotes] debug activo', { today: state.today, lang: state.lang, saved: isSaved(state.today) });
}

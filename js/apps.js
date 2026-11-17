// Mini "aplicaciones" de las ventanas del escritorio: Mis documentos, Buscar, Propiedades, Papelera.
import { QUOTES } from '../lib/quotes.js';
import { quoteForDate, nextDateForQuote, cycleInfo, addDays } from '../lib/daily.js';

const FOLDER_DAYS = 30;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusBar(...texts) {
  const bar = el('div', 'status-bar');
  texts.forEach((text, i) => bar.append(el('div', `status-section${i === 0 ? ' grow' : ''}`, text)));
  return bar;
}

/** Fila seleccionable de una lista (clic selecciona, doble clic o Enter abre). */
function fileRow(cells, onOpen) {
  const row = el('button', 'file');
  row.type = 'button';
  row.setAttribute('role', 'option');
  row.append(el('span', 'file-icon'));
  cells.forEach(([cls, text]) => row.append(el('span', cls, text)));
  row.addEventListener('click', () => {
    row.parentElement.querySelectorAll('.file.selected').forEach((n) => n.classList.remove('selected'));
    row.classList.add('selected');
  });
  row.addEventListener('dblclick', onOpen);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter') onOpen(); });
  return row;
}

/**
 * @param wm   gestor de ventanas de desktop.js
 * @param ctx  { t(), lang(), seed(), today(), openQuote(iso) }
 */
export function createApps(wm, ctx) {
  let searchQuery = '';

  // ---------- Mis documentos ----------
  function renderFolder(body) {
    const t = ctx.t();
    const lang = ctx.lang();
    body.replaceChildren();
    const addr = el('div', 'address-bar');
    addr.append(el('span', '', t.folderAddress), el('span', 'field', t.folderPath));
    const head = el('div', 'file-head');
    head.append(el('span'), el('span', '', t.colName), el('span', '', t.colAuthor));
    const list = el('div', 'file-list');
    list.setAttribute('role', 'listbox');
    for (let i = 0; i < FOLDER_DAYS; i++) {
      const iso = addDays(ctx.today(), -i);
      list.append(fileRow(
        [['file-name', `${iso}.txt`], ['file-author', quoteForDate(iso, ctx.seed())[lang].author]],
        () => ctx.openQuote(iso),
      ));
    }
    body.append(addr, head, list, statusBar(t.folderObjects(FOLDER_DAYS), t.folderHint));
  }

  // ---------- Buscar citas ----------
  function renderSearch(body) {
    const t = ctx.t();
    const lang = ctx.lang();
    body.replaceChildren();

    const row = el('div', 'address-bar');
    const label = el('label', '', t.searchLabel);
    label.htmlFor = 'search-input';
    const input = el('input', 'field');
    input.id = 'search-input';
    input.type = 'search';
    input.placeholder = t.searchHint;
    input.autocomplete = 'off';
    input.value = searchQuery;
    row.append(label, input);

    const list = el('div', 'file-list');
    list.setAttribute('role', 'listbox');
    const status = statusBar('', t.folderHint);

    // Proxima fecha de cada cita, ordenadas cronologicamente.
    const upcoming = QUOTES
      .map((q, i) => ({ q, date: nextDateForQuote(i, ctx.today(), ctx.seed()) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const draw = () => {
      searchQuery = input.value;
      const needle = searchQuery.trim().toLowerCase();
      const hits = upcoming.filter(({ q }) => !needle
        || ['es', 'en'].some((l) => `${q[l].text} ${q[l].author}`.toLowerCase().includes(needle)));
      list.replaceChildren();
      hits.forEach(({ q, date }) => list.append(fileRow(
        [['file-name', q[lang].text], ['file-author', q[lang].author], ['file-date', `${t.searchNext} ${date}`]],
        () => ctx.openQuote(date),
      )));
      if (!hits.length) list.append(el('p', 'empty-note', t.searchEmpty));
      status.firstChild.textContent = t.searchCount(hits.length);
    };
    input.addEventListener('input', draw);
    body.append(row, list, status);
    draw();
  }

  // ---------- Propiedades del sistema ----------
  function renderSystem(body) {
    const t = ctx.t();
    const lang = ctx.lang();
    body.replaceChildren();
    const info = cycleInfo(ctx.today());
    const q = quoteForDate(ctx.today(), ctx.seed())[lang];
    const rows = [
      [t.sysCollection, String(QUOTES.length)],
      [t.sysCycle, `#${info.cycle}`],
      [t.sysDay, `${info.position} / ${info.length}`],
      [t.sysSeed, ctx.seed()],
      [t.sysLang, t.sysLangName],
      [t.sysToday, `"${q.text}" — ${q.author}`],
    ];
    const group = el('dl', 'props');
    rows.forEach(([k, v]) => group.append(el('dt', '', k), el('dd', '', v)));
    const buttons = el('div', 'dialog-buttons');
    const ok = el('button', 'btn', t.ok);
    ok.type = 'button';
    ok.addEventListener('click', () => wm.closeWindow('system'));
    buttons.append(ok);
    body.append(group, buttons);
  }

  // ---------- Papelera ----------
  function renderBin(body) {
    const t = ctx.t();
    body.replaceChildren();
    const empty = el('div', 'bin-empty');
    empty.append(el('div', 'bin-glyph'), el('p', '', t.binEmpty));
    const btn = el('button', 'btn', t.binButton);
    btn.type = 'button';
    btn.disabled = true;
    empty.append(btn);
    body.append(empty);
  }

  const defs = {
    folder: { width: 460, title: (t) => t.folderTitle, render: renderFolder },
    search: { width: 520, title: (t) => t.searchTitle, render: renderSearch },
    system: { width: 400, title: (t) => t.systemTitle, render: renderSystem },
    bin: { width: 340, title: (t) => t.binTitle, render: renderBin },
  };
  const mounted = new Map();

  return {
    open(id) {
      const def = defs[id];
      if (!mounted.has(id)) {
        const { body } = wm.createWindow(id, def.title(ctx.t()), { width: def.width });
        mounted.set(id, body);
        def.render(body);
      } else {
        defs[id].render(mounted.get(id));      // refresca (p. ej. cambio de dia)
      }
      wm.openWindow(id);
      mounted.get(id).querySelector('input, .file, button:not(:disabled)')?.focus?.({ preventScroll: true });
    },
    /** Vuelve a pintar las ventanas abiertas (cambio de idioma). */
    refresh() {
      mounted.forEach((body, id) => {
        defs[id].render(body);
        wm.setTitle(id, defs[id].title(ctx.t()));
      });
    },
  };
}

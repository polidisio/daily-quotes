// Escritorio retro: gestor de ventanas (mover, foco, minimizar, maximizar, cerrar),
// barra de tareas, menus desplegables, menu Inicio, reloj, iconos y dialogos.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const NARROW = window.matchMedia('(max-width: 720px)');

/** Cuadro de dialogo modal estilo Windows. Devuelve una promesa con el id del boton pulsado. */
export function showDialog({ title, message, buttons = [{ id: 'ok', label: 'OK' }] }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
      <div class="window dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <div class="title-bar"><span class="title-bar-text" id="dlg-title"></span></div>
        <div class="dialog-body">
          <div class="dialog-icon" aria-hidden="true">i</div>
          <p id="dlg-msg"></p>
        </div>
        <div class="dialog-buttons"></div>
      </div>`;
    $('#dlg-title', backdrop).textContent = title;
    $('#dlg-msg', backdrop).textContent = message;

    const previous = document.activeElement;
    const close = (id) => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previous?.focus?.();
      resolve(id);
    };
    const row = $('.dialog-buttons', backdrop);
    buttons.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', () => close(b.id));
      row.append(btn);
      if (i === 0) queueMicrotask(() => btn.focus());
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(buttons[buttons.length - 1].id); }
      if (e.key === 'Tab') {                       // atrapa el foco dentro del dialogo
        const f = $$('button', backdrop);
        const idx = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
  });
}

/**
 * @param {Record<string, () => void>} actions  Acciones de la app, enlazadas por data-action.
 */
export function initDesktop(actions) {
  const desktopEl = $('#desktop');
  const taskApps = $('#taskbar-apps');
  const startBtn = $('#start-button');
  const startMenu = $('#start-menu');

  const wins = new Map();          // id -> { el, btn, open, minimized, maximized }
  let zTop = 10;
  let cascade = 0;
  let activeId = null;
  let ctlLabels = { min: 'Minimize', max: 'Maximize', close: 'Close' };

  // ---------- Gestor de ventanas ----------
  function sync(id) {
    const w = wins.get(id);
    const visible = w.open && !w.minimized;
    w.el.hidden = !visible;
    w.el.classList.toggle('maximized', w.maximized);
    w.btn.hidden = !w.open;
    const isActive = visible && activeId === id;
    w.el.classList.toggle('active', isActive);
    w.btn.classList.toggle('active', isActive);
    w.btn.setAttribute('aria-pressed', String(isActive));
  }
  const syncAll = () => wins.forEach((_, id) => sync(id));

  function focusWindow(id) {
    const w = wins.get(id);
    if (!w || !w.open || w.minimized) return;
    activeId = id;
    w.el.style.zIndex = String(++zTop);
    syncAll();
  }
  function activateTopmost() {
    let best = null;
    for (const [id, w] of wins) {
      if (w.open && !w.minimized && (!best || +w.el.style.zIndex > +wins.get(best).el.style.zIndex)) best = id;
    }
    activeId = best;
  }
  function openWindow(id) {
    const w = wins.get(id);
    if (!w) return;
    w.open = true;
    w.minimized = false;
    focusWindow(id);
    w.el.focus({ preventScroll: true });
  }
  function minimizeWindow(id) {
    wins.get(id).minimized = true;
    if (activeId === id) activateTopmost();
    syncAll();
  }
  function closeWindow(id) {
    const w = wins.get(id);
    w.open = false;
    w.minimized = false;
    w.maximized = false;
    if (activeId === id) activateTopmost();
    syncAll();
  }
  function toggleMaximize(id) {
    const w = wins.get(id);
    w.maximized = !w.maximized;
    focusWindow(id);
  }

  /** Registra una ventana ya existente en el DOM (o recien creada) en el gestor. */
  function registerWindow(el, id, title, { startOpen = true } = {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn task-button';
    btn.textContent = title;
    taskApps.append(btn);

    const w = { el, btn, open: startOpen, minimized: false, maximized: false };
    wins.set(id, w);
    el.style.zIndex = String(++zTop);

    btn.addEventListener('click', () => {
      if (w.minimized || activeId !== id) openWindow(id);   // restaurar o traer al frente
      else minimizeWindow(id);
    });
    el.addEventListener('pointerdown', () => { if (activeId !== id) focusWindow(id); });

    const bar = $('.title-bar', el);
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('.title-bar-controls')) toggleMaximize(id); });
    el.addEventListener('click', (e) => {
      const ctl = e.target.closest('[data-ctl]');
      if (!ctl || !el.contains(ctl)) return;
      if (ctl.dataset.ctl === 'min') minimizeWindow(id);
      if (ctl.dataset.ctl === 'max') toggleMaximize(id);
      if (ctl.dataset.ctl === 'close') closeWindow(id);
    });

    // Arrastrar
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.title-bar-controls') || w.maximized || NARROW.matches || e.button !== 0) return;
      const r = el.getBoundingClientRect();
      el.classList.add('moved');               // pasa de centrado por CSS a coordenadas absolutas
      el.style.left = `${r.left}px`;
      el.style.top = `${r.top}px`;
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 28 - 30;   // sin tapar la barra de tareas
      el.style.left = `${Math.min(Math.max(e.clientX - drag.dx, 80 - el.offsetWidth), maxX)}px`;
      el.style.top = `${Math.min(Math.max(e.clientY - drag.dy, 0), maxY)}px`;
    });
    const endDrag = () => { drag = null; };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    if (startOpen) activeId = id;
    setCtlLabels(ctlLabels);
    syncAll();
    return w;
  }

  /** Crea una ventana de aplicacion con barra de titulo y cuerpo vacio. */
  function createWindow(id, title, { width = 420 } = {}) {
    const el = document.createElement('section');
    el.className = 'window app-window';
    el.id = `win-${id}`;
    el.tabIndex = -1;
    el.setAttribute('aria-label', title);
    el.style.width = `min(${width}px, calc(100vw - 100px))`;
    const off = (cascade++ % 6) * 26;
    el.style.left = `${110 + off}px`;
    el.style.top = `${50 + off}px`;
    el.innerHTML = `
      <div class="title-bar">
        <span class="title-bar-text"></span>
        <div class="title-bar-controls">
          <button type="button" class="title-bar-btn" data-ctl="min">_</button>
          <button type="button" class="title-bar-btn" data-ctl="max">&#9633;</button>
          <button type="button" class="title-bar-btn" data-ctl="close">&times;</button>
        </div>
      </div>
      <div class="app-body"></div>`;
    $('.title-bar-text', el).textContent = title;
    desktopEl.append(el);
    registerWindow(el, id, title, { startOpen: false });
    return { el, body: $('.app-body', el) };
  }

  function setTitle(id, title) {
    const w = wins.get(id);
    if (!w) return;
    const text = $('.title-bar-text', w.el);
    if (text && w.el.classList.contains('app-window')) text.textContent = title;
    w.btn.textContent = title;
  }
  function setCtlLabels(labels) {
    ctlLabels = labels;
    $$('[data-ctl]').forEach((b) => {
      const l = labels[b.dataset.ctl];
      b.setAttribute('aria-label', l);
      b.title = l;
    });
  }

  registerWindow($('#wordpad'), 'wordpad', $('#wp-title').textContent);

  // ---------- Menus desplegables ----------
  const menus = $$('.menu');
  const closeMenus = () => menus.forEach((m) => {
    m.classList.remove('open');
    $('.menu-label', m).setAttribute('aria-expanded', 'false');
  });
  const openMenu = (m) => {
    closeMenus();
    m.classList.add('open');
    $('.menu-label', m).setAttribute('aria-expanded', 'true');
  };
  menus.forEach((m) => {
    const label = $('.menu-label', m);
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      m.classList.contains('open') ? closeMenus() : openMenu(m);
    });
    label.addEventListener('pointerenter', () => {
      if (menus.some((x) => x.classList.contains('open')) && !m.classList.contains('open')) openMenu(m);
    });
  });

  // ---------- Menu Inicio ----------
  const closeStart = () => {
    startMenu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
    startBtn.classList.remove('active');
  };
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = startMenu.hidden;
    closeMenus();
    startMenu.hidden = !willOpen;
    startBtn.setAttribute('aria-expanded', String(willOpen));
    startBtn.classList.toggle('active', willOpen);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu')) closeMenus();
    if (!e.target.closest('#start-menu') && !e.target.closest('#start-button')) closeStart();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenus(); closeStart(); }
  });

  // ---------- Acciones (menus, barra de herramientas, Inicio) ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    closeMenus();
    closeStart();
    actions[el.dataset.action]?.();
  });

  // ---------- Iconos del escritorio ----------
  const icons = $$('.desktop-icon');
  const select = (icon) => icons.forEach((i) => i.classList.toggle('selected', i === icon));
  icons.forEach((icon) => {
    icon.addEventListener('click', (e) => { e.stopPropagation(); select(icon); closeStart(); });
    const run = () => actions[`open-${icon.dataset.open}`]?.();
    icon.addEventListener('dblclick', run);
    icon.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  });
  desktopEl.addEventListener('click', (e) => { if (e.target === desktopEl) select(null); });

  // ---------- Reloj ----------
  const clock = $('#clock');
  const tickClock = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
  };
  tickClock();
  setInterval(tickClock, 15_000);

  return {
    createWindow,
    openWindow,
    closeWindow,
    isOpen: (id) => wins.get(id)?.open ?? false,
    has: (id) => wins.has(id),
    setTitle,
    setCtlLabels,
    setClockTitle: (text) => { clock.title = text; },
  };
}

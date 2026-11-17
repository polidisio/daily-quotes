// Comportamiento del "escritorio" retro: ventana (mover/minimizar/maximizar/cerrar),
// menus desplegables, menu Inicio, reloj, iconos y cuadros de dialogo.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const NARROW = window.matchMedia('(max-width: 720px)');

/** Cuadro de dialogo modal estilo Windows. Devuelve una promesa con el boton pulsado. */
export function showDialog({ title, message, buttons = [{ id: 'ok', label: 'OK' }] }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
      <div class="window dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <div class="title-bar"><span class="title-bar-text" id="dlg-title"></span></div>
        <div class="dialog-body">
          <div class="dialog-icon" aria-hidden="true">!</div>
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
      if (e.key === 'Tab') {   // atrapa el foco dentro del dialogo
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
  const win = $('#wordpad');
  const taskBtn = $('#task-wordpad');
  const startBtn = $('#start-button');
  const startMenu = $('#start-menu');
  const state = { open: true, minimized: false, maximized: false };

  // ---------- Ventana ----------
  function syncWindow() {
    win.hidden = !state.open || state.minimized;
    win.classList.toggle('maximized', state.maximized);
    taskBtn.hidden = !state.open;
    taskBtn.classList.toggle('active', state.open && !state.minimized);
    taskBtn.setAttribute('aria-pressed', String(state.open && !state.minimized));
  }
  const windowActions = {
    minimize() { state.minimized = true; syncWindow(); },
    maximize() { state.maximized = !state.maximized; syncWindow(); },
    close() { state.open = false; state.minimized = false; syncWindow(); },
    open() { state.open = true; state.minimized = false; syncWindow(); win.focus(); },
    toggle() { state.minimized ? windowActions.open() : windowActions.minimize(); },
  };
  taskBtn.addEventListener('click', windowActions.toggle);
  $('.title-bar', win).addEventListener('dblclick', (e) => {
    if (!e.target.closest('.title-bar-controls')) windowActions.maximize();
  });

  // ---------- Arrastrar ----------
  const bar = $('.title-bar', win);
  let drag = null;
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.title-bar-controls') || state.maximized || NARROW.matches || e.button !== 0) return;
    const r = win.getBoundingClientRect();
    win.classList.add('moved');             // pasa de centrado por CSS a coordenadas absolutas
    win.style.left = `${r.left}px`;
    win.style.top = `${r.top}px`;
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 28 - 30;   // sin tapar la barra de tareas
    win.style.left = `${Math.min(Math.max(e.clientX - drag.dx, 80 - win.offsetWidth), maxX)}px`;
    win.style.top = `${Math.min(Math.max(e.clientY - drag.dy, 0), maxY)}px`;
  });
  const endDrag = () => { drag = null; };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

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
  const closeStart = () => { startMenu.hidden = true; startBtn.setAttribute('aria-expanded', 'false'); startBtn.classList.remove('active'); };
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
    if (!e.target.closest('#start-menu')) closeStart();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenus(); closeStart(); }
  });

  // ---------- Acciones (menus, barra de herramientas, controles) ----------
  const all = { ...actions, ...windowActions, 'open-window': windowActions.open };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    closeMenus();
    closeStart();
    all[el.dataset.action]?.();
  });

  // ---------- Iconos del escritorio ----------
  const icons = $$('.desktop-icon');
  const select = (icon) => icons.forEach((i) => i.classList.toggle('selected', i === icon));
  icons.forEach((icon) => {
    icon.addEventListener('click', (e) => { e.stopPropagation(); select(icon); });
    const run = () => (icon.dataset.open === 'wordpad' ? windowActions.open() : actions.unavailable?.());
    icon.addEventListener('dblclick', run);
    icon.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  });
  $('#desktop').addEventListener('click', () => select(null));

  // ---------- Reloj ----------
  const clock = $('#clock');
  const tickClock = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
  };
  tickClock();
  setInterval(tickClock, 15_000);

  syncWindow();
  return { setClockTitle: (text) => { clock.title = text; } };
}

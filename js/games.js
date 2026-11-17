// Calculadora y Buscaminas (interfaz). La logica vive en lib/calc.js y lib/minesweeper.js.
import { initial, press } from '../lib/calc.js';
import { createGame, reveal, toggleFlag } from '../lib/minesweeper.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- Calculadora ----------
const CALC_KEYS = [
  ['←', 'back'], ['C', 'C'], ['%', '%'], ['÷', '/'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
  ['±', 'neg'], ['0', '0'], ['.', '.'], ['=', '='],
];
const KEYBOARD = { ',': '.', Enter: '=', Backspace: 'back', Escape: 'C', Delete: 'C' };

export function createCalculator(body) {
  body.replaceChildren();
  body.classList.add('calc');
  let state = initial();

  const display = el('output', 'calc-display', state.display);
  display.setAttribute('aria-live', 'polite');
  const grid = el('div', 'calc-grid');
  const draw = () => { display.textContent = state.display; };
  const send = (key) => { state = press(state, key); draw(); };

  CALC_KEYS.forEach(([label, key]) => {
    const b = el('button', `btn calc-key${/[0-9.]/.test(key) ? '' : ' op'}`, label);
    b.type = 'button';
    b.addEventListener('click', () => send(key));
    grid.append(b);
  });
  body.append(display, grid);

  // Teclado: solo cuando el foco esta dentro de esta ventana
  body.closest('.window').addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && e.target.closest('button')) return;   // el boton ya hace clic
    const key = KEYBOARD[e.key] ?? e.key;
    if (/^[0-9.+\-*/=]$/.test(key) || ['back', 'C'].includes(key)) {
      e.preventDefault();
      send(key);
    }
  });
  return { update() {} };
}

// ---------- Buscaminas ----------
export function createMinesweeper(body, ctx) {
  body.replaceChildren();
  body.classList.add('mines');
  let game = createGame();
  let flagMode = false;
  let seconds = 0;
  let timer = null;

  const lcd = (n) => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
  const mineCount = el('output', 'lcd');
  const timeCount = el('output', 'lcd');
  const face = el('button', 'btn face');
  face.type = 'button';
  const grid = el('div', 'mine-grid');
  grid.style.gridTemplateColumns = `repeat(${game.cols}, 24px)`;
  grid.setAttribute('role', 'grid');
  const flagBtn = el('button', 'btn');
  flagBtn.type = 'button';
  flagBtn.setAttribute('aria-pressed', 'false');
  const status = el('p', 'mines-status');
  status.setAttribute('role', 'status');

  const header = el('div', 'mines-header');
  header.append(mineCount, face, timeCount);
  const footer = el('div', 'mines-footer');
  footer.append(flagBtn, status);
  body.append(header, grid, footer);

  const stopTimer = () => { clearInterval(timer); timer = null; };
  const startTimer = () => {
    if (timer) return;
    timer = setInterval(() => { seconds++; timeCount.textContent = lcd(seconds); }, 1000);
  };

  function cellLabel(c, i) {
    const t = ctx.t();
    const pos = `${t.minesCell} ${Math.floor(i / game.cols) + 1},${(i % game.cols) + 1}`;
    if (c.flagged) return `${pos}: flag`;
    if (!c.revealed) return pos;
    return c.mine ? `${pos}: mine` : `${pos}: ${c.adj}`;
  }

  function draw() {
    const t = ctx.t();
    mineCount.textContent = lcd(game.mines - game.flags);
    timeCount.textContent = lcd(seconds);
    face.textContent = { won: 'B)', lost: 'X(' }[game.status] ?? ':)';
    face.title = t.minesNew;
    face.setAttribute('aria-label', t.minesNew);
    flagBtn.textContent = t.minesFlag;
    flagBtn.setAttribute('aria-pressed', String(flagMode));
    flagBtn.classList.toggle('pressed', flagMode);
    status.textContent = { won: t.minesWin, lost: t.minesLose }[game.status] ?? t.minesHint;

    grid.replaceChildren(...game.cells.map((c, i) => {
      const b = el('button', 'cell');
      b.type = 'button';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', cellLabel(c, i));
      if (c.revealed) {
        b.classList.add('open');
        if (c.mine) b.classList.add('mine', ...(c.boom ? ['boom'] : []));
        else if (c.adj) { b.classList.add(`n${c.adj}`); b.textContent = String(c.adj); }
      } else if (c.flagged) {
        b.classList.add('flag');
        if (game.status === 'lost' && !c.mine) b.classList.add('wrong');
      }
      return b;
    }));
  }

  function act(i, flag) {
    const before = game.status;
    if (flag) toggleFlag(game, i); else reveal(game, i);
    if (before === 'ready' && game.status === 'playing') startTimer();
    if (game.status === 'won' || game.status === 'lost') stopTimer();
    draw();
    grid.querySelector(`[data-i="${i}"]`)?.focus({ preventScroll: true });
  }

  function newGame() {
    stopTimer();
    game = createGame();
    seconds = 0;
    draw();
  }

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.cell');
    if (c) act(Number(c.dataset.i), flagMode);
  });
  grid.addEventListener('contextmenu', (e) => {
    const c = e.target.closest('.cell');
    if (!c) return;
    e.preventDefault();
    act(Number(c.dataset.i), true);
  });
  grid.addEventListener('keydown', (e) => {
    const c = e.target.closest('.cell');
    if (c && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); act(Number(c.dataset.i), true); }
  });
  face.addEventListener('click', newGame);
  flagBtn.addEventListener('click', () => { flagMode = !flagMode; draw(); });

  draw();
  return { update: draw };
}

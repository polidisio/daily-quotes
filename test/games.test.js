import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, press } from '../lib/calc.js';
import { createGame, reveal, toggleFlag, neighbors } from '../lib/minesweeper.js';

const keys = (seq) => seq.split(' ').reduce(press, initial()).display;

test('calc: aritmetica basica y encadenada', () => {
  assert.equal(keys('1 2 + 3 ='), '15');
  assert.equal(keys('2 + 3 * 4 ='), '20');          // encadenado, como una calculadora clasica
  assert.equal(keys('9 / 4 ='), '2.25');
  assert.equal(keys('0 . 1 + 0 . 2 ='), '0.3');       // sin error de coma flotante visible
});
test('calc: errores, borrar, signo, porcentaje', () => {
  assert.equal(keys('5 / 0 ='), 'Error');
  assert.equal(keys('5 / 0 = 7'), '7');
  assert.equal(keys('5 / 0 = +'), 'Error');
  assert.equal(keys('1 2 3 back back'), '1');
  assert.equal(keys('1 2 3 C'), '0');
  assert.equal(keys('5 neg'), '-5');
  assert.equal(keys('5 neg neg'), '5');
  assert.equal(keys('2 0 0 + 1 0 %'), '20');
  assert.equal(keys('2 + * 3 ='), '6');               // cambiar operador
  assert.equal(keys('. 5 .'), '0.5');
});
test('calc: limite de digitos', () => {
  assert.equal(keys('1 2 3 4 5 6 7 8 9 0 1 2 3 4').replace('-', '').length, 12);
});

// RNG determinista
const lcg = (s = 1) => () => (s = (s * 48271) % 2147483647) / 2147483647;

test('buscaminas: el primer clic nunca es mina y abre zona', () => {
  for (let seed = 1; seed < 50; seed++) {
    const g = createGame({ rng: lcg(seed) });
    reveal(g, 40);
    assert.equal(g.status, 'playing');
    assert.equal(g.cells[40].mine, false);
    assert.equal(g.cells[40].adj, 0);
    assert.equal(g.cells.filter((c) => c.mine).length, 10);
    assert.ok(g.revealedCount > 1);
  }
});
test('buscaminas: pisar mina pierde y muestra minas; bandera bloquea', () => {
  const g = createGame({ rng: lcg(3) });
  reveal(g, 0);
  const mine = g.cells.findIndex((c) => c.mine);
  toggleFlag(g, mine);
  reveal(g, mine);
  assert.equal(g.status, 'playing');                  // casilla con bandera: no se abre
  toggleFlag(g, mine);
  reveal(g, mine);
  assert.equal(g.status, 'lost');
  assert.ok(g.cells[mine].boom);
  assert.ok(g.cells.filter((c) => c.mine).every((c) => c.revealed));
});
test('buscaminas: abrir todas las casillas seguras gana', () => {
  const g = createGame({ rng: lcg(7) });
  reveal(g, 0);
  g.cells.forEach((c, i) => { if (!c.mine) reveal(g, i); });
  assert.equal(g.status, 'won');
  assert.equal(g.revealedCount, 71);
});
test('buscaminas: adyacencia', () => {
  const g = createGame();
  assert.equal(neighbors(g, 0).length, 3);
  assert.equal(neighbors(g, 40).length, 8);
});

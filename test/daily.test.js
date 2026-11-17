import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidISODate, addDays, dayNumber, quoteIndexForDate, quoteForDate, localISODate,
  nextDateForQuote, cycleInfo, noteColorForDate, NOTE_COLORS,
} from '../lib/daily.js';
import { QUOTES } from '../lib/quotes.js';

const N = QUOTES.length;
// primer dia (ISO) de un ciclo concreto
const cycleStart = (cycle) => addDays('1970-01-01', cycle * N);

test('isValidISODate', () => {
  assert.equal(isValidISODate('2026-02-28'), true);
  assert.equal(isValidISODate('2026-02-30'), false);
  assert.equal(isValidISODate('2026-2-3'), false);
  assert.equal(isValidISODate(null), false);
});

test('addDays cruza meses y años', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('localISODate usa la fecha local, no UTC', () => {
  assert.equal(localISODate(new Date(2026, 5, 1, 0, 30)), '2026-06-01');
});

test('determinista: misma fecha y semilla, misma cita', () => {
  assert.equal(quoteIndexForDate('2026-11-17'), quoteIndexForDate('2026-11-17'));
});

test('cada ciclo contiene todas las citas exactamente una vez', () => {
  for (const c of [100, 101, 20000]) {
    const seen = new Set();
    for (let i = 0; i < N; i++) seen.add(quoteIndexForDate(addDays(cycleStart(c), i)));
    assert.equal(seen.size, N);
  }
});

test('el orden cambia entre ciclos', () => {
  const order = (c) => Array.from({ length: N }, (_, i) => quoteIndexForDate(addDays(cycleStart(c), i))).join();
  assert.notEqual(order(100), order(101));
  assert.notEqual(order(101), order(102));
});

test('la semilla cambia el orden', () => {
  const order = (seed) => Array.from({ length: N }, (_, i) => quoteIndexForDate(addDays('2026-01-01', i), seed)).join();
  assert.notEqual(order('a'), order('b'));
});

test('nunca se repite la misma cita dos dias seguidos (1500 dias, varias semillas)', () => {
  for (const seed of ['daily-quotes', 'x', 'semilla']) {
    let prev = quoteIndexForDate('2026-01-01', seed);
    for (let i = 1; i < 1500; i++) {
      const cur = quoteIndexForDate(addDays('2026-01-01', i), seed);
      assert.notEqual(cur, prev, `${seed} dia ${i}`);
      prev = cur;
    }
  }
});

test('distribucion: no es secuencial', () => {
  let sequential = 0;
  for (let i = 0; i < 200; i++) {
    const a = quoteIndexForDate(addDays('2026-01-01', i));
    const b = quoteIndexForDate(addDays('2026-01-01', i + 1));
    if (b === (a + 1) % N) sequential++;
  }
  assert.ok(sequential < 20, `demasiado secuencial: ${sequential}`);
});

test('nextDateForQuote encuentra la fecha y coincide', () => {
  for (const idx of [0, 7, N - 1]) {
    const d = nextDateForQuote(idx, '2026-11-17');
    assert.equal(quoteIndexForDate(d), idx);
    assert.ok(dayNumber(d) >= dayNumber('2026-11-17'));
  }
});

test('cycleInfo y color de nota', () => {
  const { position, length } = cycleInfo('2026-11-17');
  assert.ok(position >= 1 && position <= length);
  assert.ok(NOTE_COLORS.includes(noteColorForDate('2026-11-17')));
  const colors = new Set(Array.from({ length: 60 }, (_, i) => noteColorForDate(addDays('2026-01-01', i))));
  assert.ok(colors.size >= 5);
});

test('todas las citas tienen es y en completos', () => {
  for (const q of QUOTES) for (const l of ['es', 'en']) assert.ok(q[l].text && q[l].author, JSON.stringify(q));
  assert.equal(quoteForDate('2026-01-01').es.text.length > 0, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidISODate, addDays, dayNumber, quoteForDate, localISODate } from '../lib/daily.js';
import { QUOTES } from '../lib/quotes.js';

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

test('la rotacion no se reinicia el 1 de enero', () => {
  assert.equal(dayNumber('2027-01-01') - dayNumber('2026-12-31'), 1);
  const a = quoteForDate('2026-12-31');
  const b = quoteForDate('2027-01-01');
  assert.notEqual(a, b);
});

test('la rotacion recorre todas las citas sin repetir en un ciclo', () => {
  const seen = new Set();
  for (let i = 0; i < QUOTES.length; i++) seen.add(quoteForDate(addDays('2026-01-01', i)));
  assert.equal(seen.size, QUOTES.length);
});

test('localISODate usa la fecha local, no UTC', () => {
  assert.equal(localISODate(new Date(2026, 5, 1, 0, 30)), '2026-06-01');
});

test('todas las citas tienen es y en completos', () => {
  for (const q of QUOTES) for (const l of ['es', 'en']) {
    assert.ok(q[l].text && q[l].author, JSON.stringify(q));
  }
});

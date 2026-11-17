// Maquina de estados de la calculadora (sin DOM, sin eval).
// press(state, key) -> nuevo estado. Teclas: '0'-'9', '.', '+', '-', '*', '/', '=', 'C', 'neg', '%', 'back'.
const MAX_DIGITS = 12;
const OPS = new Set(['+', '-', '*', '/']);

export const initial = () => ({ display: '0', acc: null, op: null, fresh: true, error: false });

function format(n) {
  if (!Number.isFinite(n)) return null;
  return String(parseFloat(n.toPrecision(MAX_DIGITS)));
}
function apply(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
    default: return b;
  }
}
const fail = () => ({ display: 'Error', acc: null, op: null, fresh: true, error: true });

export function press(s, key) {
  if (key === 'C') return initial();
  if (s.error) {
    if (/^[0-9.]$/.test(key)) s = initial();
    else return s;
  }
  const value = parseFloat(s.display);

  if (/^[0-9]$/.test(key)) {
    if (s.fresh) return { ...s, display: key, fresh: false };
    if (s.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return s;
    return { ...s, display: s.display === '0' ? key : s.display + key };
  }
  if (key === '.') {
    if (s.fresh) return { ...s, display: '0.', fresh: false };
    return s.display.includes('.') ? s : { ...s, display: `${s.display}.` };
  }
  if (OPS.has(key)) {
    if (s.op && !s.fresh) {                       // encadenar: 2 + 3 + ...
      const r = format(apply(s.acc, s.op, value));
      if (r === null) return fail();
      return { display: r, acc: parseFloat(r), op: key, fresh: true, error: false };
    }
    return { ...s, acc: s.op ? s.acc : value, op: key, fresh: true };  // cambiar de operador
  }
  if (key === '=') {
    if (!s.op) return { ...s, fresh: true };
    const r = format(apply(s.acc, s.op, value));
    if (r === null) return fail();
    return { display: r, acc: null, op: null, fresh: true, error: false };
  }
  if (key === 'neg') {
    if (s.display === '0') return s;
    return { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : `-${s.display}` };
  }
  if (key === '%') {
    const base = s.acc !== null ? s.acc * value : value;
    const r = format(base / 100);
    return r === null ? fail() : { ...s, display: r, fresh: false };
  }
  if (key === 'back') {
    if (s.fresh) return s;
    const d = s.display;
    const next = d.length > 1 && !(d.length === 2 && d.startsWith('-')) ? d.slice(0, -1) : '0';
    return { ...s, display: next };
  }
  return s;
}

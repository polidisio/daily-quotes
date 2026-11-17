// Logica pura del Buscaminas (sin DOM). El estado se muta en sitio.
// status: 'ready' (sin mover) | 'playing' | 'won' | 'lost'

export function createGame({ rows = 9, cols = 9, mines = 10, rng = Math.random } = {}) {
  return {
    rows, cols, mines, rng,
    status: 'ready',
    revealedCount: 0,
    flags: 0,
    cells: Array.from({ length: rows * cols }, () => ({ mine: false, adj: 0, revealed: false, flagged: false, boom: false })),
  };
}

export function neighbors(g, i) {
  const r = Math.floor(i / g.cols);
  const c = i % g.cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < g.rows && cc >= 0 && cc < g.cols) out.push(rr * g.cols + cc);
    }
  }
  return out;
}

// Las minas se colocan en el primer clic, evitando esa casilla y sus vecinas (primer clic siempre abre zona).
function placeMines(g, safe) {
  const banned = new Set([safe, ...neighbors(g, safe)]);
  const pool = [];
  for (let i = 0; i < g.cells.length; i++) if (!banned.has(i)) pool.push(i);
  const count = Math.min(g.mines, pool.length);
  for (let k = 0; k < count; k++) {
    const j = k + Math.floor(g.rng() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    g.cells[pool[k]].mine = true;
  }
  g.cells.forEach((cell, i) => { cell.adj = neighbors(g, i).filter((n) => g.cells[n].mine).length; });
}

export function reveal(g, i) {
  if (g.status === 'won' || g.status === 'lost') return g;
  const cell = g.cells[i];
  if (cell.revealed || cell.flagged) return g;
  if (g.status === 'ready') { placeMines(g, i); g.status = 'playing'; }

  if (cell.mine) {
    cell.boom = true;
    g.status = 'lost';
    g.cells.forEach((c) => { if (c.mine) c.revealed = true; });
    return g;
  }
  const stack = [i];                                  // relleno de zonas vacias
  while (stack.length) {
    const k = stack.pop();
    const c = g.cells[k];
    if (c.revealed || c.flagged) continue;
    c.revealed = true;
    g.revealedCount++;
    if (c.adj === 0) neighbors(g, k).forEach((n) => { if (!g.cells[n].revealed) stack.push(n); });
  }
  if (g.revealedCount === g.cells.length - g.mines) {
    g.status = 'won';
    g.cells.forEach((c) => { if (c.mine && !c.flagged) { c.flagged = true; g.flags++; } });
  }
  return g;
}

export function toggleFlag(g, i) {
  if (g.status === 'won' || g.status === 'lost') return g;
  const c = g.cells[i];
  if (c.revealed) return g;
  c.flagged = !c.flagged;
  g.flags += c.flagged ? 1 : -1;
  return g;
}

// Citas favoritas y papelera. Se guardan por indice en QUOTES (por eso las citas nuevas se anaden al final).
import { QUOTES } from '../lib/quotes.js';

const KEY = 'favorites:v1';

export function createFavorites(store) {
  const valid = (list) => [...new Set((Array.isArray(list) ? list : []).filter((n) => Number.isInteger(n) && n >= 0 && n < QUOTES.length))];
  let data = { active: [], bin: [] };
  try {
    const raw = JSON.parse(store.get(KEY) || 'null');
    if (raw) data = { active: valid(raw.active), bin: valid(raw.bin).filter((n) => !raw.active?.includes(n)) };
  } catch { /* datos corruptos: empezar vacio */ }

  const subs = new Set();
  const commit = () => {
    store.set(KEY, JSON.stringify(data));
    subs.forEach((fn) => fn());
  };

  return {
    active: () => [...data.active],
    bin: () => [...data.bin],
    has: (i) => data.active.includes(i),
    add(i) {
      data.bin = data.bin.filter((n) => n !== i);
      if (!data.active.includes(i)) data.active.push(i);
      commit();
    },
    /** Quitar de favoritas = enviar a la papelera. */
    remove(i) {
      if (!data.active.includes(i)) return;
      data.active = data.active.filter((n) => n !== i);
      data.bin.push(i);
      commit();
    },
    restore(i) { if (data.bin.includes(i)) this.add(i); },
    purge() { data.bin = []; commit(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

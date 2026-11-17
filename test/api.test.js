import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/save-quote.js';

const today = new Date().toISOString().slice(0, 10);

function run(req) {
  return new Promise((resolve) => {
    const res = {
      headers: {}, code: 200,
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(b) { resolve({ code: this.code, body: b }); },
    };
    handler(req, res);
  });
}

function mockFetch(responses) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.json };
  };
  return calls;
}

test.beforeEach(() => {
  process.env.NOTION_API_KEY = 'k';
  process.env.NOTION_DATABASE_ID = 'db';
});

test('rechaza metodos distintos de POST', async () => {
  const r = await run({ method: 'GET' });
  assert.equal(r.code, 405);
});

test('rechaza fechas invalidas o fuera de rango', async () => {
  assert.equal((await run({ method: 'POST', body: { date: 'hoy' } })).code, 400);
  assert.equal((await run({ method: 'POST', body: { date: '2000-01-01' } })).code, 400);
  assert.equal((await run({ method: 'POST', body: '{no json' })).code, 400);
});

test('config ausente -> 500 sin filtrar detalles', async () => {
  delete process.env.NOTION_API_KEY;
  const r = await run({ method: 'POST', body: { date: today } });
  assert.equal(r.code, 500);
  assert.deepEqual(r.body, { error: 'server_not_configured' });
});

test('crea la pagina si no existe para esa fecha', async () => {
  const calls = mockFetch([{ status: 200, json: { results: [] } }, { status: 200, json: { url: 'https://n/x' } }]);
  const r = await run({ method: 'POST', body: { date: today, quote_es: 'IGNORADO' } });
  assert.equal(r.code, 200);
  assert.equal(r.body.duplicate, false);
  assert.match(calls[0].url, /databases\/db\/query/);
  assert.match(calls[1].url, /\/pages$/);
  assert.notEqual(calls[1].body.properties.Cita.rich_text[0].text.content, 'IGNORADO');
  assert.equal(calls[1].body.properties.Fecha.date.start, today);
});

test('no duplica si ya existe', async () => {
  const calls = mockFetch([{ status: 200, json: { results: [{ url: 'https://n/old' }] } }]);
  const r = await run({ method: 'POST', body: { date: today } });
  assert.equal(r.body.duplicate, true);
  assert.equal(calls.length, 1);
});

test('error de Notion -> solo codigo al cliente', async () => {
  mockFetch([{ status: 404, json: { code: 'object_not_found', message: 'secreto interno' } }]);
  const r = await run({ method: 'POST', body: { date: today } });
  assert.equal(r.code, 404);
  assert.deepEqual(r.body, { error: 'notion_error', code: 'object_not_found' });
});

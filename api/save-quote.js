// POST /api/save-quote  { date: "YYYY-MM-DD" }
// Guarda la cita del dia en la base de datos de Notion.
//  - El servidor elige la cita (el cliente solo indica la fecha): nadie puede escribir texto arbitrario.
//  - Idempotente: si ya existe una pagina con esa fecha no crea otra.
//  - Same-origin: no se abre CORS.
import { isValidISODate, dayNumber, quoteForDate } from '../lib/daily.js';

const NOTION_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';
const TIMEOUT_MS = 8000;
// Zonas horarias desde UTC-12 hasta UTC+14: la fecha del cliente puede diferir ~1-2 dias de la del servidor.
const MAX_DAY_DRIFT = 2;

function readBody(req) {
  const b = req.body;
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return null; }
  }
  return b && typeof b === 'object' ? b : null;
}

function notionFetch(path, apiKey, body) {
  return fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function buildPage(dbId, date, quote) {
  const { es, en } = quote;
  const short = es.text.length > 40 ? `${es.text.slice(0, 40)}...` : es.text;
  const paragraph = (content) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content } }] },
  });
  return {
    parent: { database_id: dbId },
    properties: {
      Nombre: { title: [{ text: { content: `"${short}"` } }] },
      Cita: { rich_text: [{ text: { content: es.text } }] },
      Autor: { rich_text: [{ text: { content: es.author || 'Desconocido' } }] },
      Fecha: { date: { start: date } },
      Idioma: { select: { name: 'Bilingüe' } },
    },
    // La version en ingles antes se descartaba; ahora queda en el cuerpo de la pagina.
    children: [paragraph(`"${en.text}" - ${en.author}`)],
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = readBody(req);
  const date = body?.date;
  if (!isValidISODate(date)) {
    return res.status(400).json({ error: 'invalid_date' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (Math.abs(dayNumber(date) - dayNumber(today)) > MAX_DAY_DRIFT) {
    return res.status(400).json({ error: 'date_out_of_range' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !dbId) {
    console.error('save-quote: faltan NOTION_API_KEY o NOTION_DATABASE_ID');
    return res.status(500).json({ error: 'server_not_configured' });
  }

  try {
    // 1) Deduplicar por fecha
    const existing = await notionFetch(`/databases/${dbId}/query`, apiKey, {
      filter: { property: 'Fecha', date: { equals: date } },
      page_size: 1,
    });
    if (!existing.ok) throw await notionError(existing);
    const found = (await existing.json()).results?.[0];
    if (found) {
      return res.status(200).json({ success: true, duplicate: true, url: found.url });
    }

    // 2) Crear la pagina
    const created = await notionFetch('/pages', apiKey, buildPage(dbId, date, quoteForDate(date)));
    if (!created.ok) throw await notionError(created);
    const page = await created.json();
    return res.status(200).json({ success: true, duplicate: false, url: page.url });
  } catch (err) {
    // El detalle va a los logs de Vercel; al cliente solo un codigo.
    console.error('save-quote:', err.notionStatus ?? '', err.notionCode ?? '', err.message);
    const status = err.notionStatus && err.notionStatus < 500 ? err.notionStatus : 502;
    return res.status(status).json({ error: 'notion_error', code: err.notionCode ?? null });
  }
}

async function notionError(response) {
  let code = null;
  let message = `HTTP ${response.status}`;
  try {
    const j = await response.json();
    code = j.code ?? null;
    message = j.message ?? message;
  } catch { /* cuerpo no JSON */ }
  const e = new Error(message);
  e.notionStatus = response.status;
  e.notionCode = code;
  return e;
}

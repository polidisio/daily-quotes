# daily-quotes

Una cita nueva cada día con estética de Windows 98 (WordPad). Desplegada en Vercel; opcionalmente guarda la cita del día en una base de datos de Notion.

## Estructura

```
index.html          Maquetación
css/style.css       Estilos retro (variables CSS para el bisel y los colores)
js/app.js           Cita del día, navegación por días, idioma, copiar, guardado en Notion
js/desktop.js       Escritorio: ventana movible, menús, barra de tareas, diálogos
js/i18n.js          Textos es/en
lib/quotes.js       Citas (bilingües). Añade nuevas AL FINAL del array
lib/daily.js        Fechas y selección de cita (compartido por navegador y API)
api/save-quote.js   Función serverless: guarda en Notion
test/               Tests con node:test
```

## Cómo se elige la cita

`quoteForDate(fecha)` usa el número de día desde 1970 módulo el número de citas: es determinista, no se reinicia en año nuevo y usa la fecha **local** del visitante.

## Desarrollo local

```bash
npm run dev     # http://localhost:3000 (necesita servidor: los módulos ES no cargan desde file://)
npm test        # tests de lógica de fechas y de la API
```

En local `/api/save-quote` no existe (devuelve 404 y la barra de estado muestra "Error al guardar"); es esperado. Añade `?debug` a la URL para ver el detalle del error. Para probar la API completa: `npx vercel dev`.

## Notion (opcional)

Variables de entorno en Vercel:

| Variable | Descripción |
|---|---|
| `NOTION_API_KEY` | Token de la integración |
| `NOTION_DATABASE_ID` | ID de la base de datos "Citas Diarias" |

Propiedades esperadas: `Nombre` (title), `Cita` (texto), `Autor` (texto), `Fecha` (fecha), `Idioma` (select).

La API recibe solo `{ "date": "YYYY-MM-DD" }`; el servidor elige la cita, no crea duplicados para una misma fecha y no devuelve detalles internos de Notion al cliente (van a los logs de Vercel).

## Interacción

- Flechas izquierda/derecha: día anterior/siguiente. Menú Ver: Hoy, idioma.
- Archivo > Guardar en Notion, Editar > Copiar cita.
- Ventana movible (arrastrar la barra de título), minimizar, maximizar y cerrar; doble clic en el icono de documentos para reabrirla.

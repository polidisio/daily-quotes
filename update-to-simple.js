// Actualizar frontend para usar versión simple
const fs = require('fs');
let notionJs = fs.readFileSync('notion.js', 'utf8');

// Reemplazar para usar la versión simple
notionJs = notionJs.replace(
    "const response = await fetch('/api/save-quote-smart', {",
    "const response = await fetch('/api/save-quote-simple-db', {"
);

// Actualizar mensaje
notionJs = notionJs.replace(
    "message: `Guardado inteligente en Citas Diarias`",
    "message: `Guardado con contenido enriquecido`"
);

fs.writeFileSync('notion.js', notionJs);
console.log('✅ Frontend actualizado para usar versión simple');

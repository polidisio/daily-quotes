// Actualizar frontend para usar versión final
const fs = require('fs');
let notionJs = fs.readFileSync('notion.js', 'utf8');

// Reemplazar para usar la versión final
notionJs = notionJs.replace(
    "const response = await fetch('/api/save-quote-simple-db', {",
    "const response = await fetch('/api/save-quote-final', {"
);

// Actualizar mensaje
notionJs = notionJs.replace(
    "message: `Guardado con contenido enriquecido`",
    "message: `Guardado en columnas organizadas`"
);

fs.writeFileSync('notion.js', notionJs);
console.log('✅ Frontend actualizado para usar versión final');

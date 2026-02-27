// Actualizar frontend para usar versión inteligente
const fs = require('fs');
let notionJs = fs.readFileSync('notion.js', 'utf8');

// Reemplazar para usar la versión inteligente
notionJs = notionJs.replace(
    "const response = await fetch('/api/save-quote-db', {",
    "const response = await fetch('/api/save-quote-smart', {"
);

// Actualizar mensaje
notionJs = notionJs.replace(
    "message: `Guardado en base de datos Citas Diarias`",
    "message: `Guardado inteligente en Citas Diarias`"
);

fs.writeFileSync('notion.js', notionJs);
console.log('✅ Frontend actualizado para usar versión inteligente');

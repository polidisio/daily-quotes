// Actualizar frontend para usar database
const fs = require('fs');
let notionJs = fs.readFileSync('notion.js', 'utf8');

// Reemplazar para usar la versión de database
notionJs = notionJs.replace(
    "const response = await fetch('/api/save-quote-enhanced', {",
    "const response = await fetch('/api/save-quote-db', {"
);

// También actualizar el mensaje de éxito
notionJs = notionJs.replace(
    "message: `Guardado con método: ${result.method}`",
    "message: `Guardado en base de datos Citas Diarias`"
);

fs.writeFileSync('notion.js', notionJs);
console.log('✅ Frontend actualizado para usar database');

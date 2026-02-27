// Pequeño script para actualizar el frontend
const fs = require('fs');
const notionJs = fs.readFileSync('notion.js', 'utf8');

// Reemplazar la llamada a /api/save-quote con /api/save-quote-enhanced
const updated = notionJs.replace(
    "const response = await fetch('/api/save-quote-debug', {",
    "const response = await fetch('/api/save-quote-enhanced', {"
);

fs.writeFileSync('notion.js', updated);
console.log('Frontend actualizado para usar versión mejorada');

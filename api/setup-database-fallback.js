// api/setup-database-fallback.js - Versión que extrae ID automáticamente
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Página HTML simple
    if (req.method === 'GET') {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Configuración Fallback</title>
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
                input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; }
                button { background: #0070f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
                .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
                .success { background: #d4edda; color: #155724; }
                .error { background: #f8d7da; color: #721c24; }
            </style>
        </head>
        <body>
            <h1>🔧 Configuración Manual</h1>
            <p>Si el setup automático falla, usa este formulario:</p>
            
            <form id="configForm">
                <label>URL completa de tu database "Citas Diarias":</label>
                <textarea id="notionUrl" rows="3" placeholder="https://www.notion.so/tuworkspace/1234567890abcdef1234567890abcdef?v=..."></textarea>
                
                <label>O Database ID manual (32 caracteres hex):</label>
                <input id="databaseId" placeholder="1234567890abcdef1234567890abcdef">
                
                <button type="submit">🛠️ Configurar</button>
            </form>
            
            <div id="result"></div>
            
            <script>
                document.getElementById('configForm').onsubmit = async function(e) {
                    e.preventDefault();
                    
                    const url = document.getElementById('notionUrl').value;
                    const manualId = document.getElementById('databaseId').value;
                    const resultDiv = document.getElementById('result');
                    
                    resultDiv.innerHTML = '<p>⏳ Procesando...</p>';
                    
                    // Extraer ID de la URL si se proporcionó
                    let databaseId = manualId;
                    
                    if (url && !manualId) {
                        // Intentar extraer ID de la URL
                        const patterns = [
                            /notion\\.so\\/[^\\/]+\\/([0-9a-f]{32})/i,
                            /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
                            /([0-9a-f]{32})/i
                        ];
                        
                        for (const pattern of patterns) {
                            const match = url.match(pattern);
                            if (match && match[1]) {
                                databaseId = match[1];
                                break;
                            }
                        }
                    }
                    
                    if (!databaseId) {
                        resultDiv.innerHTML = \`
                            <div class="error">
                                <p>❌ No se pudo extraer un Database ID válido</p>
                                <p>Por favor, proporciona una URL completa o un ID manual.</p>
                            </div>
                        \`;
                        return;
                    }
                    
                    // Validar formato
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const hexRegex = /^[0-9a-f]{32}$/i;
                    
                    if (!uuidRegex.test(databaseId) && !hexRegex.test(databaseId)) {
                        resultDiv.innerHTML = \`
                            <div class="error">
                                <p>❌ Database ID inválido</p>
                                <p>Formato esperado: 32 caracteres hexadecimales</p>
                                <p>Recibido: <code>\${databaseId}</code></p>
                            </div>
                        \`;
                        return;
                    }
                    
                    // Enviar al servidor
                    try {
                        const response = await fetch('/api/setup-database-fallback', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                databaseId: databaseId,
                                originalUrl: url
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            resultDiv.innerHTML = \`
                                <div class="success">
                                    <h3>✅ Configuración exitosa!</h3>
                                    <p>Database ID configurado: <code>\${databaseId}</code></p>
                                    \${data.message ? \`<p>\${data.message}</p>\` : ''}
                                    <p><a href="https://daily-quotes.saraiba.eu" target="_blank">📖 Probar Daily Quotes</a></p>
                                </div>
                            \`;
                        } else {
                            resultDiv.innerHTML = \`
                                <div class="error">
                                    <h3>❌ Error en la configuración</h3>
                                    <p>\${data.error || 'Error desconocido'}</p>
                                    \${data.suggestion ? \`<p>\${data.suggestion}</p>\` : ''}
                                </div>
                            \`;
                        }
                        
                    } catch (error) {
                        resultDiv.innerHTML = \`
                            <div class="error">
                                <h3>❌ Error de conexión</h3>
                                <p>\${error.message}</p>
                            </div>
                        \`;
                    }
                };
            </script>
        </body>
        </html>
        `;
        
        return res.status(200).setHeader('Content-Type', 'text/html').send(html);
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { databaseId, originalUrl } = req.body;
        
        if (!databaseId) {
            return res.status(400).json({ error: 'No database ID provided' });
        }
        
        // Validar formato
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const hexRegex = /^[0-9a-f]{32}$/i;
        
        if (!uuidRegex.test(databaseId) && !hexRegex.test(databaseId)) {
            return res.status(400).json({
                error: 'Invalid database ID format',
                received: databaseId,
                expected: '32 hexadecimal characters (with or without dashes)'
            });
        }
        
        console.log('Fallback setup with ID:', databaseId);
        
        // Aquí normalmente actualizaríamos las variables de entorno
        // Pero en Vercel necesitamos que el usuario lo haga manualmente
        
        return res.status(200).json({
            success: true,
            message: 'Database ID validado correctamente',
            databaseId: databaseId,
            nextSteps: [
                '1. Ve a Vercel Dashboard → tu proyecto → Settings → Environment Variables',
                `2. Actualiza NOTION_DATABASE_ID con este valor: ${databaseId}`,
                '3. Guarda los cambios y espera el redeploy',
                '4. Visita /api/setup-database para configurar las columnas',
                '5. Luego prueba https://daily-quotes.saraiba.eu'
            ],
            quickTest: `curl -X POST "https://api.notion.com/v1/databases/${databaseId}" \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Notion-Version: 2022-06-28"`
        });
        
    } catch (error) {
        console.error('Fallback error:', error);
        return res.status(500).json({
            error: 'Fallback failed',
            message: error.message
        });
    }
}
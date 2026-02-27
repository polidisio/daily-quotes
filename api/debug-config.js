// api/debug-config.js - Diagnóstico completo
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Debug configuration...');
        
        // Analizar Database ID
        let dbIdAnalysis = {
            value: NOTION_DATABASE_ID,
            length: NOTION_DATABASE_ID?.length,
            isValidUUID: false,
            isValidHex: false,
            hasSpaces: false,
            hasUrlParts: false
        };
        
        if (NOTION_DATABASE_ID) {
            // Verificar formato UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const hexRegex = /^[0-9a-f]{32}$/i;
            
            dbIdAnalysis.isValidUUID = uuidRegex.test(NOTION_DATABASE_ID);
            dbIdAnalysis.isValidHex = hexRegex.test(NOTION_DATABASE_ID);
            dbIdAnalysis.hasSpaces = NOTION_DATABASE_ID.includes(' ');
            dbIdAnalysis.hasUrlParts = NOTION_DATABASE_ID.includes('http') || 
                                      NOTION_DATABASE_ID.includes('notion.so') ||
                                      NOTION_DATABASE_ID.includes('/');
            
            // Intentar extraer ID de URL si parece una URL
            if (dbIdAnalysis.hasUrlParts) {
                console.log('Database ID appears to be a URL, attempting extraction...');
                
                // Patrones comunes de URLs de Notion
                const urlPatterns = [
                    /notion\.so\/[^\/]+\/([0-9a-f]{32})/i,
                    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
                    /([0-9a-f]{32})/i
                ];
                
                for (const pattern of urlPatterns) {
                    const match = NOTION_DATABASE_ID.match(pattern);
                    if (match && match[1]) {
                        dbIdAnalysis.extractedId = match[1];
                        dbIdAnalysis.extractedPattern = pattern.toString();
                        break;
                    }
                }
            }
        }
        
        // Test de conexión a Notion (si tenemos datos válidos)
        let notionTest = { attempted: false, success: false, error: null };
        
        if (NOTION_API_KEY && dbIdAnalysis.isValidUUID) {
            try {
                notionTest.attempted = true;
                const testResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28'
                    }
                });
                
                notionTest.success = testResponse.ok;
                notionTest.status = testResponse.status;
                notionTest.statusText = testResponse.statusText;
                
                if (!testResponse.ok) {
                    const errorText = await testResponse.text();
                    notionTest.error = errorText.substring(0, 500);
                }
                
            } catch (error) {
                notionTest.error = error.message;
            }
        }
        
        // Generar HTML de diagnóstico
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Diagnóstico Notion Integration</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       max-width: 800px; margin: 40px auto; padding: 20px; }
                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                h1 { color: #333; }
                h2 { color: #555; margin-top: 30px; }
                .section { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .success { color: green; }
                .error { color: red; }
                .warning { color: orange; }
                .info { color: blue; }
                code { background: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
                pre { background: #333; color: white; padding: 15px; border-radius: 5px; overflow: auto; }
                .btn { background: #0070f3; color: white; padding: 10px 20px; 
                       border: none; border-radius: 5px; cursor: pointer; 
                       margin: 5px; text-decoration: none; display: inline-block; }
                .btn:hover { background: #0051cc; }
                .btn-success { background: #28a745; }
                .btn-warning { background: #ffc107; color: black; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔧 Diagnóstico Notion Integration</h1>
                
                <div class="section">
                    <h2>📋 Configuración Actual</h2>
                    <p><strong>NOTION_API_KEY:</strong> ${NOTION_API_KEY ? '✅ Presente' : '❌ Ausente'}</p>
                    <p><strong>NOTION_DATABASE_ID:</strong> ${NOTION_DATABASE_ID ? '✅ Presente' : '❌ Ausente'}</p>
                    
                    <h3>🔍 Análisis del Database ID</h3>
                    <ul>
                        <li>Valor: <code>${dbIdAnalysis.value || '(vacío)'}</code></li>
                        <li>Longitud: ${dbIdAnalysis.length || 0} caracteres</li>
                        <li>Formato UUID: ${dbIdAnalysis.isValidUUID ? '✅ Válido' : '❌ Inválido'}</li>
                        <li>Formato Hex (32 chars): ${dbIdAnalysis.isValidHex ? '✅ Válido' : '❌ Inválido'}</li>
                        <li>Contiene espacios: ${dbIdAnalysis.hasSpaces ? '❌ Sí' : '✅ No'}</li>
                        <li>Parece URL: ${dbIdAnalysis.hasUrlParts ? '⚠️ Sí' : '✅ No'}</li>
                        ${dbIdAnalysis.extractedId ? 
                          `<li>ID extraído: <code>${dbIdAnalysis.extractedId}</code></li>` : ''}
                    </ul>
                </div>
                
                <div class="section">
                    <h2>🧪 Test de Conexión</h2>
                    ${notionTest.attempted ? 
                      `<p><strong>Resultado:</strong> ${notionTest.success ? '✅ Éxito' : '❌ Fallo'}</p>
                       ${notionTest.success ? 
                         `<p>Status: ${notionTest.status} ${notionTest.statusText}</p>` :
                         `<p>Error: ${notionTest.error || 'Desconocido'}</p>`
                       }` :
                      `<p>⚠️ No se pudo testear (Database ID inválido)</p>`
                    }
                </div>
                
                <div class="section">
                    <h2>🚀 Acciones Rápidas</h2>
                    <a href="/api/setup-database" class="btn">🛠️ Configurar Database</a>
                    <a href="https://daily-quotes.saraiba.eu" class="btn btn-success">📖 Probar Daily Quotes</a>
                    <a href="https://vercel.com" target="_blank" class="btn btn-warning">⚙️ Ver Vercel Env Vars</a>
                </div>
                
                <div class="section">
                    <h2>📝 Cómo obtener el Database ID correcto</h2>
                    <ol>
                        <li>Abre tu database <strong>"Citas Diarias"</strong> en Notion</li>
                        <li>Mira la URL en el navegador:
                            <pre>https://www.notion.so/tuworkspace/<strong>1234567890abcdef1234567890abcdef</strong>?v=...</pre>
                        </li>
                        <li>Copia solo la parte de <strong>32 caracteres hexadecimales</strong></li>
                        <li>Ejemplos válidos:
                            <ul>
                                <li><code>550e8400-e29b-41d4-a716-446655440000</code> (con guiones)</li>
                                <li><code>1234567890abcdef1234567890abcdef</code> (sin guiones)</li>
                            </ul>
                        </li>
                    </ol>
                </div>
                
                <div class="section">
                    <h2>🔧 Comandos para probar</h2>
                    <pre>
# Probar configuración actual
curl "https://daily-quotes.saraiba.eu/api/debug-config"

# Probar setup (si el ID es correcto)
curl -X POST "https://daily-quotes.saraiba.eu/api/setup-database" \
  -H "Content-Type: application/json" \
  -d '{}'

# Probar guardar cita
curl -X POST "https://daily-quotes.saraiba.eu/api/save-quote-final" \
  -H "Content-Type: application/json" \
  -d '{
    "quote_es": "Test español",
    "quote_en": "Test english",
    "author_es": "Test ES",
    "author_en": "Test EN",
    "date": "2026-02-27"
  }'
                    </pre>
                </div>
            </div>
        </body>
        </html>
        `;
        
        return res.status(200).setHeader('Content-Type', 'text/html').send(html);
        
    } catch (error) {
        console.error('Debug error:', error);
        return res.status(500).json({
            error: 'Debug failed',
            message: error.message
        });
    }
}
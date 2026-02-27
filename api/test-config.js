// api/test-config.js - Test simple de configuración
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
        
        const config = {
            NOTION_API_KEY: NOTION_API_KEY ? '✅ Presente' : '❌ Ausente',
            NOTION_DATABASE_ID: NOTION_DATABASE_ID ? '✅ Presente' : '❌ Ausente',
            databaseIdValue: NOTION_DATABASE_ID || '(no configurado)',
            databaseIdLength: NOTION_DATABASE_ID?.length || 0
        };
        
        // Validar formato si existe
        if (NOTION_DATABASE_ID) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const hexRegex = /^[0-9a-f]{32}$/i;
            
            config.isValidUUID = uuidRegex.test(NOTION_DATABASE_ID);
            config.isValidHex = hexRegex.test(NOTION_DATABASE_ID);
            config.isValidFormat = config.isValidUUID || config.isValidHex;
        }
        
        // HTML simple
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Configuración</title>
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
                .config { background: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .valid { color: green; }
                .invalid { color: red; }
                .btn { display: inline-block; background: #0070f3; color: white; 
                       padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 5px; }
            </style>
        </head>
        <body>
            <h1>🧪 Test de Configuración</h1>
            
            <div class="config">
                <h3>Configuración Actual:</h3>
                <p><strong>NOTION_API_KEY:</strong> ${config.NOTION_API_KEY}</p>
                <p><strong>NOTION_DATABASE_ID:</strong> ${config.NOTION_DATABASE_ID}</p>
                
                ${NOTION_DATABASE_ID ? `
                    <h3>Validación del Database ID:</h3>
                    <p>Valor: <code>${config.databaseIdValue}</code></p>
                    <p>Longitud: ${config.databaseIdLength} caracteres</p>
                    <p>Formato UUID: ${config.isValidUUID ? '✅ Válido' : '❌ Inválido'}</p>
                    <p>Formato Hex (32 chars): ${config.isValidHex ? '✅ Válido' : '❌ Inválido'}</p>
                    <p>Formato general: ${config.isValidFormat ? '✅ Válido' : '❌ Inválido'}</p>
                ` : ''}
            </div>
            
            <h3>Acciones:</h3>
            <a href="/api/create-database" class="btn">🆕 Crear Database</a>
            <a href="/api/debug-config" class="btn">🔧 Debug Completo</a>
            <a href="/api/setup-database" class="btn">🛠️ Setup Database</a>
            <a href="https://daily-quotes.saraiba.eu" class="btn">📖 Daily Quotes</a>
            
            <h3>Problemas comunes:</h3>
            <ul>
                <li><strong>Database no existe:</strong> Usa "Crear Database"</li>
                <li><strong>ID incorrecto:</strong> Verifica el formato (32 chars hex)</li>
                <li><strong>Sin permisos:</strong> Comparte la database con tu integración</li>
            </ul>
        </body>
        </html>
        `;
        
        return res.status(200).setHeader('Content-Type', 'text/html').send(html);
        
    } catch (error) {
        console.error('Test config error:', error);
        return res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
}
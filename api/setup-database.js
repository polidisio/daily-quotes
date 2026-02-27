// api/setup-database-enhanced.js - Configuración completa de database
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Permitir GET para fácil acceso desde navegador
    if (req.method === 'GET') {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Configurar Database "Citas Diarias"</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       max-width: 800px; margin: 40px auto; padding: 20px; }
                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                h1 { color: #333; }
                .btn { background: #0070f3; color: white; padding: 12px 24px; 
                       border: none; border-radius: 6px; cursor: pointer; 
                       font-size: 16px; margin: 10px 0; }
                .btn:hover { background: #0051cc; }
                .loading { display: none; color: #666; }
                .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
                .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                code { background: #eee; padding: 2px 4px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛠️ Configurar Database "Citas Diarias"</h1>
                <p>Este script configurará automáticamente tu database de Notion con las columnas necesarias para guardar citas diarias.</p>
                
                <div class="info">
                    <p><strong>Columnas que se crearán:</strong></p>
                    <ul>
                        <li><code>Nombre</code> (Título) - Obligatorio en Notion</li>
                        <li><code>Cita</code> (Texto) - Cita en español</li>
                        <li><code>Autor</code> (Texto) - Autor en español</li>
                        <li><code>Cita EN</code> (Texto) - Cita en inglés</li>
                        <li><code>Autor EN</code> (Texto) - Autor en inglés</li>
                        <li><code>Fecha</code> (Fecha) - Fecha de la cita</li>
                        <li><code>Idioma</code> (Selección) - Español/Inglés/Bilingüe</li>
                        <li><code>Fuente</code> (Texto) - Daily Quotes</li>
                    </ul>
                </div>
                
                <button class="btn" onclick="setupDatabase()">🚀 Configurar Database</button>
                
                <div id="loading" class="loading">
                    <p>⏳ Configurando database "Citas Diarias"...</p>
                </div>
                
                <div id="result"></div>
            </div>
            
            <script>
                async function setupDatabase() {
                    const btn = document.querySelector('.btn');
                    const loading = document.getElementById('loading');
                    const result = document.getElementById('result');
                    
                    btn.disabled = true;
                    btn.textContent = 'Configurando...';
                    loading.style.display = 'block';
                    result.innerHTML = '';
                    
                    try {
                        const response = await fetch('/api/setup-database-enhanced', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ action: 'setup' })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            result.innerHTML = \`
                                <div class="success">
                                    <h3>✅ Database configurada exitosamente!</h3>
                                    <p><strong>Propiedades creadas:</strong> \${data.properties.join(', ')}</p>
                                    <p><strong>Próximos pasos:</strong></p>
                                    <ol>
                                        <li>Visita <a href="https://daily-quotes.saraiba.eu" target="_blank">Daily Quotes</a></li>
                                        <li>La cita del día se guardará automáticamente</li>
                                        <li>Revisa tu database "Citas Diarias" en Notion</li>
                                    </ol>
                                    <p><a href="\${data.databaseUrl || '#'}" target="_blank">🔗 Abrir database en Notion</a></p>
                                </div>
                            \`;
                        } else {
                            result.innerHTML = \`
                                <div class="error">
                                    <h3>❌ Error en la configuración</h3>
                                    <p><strong>Error:</strong> \${data.error || 'Unknown error'}</p>
                                    \${data.suggestion ? \`<p><strong>Sugerencia:</strong> \${Array.isArray(data.suggestion) ? data.suggestion.join('<br>') : data.suggestion}</p>\` : ''}
                                    \${data.details ? \`<pre>\${JSON.stringify(data.details, null, 2)}</pre>\` : ''}
                                </div>
                            \`;
                        }
                        
                    } catch (error) {
                        result.innerHTML = \`
                            <div class="error">
                                <h3>❌ Error de conexión</h3>
                                <p>\${error.message}</p>
                                <p>Verifica que la API de Notion esté accesible.</p>
                            </div>
                        \`;
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '🚀 Configurar Database';
                        loading.style.display = 'none';
                    }
                }
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
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('=== DATABASE SETUP STARTED ===');
        console.log('Database ID:', NOTION_DATABASE_ID ? `${NOTION_DATABASE_ID.substring(0, 8)}...` : 'none');
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            const error = {
                error: 'Missing environment variables',
                NOTION_API_KEY: !!NOTION_API_KEY,
                NOTION_DATABASE_ID: !!NOTION_DATABASE_ID,
                suggestion: 'Check Vercel environment variables for NOTION_DATABASE_ID'
            };
            console.error('Config error:', error);
            return res.status(500).json(error);
        }
        
        // PASO 1: Obtener información actual de la database
        console.log('Fetching current database...');
        let currentDb = null;
        let databaseUrl = null;
        
        try {
            const dbResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            
            if (!dbResponse.ok) {
                const errorText = await dbResponse.text();
                console.error('Failed to fetch database:', errorText);
                
                return res.status(400).json({
                    error: 'Cannot access database',
                    status: dbResponse.status,
                    details: errorText,
                    suggestion: [
                        '1. Verify the Database ID is correct',
                        '2. Share the "Citas Diarias" database with your Notion integration',
                        '3. Check integration permissions in Notion'
                    ]
                });
            }
            
            currentDb = await dbResponse.json();
            databaseUrl = currentDb.url;
            
            console.log('Current database:', {
                title: currentDb.title?.[0]?.text?.content || 'Untitled',
                url: databaseUrl,
                existingProperties: Object.keys(currentDb.properties || {})
            });
            
        } catch (error) {
            console.error('Database fetch error:', error);
            return res.status(500).json({
                error: 'Failed to fetch database',
                message: error.message,
                suggestion: 'Check network connectivity and API key'
            });
        }
        
        // PASO 2: Preparar propiedades para actualización
        // Mantener propiedades existentes y añadir las nuevas
        const existingProperties = currentDb.properties || {};
        const newProperties = {
            // Propiedad de título (obligatoria)
            "Nombre": {
                title: {}
            },
            // Propiedades para citas
            "Cita": {
                rich_text: {}
            },
            "Autor": {
                rich_text: {}
            },
            "Cita EN": {
                rich_text: {}
            },
            "Autor EN": {
                rich_text: {}
            },
            "Fecha": {
                date: {}
            },
            "Idioma": {
                select: {
                    options: [
                        { name: "Español", color: "blue" },
                        { name: "Inglés", color: "green" },
                        { name: "Bilingüe", color: "purple" }
                    ]
                }
            },
            "Fuente": {
                rich_text: {}
            }
        };
        
        // Combinar propiedades existentes con nuevas
        // (No sobrescribir propiedades existentes)
        const mergedProperties = { ...existingProperties };
        for (const [key, value] of Object.entries(newProperties)) {
            if (!mergedProperties[key]) {
                mergedProperties[key] = value;
            } else {
                console.log(`Property "${key}" already exists, skipping`);
            }
        }
        
        console.log('Properties to update:', {
            existing: Object.keys(existingProperties),
            new: Object.keys(newProperties).filter(k => !existingProperties[k]),
            total: Object.keys(mergedProperties)
        });
        
        // PASO 3: Actualizar la database
        console.log('Updating database properties...');
        const updatePayload = {
            properties: mergedProperties
        };
        
        const updateResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });
        
        const responseText = await updateResponse.text();
        console.log('Update response:', {
            status: updateResponse.status,
            statusText: updateResponse.statusText
        });
        
        if (!updateResponse.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            console.error('Update failed:', errorDetails);
            
            // Intentar método más simple si falla
            console.log('Trying simple update with just required properties...');
            const simplePayload = {
                properties: {
                    "Nombre": { title: {} },
                    "Cita": { rich_text: {} },
                    "Fecha": { date: {} }
                }
            };
            
            const simpleResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(simplePayload)
            });
            
            const simpleResponseText = await simpleResponse.text();
            
            if (!simpleResponse.ok) {
                return res.status(400).json({
                    error: 'Failed to update database',
                    originalError: errorDetails,
                    simpleUpdateError: simpleResponseText,
                    suggestion: [
                        '1. Manually add these columns to your "Citas Diarias" database:',
                        '   - "Nombre" (Title type)',
                        '   - "Cita" (Text type)',
                        '   - "Fecha" (Date type)',
                        '2. Then try saving a quote again'
                    ]
                });
            }
            
            // Simple update succeeded
            const simpleData = JSON.parse(simpleResponseText);
            return res.status(200).json({
                success: true,
                message: 'Database configured with basic properties',
                properties: Object.keys(simpleData.properties),
                databaseUrl: simpleData.url,
                note: 'Basic properties added. You can add more columns manually if needed.'
            });
        }
        
        const updatedDb = JSON.parse(responseText);
        
        console.log('=== DATABASE SETUP COMPLETED ===');
        console.log('Updated properties:', Object.keys(updatedDb.properties));
        
        return res.status(200).json({
            success: true,
            message: 'Database "Citas Diarias" configured successfully!',
            properties: Object.keys(updatedDb.properties),
            databaseUrl: updatedDb.url,
            newProperties: Object.keys(newProperties).filter(k => !existingProperties[k]),
            nextSteps: [
                '1. Visit https://daily-quotes.saraiba.eu to save a test quote',
                '2. Check your "Citas Diarias" database in Notion',
                '3. The quote will appear with all fields properly filled'
            ]
        });
        
    } catch (error) {
        console.error('Setup error:', error);
        return res.status(500).json({
            error: 'Setup failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
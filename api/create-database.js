// api/create-database.js - Crea la database automáticamente
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Página HTML
    if (req.method === 'GET') {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Crear Database "Citas Diarias"</title>
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
                h1 { color: #333; }
                .btn { background: #28a745; color: white; padding: 12px 24px; 
                       border: none; border-radius: 6px; cursor: pointer; 
                       font-size: 16px; margin: 10px 0; }
                .btn:hover { background: #218838; }
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
                <h1>🆕 Crear Database "Citas Diarias"</h1>
                
                <div class="info">
                    <p><strong>Este script creará automáticamente:</strong></p>
                    <ol>
                        <li>Una nueva database llamada <strong>"Citas Diarias"</strong> en tu Notion</li>
                        <li>Con todas las columnas necesarias para guardar citas</li>
                        <li>Compartida automáticamente con tu integración</li>
                        <li>Configurada para usar con Daily Quotes</li>
                    </ol>
                    <p><strong>Columnas que se crearán:</strong></p>
                    <ul>
                        <li><code>Nombre</code> (Título) - Cita resumida</li>
                        <li><code>Cita</code> (Texto) - Cita completa en español</li>
                        <li><code>Autor</code> (Texto) - Autor en español</li>
                        <li><code>Cita EN</code> (Texto) - Cita en inglés</li>
                        <li><code>Autor EN</code> (Texto) - Autor en inglés</li>
                        <li><code>Fecha</code> (Fecha) - Fecha automática</li>
                        <li><code>Idioma</code> (Selección) - Español/Inglés/Bilingüe</li>
                        <li><code>Fuente</code> (Texto) - Daily Quotes</li>
                    </ul>
                </div>
                
                <button class="btn" onclick="createDatabase()">🆕 Crear Database Automáticamente</button>
                
                <div id="loading" class="loading">
                    <p>⏳ Creando database "Citas Diarias"...</p>
                </div>
                
                <div id="result"></div>
            </div>
            
            <script>
                async function createDatabase() {
                    const btn = document.querySelector('.btn');
                    const loading = document.getElementById('loading');
                    const result = document.getElementById('result');
                    
                    btn.disabled = true;
                    btn.textContent = 'Creando...';
                    loading.style.display = 'block';
                    result.innerHTML = '';
                    
                    try {
                        const response = await fetch('/api/create-database', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ action: 'create' })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            result.innerHTML = \`
                                <div class="success">
                                    <h3>✅ Database creada exitosamente!</h3>
                                    <p><strong>Nombre:</strong> \${data.databaseName}</p>
                                    <p><strong>Database ID:</strong> <code>\${data.databaseId}</code></p>
                                    <p><strong>URL:</strong> <a href="\${data.databaseUrl}" target="_blank">\${data.databaseUrl}</a></p>
                                    
                                    <div style="margin: 15px 0; padding: 10px; background: #c3e6cb; border-radius: 5px;">
                                        <p><strong>⚠️ IMPORTANTE: Configura este ID en Vercel</strong></p>
                                        <p>1. Ve a <a href="https://vercel.com" target="_blank">Vercel Dashboard</a></p>
                                        <p>2. Tu proyecto → Settings → Environment Variables</p>
                                        <p>3. Actualiza <code>NOTION_DATABASE_ID</code> con: <code>\${data.databaseId}</code></p>
                                        <p>4. Guarda y espera 1-2 minutos para redeploy</p>
                                    </div>
                                    
                                    <p><strong>Próximos pasos:</strong></p>
                                    <ol>
                                        <li>Configura el ID en Vercel (paso anterior)</li>
                                        <li>Visita <a href="https://daily-quotes.saraiba.eu" target="_blank">Daily Quotes</a></li>
                                        <li>La cita se guardará automáticamente en tu nueva database</li>
                                    </ol>
                                </div>
                            \`;
                        } else {
                            result.innerHTML = \`
                                <div class="error">
                                    <h3>❌ Error al crear la database</h3>
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
                        btn.textContent = '🆕 Crear Database Automáticamente';
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
        
        console.log('=== CREATING NEW DATABASE ===');
        
        if (!NOTION_API_KEY) {
            return res.status(500).json({
                error: 'Missing NOTION_API_KEY',
                suggestion: 'Configure NOTION_API_KEY in Vercel environment variables'
            });
        }
        
        // PASO 1: Primero necesitamos obtener un page_id padre
        // Intentar obtener páginas del workspace para usar como padre
        console.log('Searching for a parent page...');
        
        let parentPageId = null;
        
        try {
            // Buscar páginas en el workspace
            const searchResponse = await fetch('https://api.notion.com/v1/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filter: {
                        property: 'object',
                        value: 'page'
                    },
                    sort: {
                        direction: 'descending',
                        timestamp: 'last_edited_time'
                    },
                    page_size: 5
                })
            });
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.results && searchData.results.length > 0) {
                    parentPageId = searchData.results[0].id;
                    console.log('Found parent page:', parentPageId);
                }
            }
        } catch (searchError) {
            console.log('Search failed, will try alternative method:', searchError.message);
        }
        
        // Si no encontramos página, intentar crear una en la raíz
        if (!parentPageId) {
            console.log('No parent page found, trying to use workspace root...');
            // Para workspace root, usamos un ID especial o intentamos sin parent
            // Notion API requiere parent, así que intentaremos crear una página primero
        }
        
        // PASO 2: Crear la database
        console.log('Creating new database...');
        
        const databasePayload = {
            parent: parentPageId ? { page_id: parentPageId } : { workspace: true },
            title: [
                {
                    type: "text",
                    text: {
                        content: "Citas Diarias",
                        link: null
                    }
                }
            ],
            properties: {
                "Nombre": {
                    title: {}
                },
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
            }
        };
        
        console.log('Database payload:', JSON.stringify(databasePayload, null, 2));
        
        const createResponse = await fetch('https://api.notion.com/v1/databases', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(databasePayload)
        });
        
        const responseText = await createResponse.text();
        console.log('Create response:', {
            status: createResponse.status,
            statusText: createResponse.statusText,
            body: responseText.substring(0, 1000)
        });
        
        if (!createResponse.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Intentar método alternativo si falla
            console.log('Trying alternative method (create page first)...');
            
            // Primero crear una página simple
            const pagePayload = {
                parent: { workspace: true },
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: "Daily Quotes Workspace"
                                }
                            }
                        ]
                    }
                }
            };
            
            const pageResponse = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pagePayload)
            });
            
            if (pageResponse.ok) {
                const pageData = await pageResponse.json();
                parentPageId = pageData.id;
                
                // Ahora intentar crear la database con este parent
                databasePayload.parent = { page_id: parentPageId };
                
                const retryResponse = await fetch('https://api.notion.com/v1/databases', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(databasePayload)
                });
                
                const retryText = await retryResponse.text();
                
                if (retryResponse.ok) {
                    const dbData = JSON.parse(retryText);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Database created successfully!',
                        databaseName: "Citas Diarias",
                        databaseId: dbData.id,
                        databaseUrl: dbData.url,
                        parentPageId: parentPageId,
                        note: 'Database created with all necessary columns. Update NOTION_DATABASE_ID in Vercel.'
                    });
                } else {
                    return res.status(400).json({
                        error: 'Failed to create database even with new parent',
                        details: retryText,
                        suggestion: 'Create the database manually in Notion and share it with your integration'
                    });
                }
            }
            
            return res.status(400).json({
                error: 'Failed to create database',
                details: errorDetails,
                suggestion: [
                    '1. Create the database manually in Notion:',
                    '   - Name it "Citas Diarias"',
                    '   - Add columns: Nombre (Title), Cita (Text), Autor (Text), Fecha (Date)',
                    '2. Share it with your Notion integration',
                    '3. Get the Database ID from the URL',
                    '4. Update NOTION_DATABASE_ID in Vercel'
                ]
            });
        }
        
        const dbData = JSON.parse(responseText);
        
        console.log('=== DATABASE CREATED SUCCESSFULLY ===');
        console.log('Database ID:', dbData.id);
        console.log('Database URL:', dbData.url);
        
        return res.status(200).json({
            success: true,
            message: 'Database "Citas Diarias" created successfully!',
            databaseName: "Citas Diarias",
            databaseId: dbData.id,
            databaseUrl: dbData.url,
            properties: Object.keys(dbData.properties),
            nextSteps: [
                '1. Update NOTION_DATABASE_ID in Vercel with the ID above',
                '2. Wait 1-2 minutes for redeploy',
                '3. Visit https://daily-quotes.saraiba.eu to save a quote',
                '4. Check your new database in Notion'
            ]
        });
        
    } catch (error) {
        console.error('Create database error:', error);
        return res.status(500).json({
            error: 'Failed to create database',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
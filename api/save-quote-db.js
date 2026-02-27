// api/save-quote-db-fixed.js - Versión corregida para database "Citas Diarias"
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { quote_es, quote_en, author_es, author_en, date } = req.body;
        
        if (!quote_es || !quote_en || !date) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['quote_es', 'quote_en', 'date']
            });
        }
        
        // Usar NOTION_DATABASE_ID si existe, sino NOTION_PAGE_ID
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Database integration:', {
            hasApiKey: !!NOTION_API_KEY,
            databaseId: NOTION_DATABASE_ID ? `${NOTION_DATABASE_ID.substring(0, 8)}...` : 'none',
            usingEnv: process.env.NOTION_DATABASE_ID ? 'NOTION_DATABASE_ID' : 'NOTION_PAGE_ID'
        });
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({ 
                error: 'Missing configuration',
                NOTION_API_KEY: !!NOTION_API_KEY,
                NOTION_DATABASE_ID: !!NOTION_DATABASE_ID,
                suggestion: 'Set NOTION_DATABASE_ID environment variable in Vercel'
            });
        }
        
        // PRIMERO: Intentar obtener información de la database
        console.log('Fetching database info...');
        let dbInfo = null;
        try {
            const dbResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            
            if (dbResponse.ok) {
                dbInfo = await dbResponse.json();
                console.log('Database properties:', Object.keys(dbInfo.properties || {}));
            }
        } catch (dbError) {
            console.log('Could not fetch database info:', dbError.message);
        }
        
        // SEGUNDO: Crear payload adaptable
        // Intentar diferentes nombres de propiedades comunes
        
        const possiblePayloads = [
            // Intento 1: Propiedades comunes en español
            {
                name: 'common_es',
                parent: { database_id: NOTION_DATABASE_ID },
                properties: {
                    "Nombre": {
                        title: [{ text: { content: `Cita: ${quote_es.substring(0, 40)}...` } }]
                    },
                    "Fecha": { date: { start: date } },
                    "Cita ES": { rich_text: [{ text: { content: quote_es } }] },
                    "Autor ES": { rich_text: [{ text: { content: author_es || "Desconocido" } }] },
                    "Cita EN": { rich_text: [{ text: { content: quote_en } }] },
                    "Autor EN": { rich_text: [{ text: { content: author_en || "Unknown" } }] }
                }
            },
            // Intento 2: Propiedades en inglés
            {
                name: 'common_en', 
                parent: { database_id: NOTION_DATABASE_ID },
                properties: {
                    "Title": {
                        title: [{ text: { content: `Quote: ${quote_es.substring(0, 40)}...` } }]
                    },
                    "Date": { date: { start: date } },
                    "Quote ES": { rich_text: [{ text: { content: quote_es } }] },
                    "Author ES": { rich_text: [{ text: { content: author_es || "Unknown" } }] },
                    "Quote EN": { rich_text: [{ text: { content: quote_en } }] },
                    "Author EN": { rich_text: [{ text: { content: author_en || "Unknown" } }] }
                }
            },
            // Intento 3: Mínimo (solo título y fecha)
            {
                name: 'minimal',
                parent: { database_id: NOTION_DATABASE_ID },
                properties: {
                    "Name": {
                        title: [{ text: { content: `Daily Quote - ${date}` } }]
                    },
                    "Date": { date: { start: date } }
                }
            }
        ];
        
        // Intentar cada payload
        for (const payload of possiblePayloads) {
            console.log(`Trying payload: ${payload.name}`);
            
            try {
                const response = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const responseText = await response.text();
                
                if (response.ok) {
                    const data = JSON.parse(responseText);
                    console.log(`✅ Success with payload: ${payload.name}`);
                    
                    return res.status(200).json({
                        success: true,
                        method: payload.name,
                        pageId: data.id,
                        url: data.url,
                        message: 'Quote saved to Citas Diarias database',
                        propertiesUsed: Object.keys(payload.properties)
                    });
                } else {
                    console.log(`❌ Payload ${payload.name} failed:`, response.status, responseText.substring(0, 200));
                }
                
            } catch (error) {
                console.log(`Error with payload ${payload.name}:`, error.message);
            }
        }
        
        // Todos fallaron
        return res.status(400).json({
            error: 'All database attempts failed',
            databaseId: NOTION_DATABASE_ID,
            availableProperties: dbInfo ? Object.keys(dbInfo.properties) : null,
            suggestions: [
                '1. Share the "Citas Diarias" database with your Notion integration',
                '2. Check the exact property names in your database',
                '3. Try using the database ID from the URL (32 chars hex)',
                '4. Create a simple test database and try with that first'
            ]
        });
        
    } catch (error) {
        console.error('Database save error:', error);
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}
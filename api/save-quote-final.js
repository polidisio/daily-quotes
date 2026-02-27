// api/save-quote-final.js - Versión final para database con columnas
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
                error: 'Missing required fields'
            });
        }
        
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Final save to database...', { date });
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({ 
                error: 'Missing configuration'
            });
        }
        
        // Determinar idioma
        const isBilingual = quote_es !== quote_en;
        const language = isBilingual ? "Bilingüe" : "Español";
        
        // Payload para database con columnas organizadas
        const payload = {
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
                // Columnas principales (deben coincidir con setup)
                "Nombre": {
                    title: [
                        {
                            text: {
                                content: `"${quote_es.substring(0, 40)}${quote_es.length > 40 ? '...' : ''}"`
                            }
                        }
                    ]
                },
                "Cita": {
                    rich_text: [
                        {
                            text: {
                                content: quote_es
                            }
                        }
                    ]
                },
                "Autor": {
                    rich_text: [
                        {
                            text: {
                                content: author_es || "Desconocido"
                            }
                        }
                    ]
                },
                "Cita EN": {
                    rich_text: [
                        {
                            text: {
                                content: quote_en
                            }
                        }
                    ]
                },
                "Autor EN": {
                    rich_text: [
                        {
                            text: {
                                content: author_en || "Unknown"
                            }
                        }
                    ]
                },
                "Fecha": {
                    date: {
                        start: date
                    }
                },
                "Idioma": {
                    select: {
                        name: language
                    }
                },
                "Fuente": {
                    rich_text: [
                        {
                            text: {
                                content: "Daily Quotes",
                                link: { url: "https://daily-quotes.saraiba.eu" }
                            }
                        }
                    ]
                }
            }
        };
        
        console.log('Saving with organized columns...');
        
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
        console.log('Save response:', {
            status: response.status,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Si falla por propiedades faltantes, sugerir setup
            if (response.status === 400) {
                return res.status(400).json({
                    error: 'Database needs configuration',
                    details: errorDetails,
                    suggestion: 'Run setup first: Visit /api/setup-database in your browser'
                });
            }
            
            return res.status(response.status).json({
                error: 'Failed to save',
                details: errorDetails
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Quote saved to organized database columns',
            pageId: data.id,
            url: data.url,
            columnsUsed: [
                "Nombre", "Cita", "Autor", "Cita EN", 
                "Autor EN", "Fecha", "Idioma", "Fuente"
            ],
            note: 'Check your "Citas Diarias" database in Notion - all columns should be filled'
        });
        
    } catch (error) {
        console.error('Final save error:', error);
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}
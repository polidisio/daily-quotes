// api/save-quote-db.js - Versión para Database en lugar de Page
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
        
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Using Database ID:', NOTION_DATABASE_ID);
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({ 
                error: 'Missing configuration',
                NOTION_API_KEY: !!NOTION_API_KEY,
                NOTION_DATABASE_ID: !!NOTION_DATABASE_ID
            });
        }
        
        // Versión para Database (más robusta)
        const payload = {
            parent: {
                type: "database_id",
                database_id: NOTION_DATABASE_ID
            },
            properties: {
                // Estos nombres deben coincidir con tu database schema
                "Name": {
                    title: [
                        {
                            text: {
                                content: `Cita: ${quote_es.substring(0, 30)}...`
                            }
                        }
                    ]
                },
                "Date": {
                    date: {
                        start: date
                    }
                },
                "Quote ES": {
                    rich_text: [
                        {
                            text: {
                                content: quote_es
                            }
                        }
                    ]
                },
                "Author ES": {
                    rich_text: [
                        {
                            text: {
                                content: author_es || "Desconocido"
                            }
                        }
                    ]
                },
                "Quote EN": {
                    rich_text: [
                        {
                            text: {
                                content: quote_en
                            }
                        }
                    ]
                },
                "Author EN": {
                    rich_text: [
                        {
                            text: {
                                content: author_en || "Unknown"
                            }
                        }
                    ]
                }
            }
        };
        
        console.log('Database payload:', JSON.stringify(payload, null, 2));
        
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
        console.log('Notion DB Response:', {
            status: response.status,
            body: responseText.substring(0, 1000)
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Intentar con estructura alternativa (más simple)
            const simplePayload = {
                parent: {
                    type: "database_id",
                    database_id: NOTION_DATABASE_ID
                },
                properties: {
                    "Name": {
                        title: [
                            {
                                text: {
                                    content: `Cita ${date}`
                                }
                            }
                        ]
                    }
                }
            };
            
            console.log('Trying simple payload...');
            const simpleResponse = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(simplePayload)
            });
            
            const simpleResponseText = await simpleResponse.text();
            
            return res.status(400).json({
                error: 'Database save failed',
                originalError: errorDetails,
                simpleTest: {
                    status: simpleResponse.status,
                    response: simpleResponseText.substring(0, 500)
                },
                suggestion: "Check your database property names in Notion"
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Saved to Notion database',
            pageId: data.id,
            url: data.url
        });
        
    } catch (error) {
        console.error('Database save error:', error);
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}
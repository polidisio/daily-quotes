// api/save-quote-simple-db.js - Versión para database sin propiedades
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
        
        console.log('Simple save to database...');
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({ 
                error: 'Missing configuration'
            });
        }
        
        // Payload SIMPLE que funciona con database básica
        // Notion requiere al menos una propiedad "title"
        const payload = {
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
                // Esta es la propiedad OBLIGATORIA en Notion databases
                "Name": {
                    title: [
                        {
                            text: {
                                content: `"${quote_es}" — ${author_es}`
                            }
                        }
                    ]
                }
            },
            // Añadir contenido como bloques (funciona incluso sin propiedades)
            children: [
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [
                            {
                                text: {
                                    content: "📅 " + date
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "quote",
                    quote: {
                        rich_text: [
                            {
                                text: {
                                    content: quote_es
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                text: {
                                    content: "— " + (author_es || "Desconocido"),
                                    annotations: { italic: true }
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "divider",
                    divider: {}
                },
                {
                    object: "block",
                    type: "heading_3",
                    heading_3: {
                        rich_text: [
                            {
                                text: {
                                    content: "🇬🇧 English Version"
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "quote",
                    quote: {
                        rich_text: [
                            {
                                text: {
                                    content: quote_en
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                text: {
                                    content: "— " + (author_en || "Unknown"),
                                    annotations: { italic: true }
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "divider",
                    divider: {}
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                text: {
                                    content: "✨ Guardado desde ",
                                    annotations: { color: "gray" }
                                }
                            },
                            {
                                text: {
                                    content: "Daily Quotes",
                                    annotations: { 
                                        color: "blue",
                                        bold: true,
                                        link: { url: "https://daily-quotes.saraiba.eu" }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
        console.log('Sending simple payload...');
        
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
        console.log('Response:', {
            status: response.status,
            body: responseText.substring(0, 500)
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Si falla porque no tiene propiedades, sugerir setup
            if (response.status === 400 && responseText.includes('property')) {
                return res.status(400).json({
                    error: 'Database needs properties',
                    details: errorDetails,
                    suggestion: [
                        '1. Run setup: POST to /api/setup-database',
                        '2. Or manually add a "Name" column to your database',
                        '3. The column must be of type "Title"'
                    ]
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
            message: 'Quote saved with rich content blocks',
            pageId: data.id,
            url: data.url,
            note: 'Even without database columns, the quote is saved as a page with formatted content'
        });
        
    } catch (error) {
        console.error('Simple save error:', error);
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}
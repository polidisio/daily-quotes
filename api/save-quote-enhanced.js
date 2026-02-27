// api/save-quote-enhanced.js - Versión con más contenido
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
                received: { quote_es: !!quote_es, quote_en: !!quote_en, date: !!date }
            });
        }
        
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
        
        if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
            return res.status(500).json({ 
                error: 'Environment variables not set'
            });
        }
        
        // Payload con más contenido y mejor formato
        const payload = {
            parent: { 
                page_id: NOTION_PAGE_ID 
            },
            properties: {
                title: {
                    title: [
                        {
                            type: "text",
                            text: {
                                content: `📅 Cita del día - ${date}`
                            }
                        }
                    ]
                }
            },
            children: [
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "🇪🇸 Español"
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
                                type: "text",
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
                                type: "text",
                                text: {
                                    content: `— ${author_es}`,
                                    annotations: { italic: true }
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "🇬🇧 English"
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
                                type: "text",
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
                                type: "text",
                                text: {
                                    content: `— ${author_en}`,
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
                                type: "text",
                                text: {
                                    content: "✨ Guardado automáticamente desde ",
                                    annotations: { color: "gray" }
                                }
                            },
                            {
                                type: "text",
                                text: {
                                    content: "Daily Quotes",
                                    annotations: { 
                                        color: "blue",
                                        bold: true 
                                    }
                                }
                            },
                            {
                                type: "text",
                                text: {
                                    content: " • ",
                                    annotations: { color: "gray" }
                                }
                            },
                            {
                                type: "text",
                                text: {
                                    content: "daily-quotes.saraiba.eu",
                                    annotations: { 
                                        color: "purple",
                                        link: { url: "https://daily-quotes.saraiba.eu" }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
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
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            return res.status(response.status).json({ 
                error: 'Failed to save enhanced quote',
                details: errorDetails
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            method: 'enhanced_page',
            pageId: data.id,
            url: data.url,
            note: 'Quote saved with rich formatting. Check your Notion page.'
        });
        
    } catch (error) {
        console.error('Enhanced save error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
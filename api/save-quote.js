// api/save-quote.js - Versión simplificada y robusta
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { quote_es, quote_en, author_es, author_en, date } = req.body;
        
        // Validar datos requeridos
        if (!quote_es || !quote_en || !date) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['quote_es', 'quote_en', 'date']
            });
        }
        
        // Obtener variables de entorno
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
        
        console.log('Notion Config:', {
            hasApiKey: !!NOTION_API_KEY,
            hasPageId: !!NOTION_PAGE_ID,
            pageIdLength: NOTION_PAGE_ID?.length
        });
        
        if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
            console.error('Notion environment variables not configured');
            return res.status(500).json({ 
                error: 'Server configuration error',
                message: 'NOTION_API_KEY or NOTION_PAGE_ID not set'
            });
        }
        
        // Validar Page ID
        const pageIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!pageIdRegex.test(NOTION_PAGE_ID)) {
            return res.status(400).json({
                error: 'Invalid Notion Page ID format',
                expected: 'UUID format: 12345678-1234-1234-1234-123456789abc',
                received: NOTION_PAGE_ID
            });
        }
        
        // Crear payload SIMPLIFICADO para Notion
        // Solo título básico, sin propiedades complejas
        const payload = {
            parent: { 
                type: "page_id",
                page_id: NOTION_PAGE_ID 
            },
            properties: {
                title: {
                    title: [
                        {
                            text: {
                                content: `Cita ${date}: ${quote_es.substring(0, 50)}...`
                            }
                        }
                    ]
                }
            },
            children: [
                {
                    object: 'block',
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{ 
                            text: { content: `📅 ${date}` } 
                        }]
                    }
                },
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            { 
                                text: { 
                                    content: `🇪🇸 Español: `,
                                    annotations: { bold: true }
                                } 
                            },
                            { 
                                text: { 
                                    content: `"${quote_es}"`
                                } 
                            }
                        ]
                    }
                },
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            { 
                                text: { 
                                    content: `👤 Autor: ${author_es || 'Desconocido'}`
                                } 
                            }
                        ]
                    }
                },
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            { 
                                text: { 
                                    content: `🇬🇧 English: `,
                                    annotations: { bold: true }
                                } 
                            },
                            { 
                                text: { 
                                    content: `"${quote_en}"`
                                } 
                            }
                        ]
                    }
                },
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            { 
                                text: { 
                                    content: `👤 Author: ${author_en || 'Unknown'}`
                                } 
                            }
                        ]
                    }
                }
            ]
        };
        
        console.log('Sending to Notion API:', JSON.stringify(payload, null, 2));
        
        // Crear página en Notion
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
        console.log('Notion API Response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            return res.status(response.status).json({ 
                error: 'Failed to save to Notion',
                status: response.status,
                details: errorDetails,
                requestId: response.headers.get('x-request-id')
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            notionPageId: data.id,
            url: data.url,
            message: 'Quote saved successfully to Notion'
        });
        
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
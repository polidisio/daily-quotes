// api/save-quote-debug.js - Versión con máximo debugging
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { quote_es, quote_en, author_es, author_en, date } = req.body;
        
        console.log('=== NOTION DEBUG REQUEST ===');
        console.log('Request body:', req.body);
        console.log('Headers:', req.headers);
        
        // Validar
        if (!quote_es || !quote_en || !date) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: { quote_es: !!quote_es, quote_en: !!quote_en, date: !!date }
            });
        }
        
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
        
        console.log('Environment:', {
            NOTION_API_KEY: NOTION_API_KEY ? '***' + NOTION_API_KEY.slice(-4) : 'NOT SET',
            NOTION_PAGE_ID: NOTION_PAGE_ID,
            NODE_ENV: process.env.NODE_ENV
        });
        
        if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
            const error = {
                error: 'Environment variables not set',
                NOTION_API_KEY: !!NOTION_API_KEY,
                NOTION_PAGE_ID: !!NOTION_PAGE_ID,
                suggestion: 'Check Vercel environment variables'
            };
            console.error('Config error:', error);
            return res.status(500).json(error);
        }
        
        // Validar formato de Page ID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(NOTION_PAGE_ID);
        
        if (!isValidUUID) {
            const error = {
                error: 'Invalid Page ID format',
                received: NOTION_PAGE_ID,
                expected: 'UUID format like: 12345678-1234-1234-1234-123456789abc',
                suggestion: 'Get the Page ID from the Notion URL (the part after the last dash)'
            };
            console.error('Page ID error:', error);
            return res.status(400).json(error);
        }
        
        // PRIMERO: Intentar obtener información de la página
        console.log('Fetching page info from Notion...');
        let pageInfo = null;
        try {
            const pageResponse = await fetch(`https://api.notion.com/v1/pages/${NOTION_PAGE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            
            const pageResponseText = await pageResponse.text();
            console.log('Page info response:', {
                status: pageResponse.status,
                statusText: pageResponse.statusText,
                body: pageResponseText.substring(0, 1000)
            });
            
            if (pageResponse.ok) {
                pageInfo = JSON.parse(pageResponseText);
                console.log('Page info:', {
                    object: pageInfo.object,
                    id: pageInfo.id,
                    url: pageInfo.url,
                    parentType: pageInfo.parent?.type,
                    properties: Object.keys(pageInfo.properties || {})
                });
            }
        } catch (pageError) {
            console.error('Failed to fetch page info:', pageError.message);
        }
        
        // SEGUNDO: Intentar diferentes payloads
        
        // Payload 1: Página simple (mínimo)
        const payload1 = {
            parent: { 
                page_id: NOTION_PAGE_ID 
            },
            properties: {
                title: {
                    title: [
                        {
                            type: "text",
                            text: {
                                content: `Cita ${date}`
                            }
                        }
                    ]
                }
            }
        };
        
        // Payload 2: Con contenido
        const payload2 = {
            parent: { 
                page_id: NOTION_PAGE_ID 
            },
            properties: {
                title: {
                    title: [
                        {
                            type: "text",
                            text: {
                                content: `Cita: ${quote_es.substring(0, 30)}...`
                            }
                        }
                    ]
                }
            },
            children: [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: `🇪🇸 ${quote_es} - ${author_es}`
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
        // Payload 3: Si es database
        const payload3 = {
            parent: {
                database_id: NOTION_PAGE_ID
            },
            properties: {
                "Title": {
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
        
        console.log('Trying payload 1 (minimal)...');
        const result1 = await tryPayload(payload1, NOTION_API_KEY);
        
        if (result1.success) {
            console.log('✅ Success with payload 1');
            return res.status(200).json({
                success: true,
                method: 'minimal_page',
                pageId: result1.data.id,
                url: result1.data.url
            });
        }
        
        console.log('Payload 1 failed, trying payload 2...');
        const result2 = await tryPayload(payload2, NOTION_API_KEY);
        
        if (result2.success) {
            console.log('✅ Success with payload 2');
            return res.status(200).json({
                success: true,
                method: 'page_with_content',
                pageId: result2.data.id,
                url: result2.data.url
            });
        }
        
        console.log('Payload 2 failed, trying payload 3 (database)...');
        const result3 = await tryPayload(payload3, NOTION_API_KEY);
        
        if (result3.success) {
            console.log('✅ Success with payload 3 (database)');
            return res.status(200).json({
                success: true,
                method: 'database',
                pageId: result3.data.id,
                url: result3.data.url,
                note: 'Your Page ID appears to be a Database ID'
            });
        }
        
        // Todos fallaron
        const finalError = {
            error: 'All save attempts failed',
            attempts: [
                { payload: 'minimal_page', error: result1.error },
                { payload: 'page_with_content', error: result2.error },
                { payload: 'database', error: result3.error }
            ],
            pageInfo: pageInfo ? {
                object: pageInfo.object,
                parentType: pageInfo.parent?.type,
                url: pageInfo.url
            } : null,
            environment: {
                hasApiKey: !!NOTION_API_KEY,
                pageId: NOTION_PAGE_ID,
                pageIdValid: isValidUUID
            },
            suggestions: [
                '1. Verify the integration has access to the page',
                '2. Check if the Page ID is for a page or database',
                '3. Try creating a new page in Notion and use its ID',
                '4. Check Notion integration permissions'
            ]
        };
        
        console.error('All attempts failed:', finalError);
        return res.status(400).json(finalError);
        
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: error.stack
        });
    }
}

async function tryPayload(payload, apiKey) {
    try {
        console.log('Trying payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        console.log('Response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 2000)
        });
        
        if (response.ok) {
            return {
                success: true,
                data: JSON.parse(responseText)
            };
        } else {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            return {
                success: false,
                error: {
                    status: response.status,
                    details: errorDetails,
                    requestId: response.headers.get('x-request-id')
                }
            };
        }
        
    } catch (error) {
        console.error('Payload attempt error:', error);
        return {
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        };
    }
}
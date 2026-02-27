// api/test-notion.js - Minimal test endpoint
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
        
        console.log('Environment check:', {
            hasApiKey: !!NOTION_API_KEY,
            apiKeyPrefix: NOTION_API_KEY ? NOTION_API_KEY.substring(0, 10) + '...' : 'none',
            hasPageId: !!NOTION_PAGE_ID,
            pageId: NOTION_PAGE_ID
        });
        
        if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
            return res.status(500).json({
                error: 'Missing environment variables',
                NOTION_API_KEY: !!NOTION_API_KEY,
                NOTION_PAGE_ID: !!NOTION_PAGE_ID
            });
        }
        
        // Test 1: Simple page creation with minimal payload
        const testPayload = {
            parent: { 
                page_id: NOTION_PAGE_ID 
            },
            properties: {
                title: {
                    title: [
                        {
                            type: "text",
                            text: {
                                content: "Test Quote - " + new Date().toISOString()
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
                                    content: "This is a test quote from the daily-quotes app."
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
        console.log('Sending test payload to Notion...');
        
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });
        
        const responseText = await response.text();
        console.log('Notion response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 500) + '...'
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Try to get more info about the page
            let pageInfo = null;
            try {
                const pageResponse = await fetch(`https://api.notion.com/v1/pages/${NOTION_PAGE_ID}`, {
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28'
                    }
                });
                if (pageResponse.ok) {
                    pageInfo = await pageResponse.json();
                }
            } catch (pageError) {
                console.log('Could not fetch page info:', pageError.message);
            }
            
            return res.status(400).json({
                error: 'Notion API test failed',
                status: response.status,
                response: errorDetails,
                pageInfo: pageInfo ? {
                    object: pageInfo.object,
                    id: pageInfo.id,
                    url: pageInfo.url,
                    parentType: pageInfo.parent?.type
                } : null,
                testPayload: testPayload,
                suggestions: [
                    "Check that the Page ID is correct and the integration has access",
                    "Verify the Page ID is for a page (not a database) if using simple parent",
                    "Try using database parent instead: parent: { database_id: '...' }"
                ]
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Test successful! Notion API is working.',
            pageId: data.id,
            url: data.url,
            testPayload: testPayload
        });
        
    } catch (error) {
        console.error('Test error:', error);
        return res.status(500).json({
            error: 'Test failed',
            message: error.message,
            stack: error.stack
        });
    }
}
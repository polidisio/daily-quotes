// api/check-config.js - Diagnostic endpoint
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
        
        const config = {
            hasApiKey: !!NOTION_API_KEY,
            hasPageId: !!NOTION_PAGE_ID,
            pageId: NOTION_PAGE_ID ? `${NOTION_PAGE_ID.substring(0, 8)}...` : null,
            pageIdLength: NOTION_PAGE_ID?.length,
            pageIdValid: NOTION_PAGE_ID ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(NOTION_PAGE_ID) : false,
            environment: process.env.NODE_ENV || 'production',
            timestamp: new Date().toISOString()
        };
        
        // Intentar verificar token con Notion (opcional)
        let notionCheck = { success: false, error: 'Not attempted' };
        
        if (NOTION_API_KEY && NOTION_PAGE_ID) {
            try {
                const response = await fetch(`https://api.notion.com/v1/pages/${NOTION_PAGE_ID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${NOTION_API_KEY}`,
                        'Notion-Version': '2022-06-28'
                    }
                });
                
                notionCheck = {
                    success: response.ok,
                    status: response.status,
                    statusText: response.statusText
                };
                
            } catch (error) {
                notionCheck = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return res.status(200).json({
            success: true,
            config,
            notionCheck,
            endpoints: {
                saveQuote: '/api/save-quote (POST)',
                checkConfig: '/api/check-config (GET)'
            },
            instructions: config.hasApiKey && config.hasPageId 
                ? '✅ Configuration appears valid. Try saving a quote.'
                : '❌ Missing configuration. Check Vercel environment variables.'
        });
        
    } catch (error) {
        console.error('Diagnostic error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}
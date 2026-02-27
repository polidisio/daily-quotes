// api/save-quote.js - Guardar citas en Citas Diarias
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { quote_es, quote_en, author_es, author_en, date } = req.body;
        
        if (!quote_es || !quote_en || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Usar variables de entorno de Vercel
        const apiKey = process.env.NOTION_API_KEY;
        const dbId = process.env.NOTION_DATABASE_ID;
        
        if (!apiKey || !dbId) {
            return res.status(500).json({ 
                error: 'Missing configuration',
                hasApiKey: !!apiKey,
                hasDbId: !!dbId
            });
        }
        
        // Payload para database
        const payload = {
            parent: { database_id: dbId },
            properties: {
                "Nombre": {
                    title: [{ text: { content: `"${quote_es.substring(0, 40)}..."` } }]
                },
                "Cita": {
                    rich_text: [{ text: { content: quote_es } }]
                },
                "Autor": {
                    rich_text: [{ text: { content: author_es || "Desconocido" } }]
                },
                "Fecha": {
                    date: { start: date }
                },
                "Idioma": {
                    select: { name: quote_es !== quote_en ? "Bilingüe" : "Español" }
                }
            }
        };
        
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                error: 'Failed to save',
                details: errorText
            });
        }
        
        const data = await response.json();
        
        return res.status(200).json({
            success: true,
            pageId: data.id,
            url: data.url
        });
        
    } catch (error) {
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}

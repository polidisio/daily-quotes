// api/save-quote.js - Guardar citas en Citas Diarias
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
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
        
        // USAR EL DATABASE ID DIRECTAMENTE
        const NOTION_API_KEY = process.env.NOTION_API_KEY || "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";
        const NOTION_DATABASE_ID = "314eca7b-0db6-81cd-a7f7-dabe228c19f4";
        
        console.log('Saving to database:', NOTION_DATABASE_ID);
        
        // Payload para la database
        const payload = {
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {
                "Nombre": {
                    title: [{
                        text: { content: `"${quote_es.substring(0, 40)}..."` }
                    }]
                },
                "Cita": {
                    rich_text: [{
                        text: { content: quote_es }
                    }]
                },
                "Autor": {
                    rich_text: [{
                        text: { content: author_es || "Desconocido" }
                    }]
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
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Failed to save to Notion',
                details: responseText,
                databaseId: NOTION_DATABASE_ID
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Cita guardada en Citas Diarias',
            pageId: data.id,
            url: data.url
        });
        
    } catch (error) {
        console.error('Save error:', error);
        return res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
}
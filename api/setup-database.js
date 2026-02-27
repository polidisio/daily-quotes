// api/setup-database.js - Configura automáticamente la database
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Setting up database...', {
            databaseId: NOTION_DATABASE_ID ? `${NOTION_DATABASE_ID.substring(0, 8)}...` : 'none'
        });
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({
                error: 'Missing configuration',
                suggestion: 'Set NOTION_DATABASE_ID in Vercel'
            });
        }
        
        // Primero verificar si ya existe la database
        console.log('Checking current database...');
        let currentDb = null;
        try {
            const dbResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            
            if (dbResponse.ok) {
                currentDb = await dbResponse.json();
                console.log('Current database found:', {
                    title: currentDb.title?.[0]?.text?.content || 'Untitled',
                    properties: Object.keys(currentDb.properties || {})
                });
            }
        } catch (error) {
            console.log('Could not fetch database:', error.message);
        }
        
        // Si ya tiene propiedades, mostrarlas
        if (currentDb && currentDb.properties && Object.keys(currentDb.properties).length > 0) {
            return res.status(200).json({
                success: true,
                message: 'Database already has properties',
                properties: Object.keys(currentDb.properties),
                suggestion: 'Add these properties to your save-quote payload'
            });
        }
        
        // Actualizar la database para añadir propiedades
        console.log('Updating database with properties...');
        const updatePayload = {
            properties: {
                // Título (obligatorio en Notion)
                "Nombre": {
                    title: {}
                },
                // Propiedades para citas
                "Cita": {
                    rich_text: {}
                },
                "Cita EN": {
                    rich_text: {}
                },
                "Autor": {
                    rich_text: {}
                },
                "Autor EN": {
                    rich_text: {}
                },
                "Fecha": {
                    date: {}
                },
                "Idioma": {
                    select: {
                        options: [
                            { name: "Español", color: "blue" },
                            { name: "Inglés", color: "green" },
                            { name: "Bilingüe", color: "purple" }
                        ]
                    }
                },
                "Fuente": {
                    rich_text: {}
                }
            }
        };
        
        const updateResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });
        
        const responseText = await updateResponse.text();
        console.log('Update response:', {
            status: updateResponse.status,
            body: responseText.substring(0, 1000)
        });
        
        if (!updateResponse.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            // Intentar método alternativo: crear nueva database
            console.log('Trying to create new page with database...');
            
            // Necesitamos un page_id padre para crear nueva database
            // Esto es más complejo, mejor guiar al usuario
            
            return res.status(400).json({
                error: 'Failed to update database',
                details: errorDetails,
                suggestion: [
                    '1. Manually add columns to your "Citas Diarias" database in Notion',
                    '2. Required columns: "Cita" (Text), "Autor" (Text), "Fecha" (Date)',
                    '3. Optional: "Idioma" (Select), "Cita EN" (Text)',
                    '4. Then try saving a quote again'
                ]
            });
        }
        
        const updatedDb = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Database configured successfully!',
            properties: Object.keys(updatedDb.properties),
            nextSteps: [
                'Visit https://daily-quotes.saraiba.eu to save a test quote',
                'Check your "Citas Diarias" database in Notion',
                'The quote should appear with all fields filled'
            ]
        });
        
    } catch (error) {
        console.error('Setup error:', error);
        return res.status(500).json({
            error: 'Setup failed',
            message: error.message
        });
    }
}
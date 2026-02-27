// api/save-quote-smart.js - Versión inteligente que detecta propiedades
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
        const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
        
        console.log('Smart save starting...', {
            databaseId: NOTION_DATABASE_ID ? `${NOTION_DATABASE_ID.substring(0, 8)}...` : 'none',
            date: date,
            quoteLength: quote_es.length
        });
        
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            return res.status(500).json({ 
                error: 'Missing configuration',
                suggestion: 'Set NOTION_DATABASE_ID in Vercel environment variables'
            });
        }
        
        // PASO 1: Obtener schema de la database
        console.log('Fetching database schema...');
        let dbSchema = null;
        try {
            const dbResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            
            if (!dbResponse.ok) {
                const errorText = await dbResponse.text();
                return res.status(400).json({
                    error: 'Cannot access database',
                    status: dbResponse.status,
                    details: errorText,
                    suggestion: 'Share the "Citas Diarias" database with your Notion integration'
                });
            }
            
            dbSchema = await dbResponse.json();
            console.log('Database schema retrieved:', {
                title: dbSchema.title?.[0]?.text?.content || 'Untitled',
                propertyCount: Object.keys(dbSchema.properties || {}).length,
                properties: Object.keys(dbSchema.properties || {})
            });
            
        } catch (error) {
            console.error('Failed to fetch database schema:', error);
            return res.status(500).json({
                error: 'Failed to fetch database schema',
                message: error.message
            });
        }
        
        // PASO 2: Analizar propiedades y encontrar las correctas
        const properties = dbSchema.properties || {};
        const propertyNames = Object.keys(properties);
        
        console.log('Available properties:', propertyNames);
        
        // Buscar propiedades por patrones comunes
        const findProperty = (patterns, type = null) => {
            for (const pattern of patterns) {
                const lowerPattern = pattern.toLowerCase();
                for (const propName of propertyNames) {
                    const lowerPropName = propName.toLowerCase();
                    if (lowerPropName.includes(lowerPattern)) {
                        if (!type || properties[propName].type === type) {
                            return propName;
                        }
                    }
                }
            }
            return null;
        };
        
        // Mapear propiedades
        const titleProp = findProperty(['nombre', 'name', 'title', 'título']) || propertyNames[0];
        const dateProp = findProperty(['fecha', 'date'], 'date');
        const quoteProp = findProperty(['cita', 'quote', 'texto', 'text', 'content', 'contenido']);
        const authorProp = findProperty(['autor', 'author', 'escritor', 'writer']);
        const languageProp = findProperty(['idioma', 'language', 'lengua', 'lang']);
        
        console.log('Detected properties:', {
            title: titleProp,
            date: dateProp,
            quote: quoteProp,
            author: authorProp,
            language: languageProp
        });
        
        // PASO 3: Construir payload dinámico
        const payload = {
            parent: { database_id: NOTION_DATABASE_ID },
            properties: {}
        };
        
        // Añadir propiedades según lo detectado
        if (titleProp) {
            payload.properties[titleProp] = {
                title: [{ 
                    text: { 
                        content: `"${quote_es.substring(0, 60)}${quote_es.length > 60 ? '...' : ''}"`
                    } 
                }]
            };
        }
        
        if (dateProp && properties[dateProp].type === 'date') {
            payload.properties[dateProp] = {
                date: { start: date }
            };
        }
        
        if (quoteProp) {
            const propType = properties[quoteProp].type;
            if (propType === 'rich_text' || propType === 'title') {
                payload.properties[quoteProp] = {
                    rich_text: [{ text: { content: quote_es } }]
                };
            }
        }
        
        if (authorProp) {
            const propType = properties[authorProp].type;
            if (propType === 'rich_text' || propType === 'select' || propType === 'multi_select') {
                payload.properties[authorProp] = {
                    rich_text: [{ text: { content: author_es || "Desconocido" } }]
                };
            }
        }
        
        // Si hay espacio, añadir quote en inglés como propiedad adicional
        const availableProps = propertyNames.filter(p => !Object.keys(payload.properties).includes(p));
        if (availableProps.length > 0 && quote_en !== quote_es) {
            const englishProp = findProperty(['english', 'inglés', 'en', 'quote en'], 'rich_text') || availableProps[0];
            if (englishProp) {
                payload.properties[englishProp] = {
                    rich_text: [{ text: { content: quote_en } }]
                };
            }
        }
        
        console.log('Final payload properties:', Object.keys(payload.properties));
        console.log('Payload:', JSON.stringify(payload, null, 2));
        
        // PASO 4: Guardar en Notion
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
        console.log('Notion response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 500)
        });
        
        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText);
            } catch {
                errorDetails = responseText;
            }
            
            return res.status(response.status).json({
                error: 'Failed to save to database',
                status: response.status,
                details: errorDetails,
                detectedProperties: {
                    title: titleProp,
                    date: dateProp,
                    quote: quoteProp,
                    author: authorProp,
                    language: languageProp
                },
                allProperties: propertyNames,
                suggestion: 'Check property types in your Notion database'
            });
        }
        
        const data = JSON.parse(responseText);
        
        return res.status(200).json({
            success: true,
            message: 'Quote saved to Citas Diarias database',
            pageId: data.id,
            url: data.url,
            detectedProperties: {
                title: titleProp,
                date: dateProp,
                quote: quoteProp,
                author: authorProp,
                language: languageProp
            },
            propertiesUsed: Object.keys(payload.properties),
            note: 'The quote should now appear in your Citas Diarias database with all fields filled'
        });
        
    } catch (error) {
        console.error('Smart save error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
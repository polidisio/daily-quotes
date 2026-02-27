// Script para testear acceso a Notion
const fs = require('fs');

const testScript = `
// Test de acceso a Notion API
async function testNotionAccess() {
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_PAGE_ID;
    
    console.log('Testing Notion access...');
    console.log('API Key present:', !!NOTION_API_KEY);
    console.log('Database ID present:', !!NOTION_DATABASE_ID);
    
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
        console.error('Missing environment variables');
        return;
    }
    
    try {
        // Test 1: Verificar database
        const dbResponse = await fetch(\`https://api.notion.com/v1/databases/\${NOTION_DATABASE_ID}\`, {
            headers: {
                'Authorization': \`Bearer \${NOTION_API_KEY}\`,
                'Notion-Version': '2022-06-28'
            }
        });
        
        console.log('Database test:', {
            status: dbResponse.status,
            statusText: dbResponse.statusText
        });
        
        if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            console.log('Database info:', {
                title: dbData.title?.[0]?.text?.content || 'Untitled',
                properties: Object.keys(dbData.properties || {})
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Ejecutar test
testNotionAccess();
`;

fs.writeFileSync('test-access.js', testScript);
console.log('Test script created. Run with: node test-access.js');

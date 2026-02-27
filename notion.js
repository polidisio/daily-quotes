// notion-debug.js - Versión con debugging mejorado
const DEBUG = true;

// Detect language
const userLang = navigator.language || navigator.userLanguage;
const isSpanish = userLang.startsWith('es');

const translations = {
    es: {
        loading: 'Cargando cita del día...',
        quoteOf: 'Cita del',
        saving: 'Guardando en Notion...',
        saved: 'Guardado en Notion ✓',
        error: 'Error al guardar',
        testing: 'Probando conexión...',
        ready: 'Listo'
    },
    en: {
        loading: 'Loading quote of the day...',
        quoteOf: 'Quote of',
        saving: 'Saving to Notion...',
        saved: 'Saved to Notion ✓',
        error: 'Error saving',
        testing: 'Testing connection...',
        ready: 'Ready'
    }
};

const t = translations[isSpanish ? 'es' : 'en'];

// Citas (igual que antes)
const fallbackQuotes = isSpanish ? [
    { text: "El conocimiento es poder.", author: "Francis Bacon" },
    { text: "Yo soy aquello que soy", author: "Popeye" },
    // ... resto de citas
] : [
    { text: "Knowledge is power.", author: "Francis Bacon" },
    { text: "I am what I am", author: "Popeye" },
    // ... resto de citas
];

// Get current date
const today = new Date();
const dateStr = today.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});
const isoDate = today.toISOString().split('T')[0];

// Set current date in status bar
document.getElementById('currentDate').textContent = dateStr;

// Function to get daily quote
function getDailyQuote() {
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % fallbackQuotes.length;
    return fallbackQuotes[index];
}

// Get both quotes
function getBothQuotes() {
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    const esQuotes = [
        { text: "El conocimiento es poder.", author: "Francis Bacon" },
        { text: "Yo soy aquello que soy", author: "Popeye" },
        // ... resto
    ];
    
    const enQuotes = [
        { text: "Knowledge is power.", author: "Francis Bacon" },
        { text: "I am what I am", author: "Popeye" },
        // ... resto
    ];
    
    return {
        es: esQuotes[dayOfYear % esQuotes.length],
        en: enQuotes[dayOfYear % enQuotes.length]
    };
}

// Test Notion connection first
async function testNotionConnection() {
    try {
        if (DEBUG) console.log('Testing Notion connection...');
        
        const response = await fetch('/api/test-notion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: true })
        });
        
        const result = await response.json();
        
        if (DEBUG) console.log('Test result:', result);
        
        return {
            success: response.ok,
            data: result,
            status: response.status
        };
        
    } catch (error) {
        if (DEBUG) console.error('Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Save to Notion (try multiple methods)
async function saveToNotion() {
    const quotes = getBothQuotes();
    const data = {
        quote_es: quotes.es.text,
        quote_en: quotes.en.text,
        author_es: quotes.es.author,
        author_en: quotes.en.author,
        date: isoDate
    };
    
    if (DEBUG) console.log('Saving data:', data);
    
    // Método 1: API normal
    try {
        document.getElementById('status').textContent = t.saving + ' (método 1)...';
        
        const response = await fetch('/api/save-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (DEBUG) console.log('Success with method 1:', result);
            return { success: true, method: 'normal', data: result };
        } else {
            if (DEBUG) console.log('Method 1 failed:', result);
            
            // Método 2: Database version
            document.getElementById('status').textContent = t.saving + ' (método 2)...';
            
            const dbResponse = await fetch('/api/save-quote-db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const dbResult = await dbResponse.json();
            
            if (dbResponse.ok) {
                if (DEBUG) console.log('Success with method 2 (DB):', dbResult);
                return { success: true, method: 'database', data: dbResult };
            } else {
                if (DEBUG) console.log('Method 2 also failed:', dbResult);
                return { 
                    success: false, 
                    error: 'All methods failed',
                    details: {
                        method1: result,
                        method2: dbResult
                    }
                };
            }
        }
        
    } catch (error) {
        if (DEBUG) console.error('Save error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Check if already saved today
function hasSavedToday() {
    const lastSaved = localStorage.getItem('quoteSavedDate');
    return lastSaved === isoDate;
}

// Mark as saved
function markAsSaved() {
    localStorage.setItem('quoteSavedDate', isoDate);
}

// Display the quote
const quote = getDailyQuote();

// Set loading text
document.getElementById('quote').textContent = t.loading;

// Load quote and test/save
setTimeout(async () => {
    document.getElementById('quote').textContent = `"${quote.text}"`;
    document.getElementById('author').textContent = `— ${quote.author}`;
    document.getElementById('date').textContent = `${t.quoteOf} ${dateStr}`;
    
    // Check if already saved
    if (hasSavedToday()) {
        document.getElementById('status').textContent = t.saved + ' (hoy)';
        return;
    }
    
    // Test connection first
    document.getElementById('status').textContent = t.testing;
    const testResult = await testNotionConnection();
    
    if (!testResult.success) {
        document.getElementById('status').textContent = `${t.error}: Conexión fallida`;
        if (DEBUG) console.error('Connection test failed:', testResult);
        return;
    }
    
    // Try to save
    const saveResult = await saveToNotion();
    
    if (saveResult.success) {
        markAsSaved();
        document.getElementById('status').textContent = `${t.saved} (${saveResult.method})`;
        if (DEBUG) console.log('Save successful:', saveResult);
    } else {
        document.getElementById('status').textContent = `${t.error}: Ver consola`;
        if (DEBUG) console.error('Save failed:', saveResult);
        
        // Show error details in console
        console.error('=== NOTION SAVE ERROR ===');
        console.error('Date:', isoDate);
        console.error('Quote:', quote);
        console.error('Error details:', saveResult);
        console.error('=== END ERROR ===');
    }
}, 500);

// Add debug panel
function addDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        max-width: 300px;
        z-index: 1000;
        display: ${DEBUG ? 'block' : 'none'};
    `;
    
    panel.innerHTML = `
        <div><strong>Debug Mode</strong></div>
        <div>Date: ${isoDate}</div>
        <div>Saved today: ${hasSavedToday() ? 'Yes' : 'No'}</div>
        <button onclick="location.reload()">Reload</button>
        <button onclick="localStorage.removeItem('quoteSavedDate'); location.reload();">Reset Save</button>
    `;
    
    document.body.appendChild(panel);
}

if (DEBUG) {
    addDebugPanel();
    console.log('Daily Quotes Debug Mode Enabled');
    console.log('Date:', isoDate, dateStr);
    console.log('Quote:', getDailyQuote());
    console.log('API Endpoints:');
    console.log('- /api/save-quote');
    console.log('- /api/save-quote-db');
    console.log('- /api/test-notion');
}
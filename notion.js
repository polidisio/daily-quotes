// notion-visible-errors.js - Muestra errores en pantalla
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
        ready: 'Listo',
        debug: 'Modo depuración',
        showDetails: 'Mostrar detalles',
        hideDetails: 'Ocultar detalles'
    },
    en: {
        loading: 'Loading quote of the day...',
        quoteOf: 'Quote of',
        saving: 'Saving to Notion...',
        saved: 'Saved to Notion ✓',
        error: 'Error saving',
        testing: 'Testing connection...',
        ready: 'Ready',
        debug: 'Debug mode',
        showDetails: 'Show details',
        hideDetails: 'Hide details'
    }
};

const t = translations[isSpanish ? 'es' : 'en'];

// Citas (versión corta para ejemplo)
const fallbackQuotes = isSpanish ? [
    { text: "El conocimiento es poder.", author: "Francis Bacon" },
    { text: "Yo soy aquello que soy", author: "Popeye" },
    { text: "Que la fuerza te acompañe", author: "Yoda" }
] : [
    { text: "Knowledge is power.", author: "Francis Bacon" },
    { text: "I am what I am", author: "Popeye" },
    { text: "May the Force be with you", author: "Yoda" }
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
        { text: "Que la fuerza te acompañe", author: "Yoda" }
    ];
    
    const enQuotes = [
        { text: "Knowledge is power.", author: "Francis Bacon" },
        { text: "I am what I am", author: "Popeye" },
        { text: "May the Force be with you", author: "Yoda" }
    ];
    
    return {
        es: esQuotes[dayOfYear % esQuotes.length],
        en: enQuotes[dayOfYear % enQuotes.length]
    };
}

// Display error on page
function showErrorOnPage(title, error, details = null) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-display';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ffebee;
        border: 2px solid #f44336;
        border-radius: 8px;
        padding: 15px;
        max-width: 500px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Roboto', sans-serif;
    `;
    
    let detailsHtml = '';
    if (details) {
        detailsHtml = `
            <div style="margin-top: 10px; font-size: 12px;">
                <strong>Detalles:</strong>
                <pre style="background: white; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;">
${JSON.stringify(details, null, 2)}
                </pre>
            </div>
        `;
    }
    
    errorDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #d32f2f;">⚠️ ${title}</strong>
            <button onclick="document.getElementById('error-display').remove()" 
                    style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">
                ×
            </button>
        </div>
        <div style="margin-top: 8px; color: #333;">
            ${error}
        </div>
        ${detailsHtml}
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
            <button onclick="copyErrorToClipboard()" style="padding: 4px 8px; margin-right: 5px;">
                📋 Copiar error
            </button>
            <button onclick="location.reload()" style="padding: 4px 8px;">
                🔄 Reintentar
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Add to window for button functions
    window.copyErrorToClipboard = function() {
        const errorText = `Error: ${title}\n${error}\n${details ? JSON.stringify(details, null, 2) : ''}`;
        navigator.clipboard.writeText(errorText).then(() => {
            alert('Error copiado al portapapeles');
        });
    };
}

// Save to Notion with detailed error reporting
async function saveToNotion() {
    const quotes = getBothQuotes();
    const data = {
        quote_es: quotes.es.text,
        quote_en: quotes.en.text,
        author_es: quotes.es.author,
        author_en: quotes.en.author,
        date: isoDate
    };
    
    console.log('📤 Enviando a Notion:', data);
    
    try {
        document.getElementById('status').textContent = t.saving;
        
        const response = await fetch('/api/save-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('📥 Respuesta de Notion:', result);
        
        if (response.ok) {
            return { 
                success: true, 
                data: result,
                message: `Guardado en columnas organizadas`
            };
        } else {
            // Mostrar error en pantalla
            showErrorOnPage(
                'Error al guardar en Notion',
                `Status: ${response.status} - ${result.error || 'Error desconocido'}`,
                result
            );
            
            return { 
                success: false, 
                error: result,
                status: response.status
            };
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        
        showErrorOnPage(
            'Error de conexión',
            `No se pudo conectar con el servidor: ${error.message}`,
            { stack: error.stack }
        );
        
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

// Load quote and save
setTimeout(async () => {
    document.getElementById('quote').textContent = `"${quote.text}"`;
    document.getElementById('author').textContent = `— ${quote.author}`;
    document.getElementById('date').textContent = `${t.quoteOf} ${dateStr}`;
    
    // Check if already saved
    if (hasSavedToday()) {
        document.getElementById('status').textContent = t.saved + ' (hoy)';
        return;
    }
    
    // Try to save
    const saveResult = await saveToNotion();
    
    if (saveResult.success) {
        markAsSaved();
        document.getElementById('status').textContent = `${t.saved} ✓`;
        
        // Mostrar éxito
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e8f5e9;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        successDiv.innerHTML = `
            <strong>✅ Guardado en Notion</strong>
            <div style="margin-top: 5px; font-size: 14px;">
                Método: ${saveResult.data.method}<br>
                <a href="${saveResult.data.url}" target="_blank" style="color: #2196f3;">
                    Ver en Notion
                </a>
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="position: absolute; top: 5px; right: 5px; background: none; border: none; cursor: pointer;">
                ×
            </button>
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, 5000);
        
    } else {
        document.getElementById('status').textContent = `${t.error} ❌`;
        
        // El error ya se muestra con showErrorOnPage
        console.error('Error completo:', saveResult);
    }
}, 500);

// Add debug info panel
function addDebugInfo() {
    const info = document.createElement('div');
    info.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 11px;
        z-index: 1000;
        max-width: 300px;
    `;
    
    info.innerHTML = `
        <div><strong>${t.debug}</strong></div>
        <div>Fecha: ${isoDate}</div>
        <div>Guardado hoy: ${hasSavedToday() ? 'Sí' : 'No'}</div>
        <div>API: /api/save-quote-debug</div>
        <div style="margin-top: 5px;">
            <button onclick="localStorage.removeItem('quoteSavedDate'); location.reload();" 
                    style="padding: 3px 6px; font-size: 10px;">
                🔄 Reset save
            </button>
            <button onclick="console.clear(); location.reload();" 
                    style="padding: 3px 6px; font-size: 10px; margin-left: 5px;">
                🧹 Clear console
            </button>
        </div>
    `;
    
    document.body.appendChild(info);
}

// Initialize
if (DEBUG) {
    addDebugInfo();
    console.log('=== DAILY QUOTES DEBUG ===');
    console.log('Date:', isoDate, dateStr);
    console.log('Quote:', quote);
    console.log('LocalStorage saved:', hasSavedToday());
    console.log('API endpoint:', '/api/save-quote-debug');
    console.log('=======================');
}
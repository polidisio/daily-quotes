// Configuración de Notion
// IMPORTANTE: Configurar estas variables en Vercel Dashboard > Settings > Environment Variables
// NOTION_API_KEY: Tu API key de Notion
// NOTION_PAGE_ID: ID de la página de Notion donde guardar las citas

const NOTION_API_KEY = "TU_NOTION_API_KEY";  // Reemplazar en Vercel
const NOTION_PAGE_ID = "TU_NOTION_PAGE_ID";  // Reemplazar en Vercel

// Array de citas famous (como fallback)
const fallbackQuotes = [
    { text: "El conocimiento es poder.", author: "Francis Bacon" },
    { text: "Yo soy aquello que soy", author: "Popeye" },
    { text: "Que la fuerza te acompañe", author: "Yoda" },
    { text: "¡Elemental, querido Watson!", author: "Sherlock Holmes" },
    { text: "Hay algo en este barrio que no me gusta", author: "Batman" },
    { text: "Con gran poder viene gran responsabilidad", author: "Tío Ben" },
    { text: "Que el odds estén siempre a tu favor", author: "Han Solo" },
    { text: "Todo el mundo sospecha de alguien", author: "Agatha Christie" },
    { text: "No pienses, siente", author: "Bruce Lee" },
    { text: "Yo soy tu padre", author: "Darth Vader" },
    { text: "Después de todo, mañana es otro día", author: "Scarlett O'Hara" },
    { text: "La fuerza es fuerte en mi familia", author: "Luke Skywalker" },
    { text: "Volveré", author: "Terminator" },
    { text: "E.T. teléfono casa", author: "E.T." },
    { text: "Soy el rey del mundo", author: "Jack Dawson" },
    { text: "La vida es como una caja de bombones", author: "Forrest Gump" },
    { text: "Yo solo se que no se nada", author: "Sócrates" },
    { text: "Pienso luego existo", author: "Descartes" },
    { text: "Era inevitable", author: "Thanos" },
    { text: "Buena navegación", author: "Capitán Manthan" },
    { text: "Houston, tenemos un problema", author: "Apollo 13" },
    { text: "Bond. James Bond", author: "James Bond" },
    { text: "Era viernes", author: "El Mundo" }
];

// Obtener la fecha actual
const today = new Date();
const dateStr = today.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});

document.getElementById('currentDate').textContent = dateStr;

// Función para obtener una cita basada en la fecha
function getDailyQuote() {
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % fallbackQuotes.length;
    return fallbackQuotes[index];
}

// Guardar en Notion (se llama automáticamente)
async function saveToNotion(quote, dateStr) {
    if (NOTION_API_KEY === "TU_NOTION_API_KEY" || !NOTION_API_KEY) {
        console.log('⚠️ API key de Notion no configurada');
        return false;
    }
    
    try {
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + NOTION_API_KEY,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { page_id: NOTION_PAGE_ID },
                properties: {
                    title: [
                        {
                            text: {
                                content: `Cita: "${quote.text}" - ${quote.author}`
                            }
                        }
                    ]
                },
                children: [
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: `Fecha: ${dateStr}`
                                    }
                                }
                            ]
                        }
                    }
                ]
            })
        });
        
        if (response.ok) {
            console.log('✅ Cita guardada en Notion');
            return true;
        } else {
            console.log('⚠️ No se pudo guardar en Notion');
            return false;
        }
    } catch (e) {
        console.log('Error:', e);
        return false;
    }
}

// Verificar si ya se guardó hoy (usando localStorage)
function hasSavedToday() {
    const lastSaved = localStorage.getItem('quoteSavedDate');
    const todayStr = today.toISOString().split('T')[0];
    return lastSaved === todayStr;
}

// Marcar como guardado hoy
function markAsSaved() {
    const todayStr = today.toISOString().split('T')[0];
    localStorage.setItem('quoteSavedDate', todayStr);
}

// Mostrar la cita
const quote = getDailyQuote();

// Simular carga
setTimeout(async () => {
    document.getElementById('quote').textContent = `"${quote.text}"`;
    document.getElementById('author').textContent = `— ${quote.author}`;
    document.getElementById('date').textContent = `Cita del ${dateStr}`;
    document.getElementById('status').textContent = 'Listo';
    
    // Auto-guardar en Notion si no se ha guardado hoy
    if (!hasSavedToday()) {
        document.getElementById('status').textContent = 'Guardando...';
        await saveToNotion(quote, dateStr);
        markAsSaved();
        document.getElementById('status').textContent = 'Listo ✓';
    }
}, 500);

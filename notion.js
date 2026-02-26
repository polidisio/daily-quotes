// Configuración de Notion
// IMPORTANTE: Configurar estas variables en Vercel Dashboard > Settings > Environment Variables
// NOTION_API_KEY: Tu API key de Notion
// NOTION_PAGE_ID: ID de la página de Notion donde guardar las citas

const NOTION_API_KEY = "TU_NOTION_API_KEY";
const NOTION_PAGE_ID = "TU_NOTION_PAGE_ID";

// Detect language
const userLang = navigator.language || navigator.userLanguage;
const isSpanish = userLang.startsWith('es');

const translations = {
    es: {
        loading: 'Cargando cita del día...',
        quoteOf: 'Cita del',
        saving: 'Guardando...',
        saved: 'Guardado ✓',
        ready: 'Listo'
    },
    en: {
        loading: 'Loading quote of the day...',
        quoteOf: 'Quote of',
        saving: 'Saving...',
        saved: 'Saved ✓',
        ready: 'Ready'
    }
};

const t = translations[isSpanish ? 'es' : 'en'];

// Citas famous
const fallbackQuotes = isSpanish ? [
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
    { text: "Era viernes", author: "El Mundo" },
    { text: "Que la suerte te acompañe", author: "Various" }
] : [
    { text: "Knowledge is power.", author: "Francis Bacon" },
    { text: "I am what I am", author: "Popeye" },
    { text: "May the Force be with you", author: "Yoda" },
    { text: "Elementary, my dear Watson", author: "Sherlock Holmes" },
    { text: "There's something wrong with this neighborhood", author: "Batman" },
    { text: "With great power comes great responsibility", author: "Uncle Ben" },
    { text: "May the odds be ever in your favor", author: "Han Solo" },
    { text: "Everyone suspects someone", author: "Agatha Christie" },
    { text: "Don't think, feel", author: "Bruce Lee" },
    { text: "I am your father", author: "Darth Vader" },
    { text: "After all, tomorrow is another day", author: "Scarlett O'Hara" },
    { text: "The Force is strong in my family", author: "Luke Skywalker" },
    { text: "I'll be back", author: "Terminator" },
    { text: "E.T. phone home", author: "E.T." },
    { text: "I'm the king of the world", author: "Jack Dawson" },
    { text: "Life is like a box of chocolates", author: "Forrest Gump" },
    { text: "I know nothing", author: "Socrates" },
    { text: "I think, therefore I am", author: "Descartes" },
    { text: "It was inevitable", author: "Thanos" },
    { text: "Houston, we have a problem", author: "Apollo 13" },
    { text: "Bond. James Bond", author: "James Bond" },
    { text: "It's Friday", author: "Friday" },
    { text: "May luck be with you", author: "Various" }
];

// Get current date
const today = new Date();

// Format date based on language
const dateStr = today.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});

// Set current date in status bar
document.getElementById('currentDate').textContent = dateStr;

// Function to get daily quote based on date
function getDailyQuote() {
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % fallbackQuotes.length;
    return fallbackQuotes[index];
}

// Save to Notion
async function saveToNotion(quote, dateStr) {
    if (NOTION_API_KEY === "TU_NOTION_API_KEY" || !NOTION_API_KEY) {
        console.log('⚠️ API key de Notion no configurada');
        return false;
    }
    
    // Get both Spanish and English quotes
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const esQuotes = [
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
        { text: "Era viernes", author: "El Mundo" },
        { text: "Que la suerte te acompañe", author: "Various" }
    ];
    const enQuotes = [
        { text: "Knowledge is power.", author: "Francis Bacon" },
        { text: "I am what I am", author: "Popeye" },
        { text: "May the Force be with you", author: "Yoda" },
        { text: "Elementary, my dear Watson", author: "Sherlock Holmes" },
        { text: "There's something wrong with this neighborhood", author: "Batman" },
        { text: "With great power comes great responsibility", author: "Uncle Ben" },
        { text: "May the odds be ever in your favor", author: "Han Solo" },
        { text: "Everyone suspects someone", author: "Agatha Christie" },
        { text: "Don't think, feel", author: "Bruce Lee" },
        { text: "I am your father", author: "Darth Vader" },
        { text: "After all, tomorrow is another day", author: "Scarlett O'Hara" },
        { text: "The Force is strong in my family", author: "Luke Skywalker" },
        { text: "I'll be back", author: "Terminator" },
        { text: "E.T. phone home", author: "E.T." },
        { text: "I'm the king of the world", author: "Jack Dawson" },
        { text: "Life is like a box of chocolates", author: "Forrest Gump" },
        { text: "I know nothing", author: "Socrates" },
        { text: "I think, therefore I am", author: "Descartes" },
        { text: "It was inevitable", author: "Thanos" },
        { text: "Houston, we have a problem", author: "Apollo 13" },
        { text: "Bond. James Bond", author: "James Bond" },
        { text: "It's Friday", author: "Friday" },
        { text: "May luck be with you", author: "Various" }
    ];
    
    const esQuote = esQuotes[dayOfYear % esQuotes.length];
    const enQuote = enQuotes[dayOfYear % enQuotes.length];
    
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
                                content: `${esQuote.text} — ${esQuote.author} / ${enQuote.text} — ${enQuote.author}`
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
                                        content: `📅 Date: ${dateStr}`
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: `🇪🇸 ES: "${esQuote.text}" — ${esQuote.author}`
                                    }
                                }
                            ]
                        }
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: `🇬🇧 EN: "${enQuote.text}" — ${enQuote.author}`
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

// Check if already saved today (using localStorage)
function hasSavedToday() {
    const lastSaved = localStorage.getItem('quoteSavedDate');
    const todayStr = today.toISOString().split('T')[0];
    return lastSaved === todayStr;
}

// Mark as saved
function markAsSaved() {
    const todayStr = today.toISOString().split('T')[0];
    localStorage.setItem('quoteSavedDate', todayStr);
}

// Display the quote
const quote = getDailyQuote();

// Set loading text
document.getElementById('quote').textContent = t.loading;

// Load quote after a short delay
setTimeout(async () => {
    document.getElementById('quote').textContent = `"${quote.text}"`;
    document.getElementById('author').textContent = `— ${quote.author}`;
    document.getElementById('date').textContent = `${t.quoteOf} ${dateStr}`;
    document.getElementById('status').textContent = t.ready;
    
    // Auto-save to Notion if not saved today
    if (!hasSavedToday()) {
        document.getElementById('status').textContent = t.saving;
        await saveToNotion(quote, dateStr);
        markAsSaved();
        document.getElementById('status').textContent = t.saved;
    }
}, 500);

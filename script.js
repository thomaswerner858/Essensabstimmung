// =================================================================================================
// WICHTIG: KONFIGURATION MIT IHREN AIRTABLE-SCHLÜSSELN
// =================================================================================================

// 1. IHR PERSÖNLICHER AIRTABLE ZUGRIFFSTOKEN (PAT)
// Dies ist Ihr geheimer Schlüssel (beginnt mit pat...)
const AIRTABLE_API_KEY = 'pat1YYnqrx0vJoAfd.df54e2561e22689687b698cdd26680ddcd413603ada567255fe610a761325d8f'; 

// 2. DIE BASE ID IHRER MITTAGS-ABSTIMMUNG BASE
// Dies ist die Kennung Ihrer Datenbank (beginnt mit app...)
const AIRTABLE_BASE_ID = 'appaBRazayNsQSrnp';      

// 3. TABELLENNAMEN (MÜSSEN MIT AIRTABLE ÜBEREINSTIMMEN)
const LOKALE_TABLE = 'Lokale';
const LOG_TABLE = 'Stimmen-Log'; 

// 4. LOKALER SPEICHER FÜR DIE ABSTIMMUNGS-SPERRE
const LOCAL_STORAGE_KEY = 'votedTodayAirtable';

// =================================================================================================
// FUNKTIONEN
// =================================================================================================

// Hilfsfunktion: Gibt das heutige Datum im Format YYYY-MM-DD zurück
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ----------------------------------------------------------------------------------
// 1. DATEN ABRUFEN: Ruft Lokale und Stimmen-Log ab und zählt die Stimmen
// ----------------------------------------------------------------------------------
async function fetchAndRenderLokale() {
    document.getElementById('info-text').textContent = 'Lade Lokale und Stimmen...';
    const today = getTodayDate();
    const headers = { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` };
    
    try {
        // --- 1a. Lokale-Daten abrufen ---
        const lokaleResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LOKALE_TABLE}`, { headers });
        if (!lokaleResponse.ok) throw new Error('Lokale-Tabelle nicht erreichbar. API-Key/Base-ID prüfen.');
        
        const lokaleJson = await lokaleResponse.json();
        
        // Initialisiere die Lokale-Liste und den Zähler
        let lokaleList = lokaleJson.records.map(record => ({
            ID: record.id, // Wichtig: Airtable Record ID (rec...) verwenden
            Name: record.fields.Name,
            Essen: record.fields.Essen,
            Link: record.fields.Link,
            Preis: record.fields.Preis,
            'Time to Travel (1-way)': record.fields['Time to Travel (1-way)'],
            Stimmen: 0 // Zähler initialisieren
        }));
        
        // --- 1b. Stimmen-Log abrufen ---
        const logResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LOG_TABLE}`, { headers });
        if (!logResponse.ok) throw new Error('Stimmen-Log Tabelle nicht erreichbar.');
        
        const logJson = await logResponse.json();
        
        // --- 1c. Stimmen zählen und zuordnen ---
        logJson.records.forEach(logRecord => {
            const voteDate = logRecord.fields.Datum ? new Date(logRecord.fields.Datum).toISOString().split('T')[0] : '';
            
            // Nur Stimmen vom heutigen Tag zählen
            if (voteDate === today) {
                const lokalId = logRecord.fields['Lokal ID'];
                const lokalObj = lokaleList.find(l => l.ID === lokalId);
                
                if (lokalObj) {
                    lokalObj.Stimmen += 1;
                }
            }
        });

        // Bereite Rendering vor
        lokaleList.sort((a, b) => b.Stimmen - a.Stimmen);
        const hasVotedToday = localStorage.getItem(LOCAL_STORAGE_KEY) === today;
        
        document.getElementById('info-text').innerHTML = `Abstimmung für den **${today}**. (${hasVotedToday ? 'Sie haben heute bereits abgestimmt.' : 'Sie können noch abstimmen.'})`;

        renderLokale(lokaleList, hasVotedToday);

    } catch (error) {
        console.error('Fehler beim Laden der Airtable-Daten:', error);
        document.getElementById('info-text').textContent = 'Fehler beim Laden der Lokale. API-Schlüssel oder Base ID prüfen! (Konsole für Details)';
    }
}

// ----------------------------------------------------------------------------------
// 2. ABSTIMMEN: Sendet eine neue Stimme an den Stimmen-Log
// ----------------------------------------------------------------------------------
async function handleVote(event) {
    const button = event.target;
    const lokalId = button.getAttribute('data-id');

    button.disabled = true;
    button.textContent = 'Wird gesendet...';
    
    const today = getTodayDate();
    const headers = {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LOG_TABLE}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                fields: {
                    'Lokal ID': lokalId,
                    'Datum': today
                }
            })
        });

        if (!response.ok) throw new Error('Airtable API Fehler beim Speichern');

        // Speichern, dass der Benutzer heute abgestimmt hat
        localStorage.setItem(LOCAL_STORAGE_KEY, today);
        
        fetchAndRenderLokale(); // Ergebnisse aktualisieren

    } catch (error) {
        console.error('Fehler beim Abstimmen:', error);
        alert('Abstimmung konnte nicht gespeichert werden! Prüfen Sie Schreibrechte.');
        button.textContent = 'Abstimmen';
        button.disabled = false;
    }
}

// Helper: Funktion zum Rendern der Lokale 
function renderLokale(lokale, hasVoted) {
    const container = document.getElementById('lokale-liste');
    container.innerHTML = ''; 

    lokale.forEach((lokal, index) => {
        const card = document.createElement('div');
        card.className = 'lokal-card';
        if (index === 0 && lokal.Stimmen > 0) {
            card.classList.add('winner');
        }

        // --- HTML-Inhalt ---
        card.innerHTML = `
            <h2>${lokal.Name}</h2>
            <p class="essen">${lokal.Essen}</p>
            <p>💰 **Preis:** ${lokal.Preis || 'N/A'}</p>
            <p>🚶 **Wegzeit:** ${lokal['Time to Travel (1-way)'] || 'N/A'}</p>
            
            <div class="vote-area">
                <span class="stimmen-count">${lokal.Stimmen} Stimmen</span>
                <button 
                    data-id="${lokal.ID}" 
                    ${hasVoted ? 'disabled' : ''} 
                    class="vote-button"
                >
                    Abstimmen
                </button>
            </div>
            ${lokal.Link ? `<a href="${lokal.Link}" target="_blank" class="link-button">Speisekarte/Link</a>` : ''}
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', handleVote);
    });
}

// Start der Anwendung
fetchAndRenderLokale();
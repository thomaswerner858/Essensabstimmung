// =================================================================================================
// WICHTIG: KONFIGURATION MIT IHREN AIRTABLE-SCHLÜSSELN
// =================================================================================================
const AIRTABLE_API_KEY = 'pat1YYnqrx0vJoAfd.df54e2561e22689687b698cdd26680ddcd413603ada567255fe610a761325d8f'; 
const AIRTABLE_BASE_ID = 'appaBRazayNsQSrnp';      
const LOKALE_TABLE = 'Lokale';
const LOG_TABLE = 'Stimmen-Log'; 

// NEUE KONSTANTEN UND GLOBALE VARIABLEN FÜR MULTI-VOTE
const MAX_VOTES = 3; 
let currentVotes = {}; // Speichert die aktuelle Auswahl {lokalId: Anzahl der Stimmen}
let votesRemaining = MAX_VOTES; 
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
            ID: record.id, 
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

        // NEU: Initialisiere den Stimmenzähler und die Steuerelemente
        currentVotes = {}; 
        votesRemaining = MAX_VOTES;
        
        renderLokale(lokaleList, hasVotedToday); 
        updateVoteControls(hasVotedToday); // Steuerelemente aktualisieren

        // Event Listener für den neuen Sende-Button hinzufügen (muss nur einmal erfolgen)
        const submitButton = document.getElementById('submit-votes');
        if (submitButton && !submitButton.hasEventListener) {
            submitButton.addEventListener('click', handleSubmitVotes);
            submitButton.hasEventListener = true;
        }


    } catch (error) {
        console.error('Fehler beim Laden der Airtable-Daten:', error);
        document.getElementById('info-text').textContent = 'Fehler beim Laden der Lokale. API-Schlüssel oder Base ID prüfen! (Konsole für Details)';
    }
}

// ----------------------------------------------------------------------------------
// 2. renderLokale (Angepasst für Plus/Minus-Buttons und Textkorrektur)
// ----------------------------------------------------------------------------------
function renderLokale(lokale, hasVoted) {
    const container = document.getElementById('lokale-liste');
    container.innerHTML = ''; 

    lokale.forEach((lokal, index) => {
        const card = document.createElement('div');
        card.className = 'lokal-card';
        if (index === 0 && lokal.Stimmen > 0) {
            card.classList.add('winner');
        }

        // --- HIER WURDE DER CODE KORRIGIERT (Entfernung der **) ---
        card.innerHTML = `
            <h2>${lokal.Name}</h2>
            <p class="essen">${lokal.Essen}</p>
            <p>💰 Preis: ${lokal.Preis || 'N/A'}</p>
            <p>🚶 Wegzeit: ${lokal['Time to Travel (1-way)'] || 'N/A'}</p>
            
            <div class="vote-area">
                <span class="stimmen-count">${lokal.Stimmen} Stimmen</span>
                <div class="vote-controls-group">
                    <button class="vote-control-btn minus-btn" data-id="${lokal.ID}" disabled>-</button>
                    <span class="current-selection" data-id="${lokal.ID}">0</span>
                    <button class="vote-control-btn plus-btn" data-id="${lokal.ID}" ${hasVoted ? 'disabled' : ''}>+</button>
                </div>
            </div>
            ${lokal.Link ? `<a href="${lokal.Link}" target="_blank" class="link-button">Speisekarte/Link</a>` : ''}
        `;
        container.appendChild(card);
    });

    // NEUE Event Listener für Plus/Minus-Buttons hinzufügen
    document.querySelectorAll('.vote-controls-group button').forEach(button => {
        button.addEventListener('click', handleMultiVote);
    });
}

// ----------------------------------------------------------------------------------
// 3. NEUE FUNKTIONEN: Steuerung und Speicherung der Auswahl
// ----------------------------------------------------------------------------------

function updateVoteControls(hasVoted) {
    const votesLeftElement = document.getElementById('votes-left');
    const submitButton = document.getElementById('submit-votes');

    // Wenn das Element nicht existiert, warten (Caching-Problem)
    if (!votesLeftElement || !submitButton) return; 

    votesLeftElement.textContent = votesRemaining;
    
    // Wenn schon abgestimmt, alle Buttons deaktivieren
    if (hasVoted) {
        submitButton.disabled = true;
        submitButton.textContent = 'Bereits abgestimmt';
        document.querySelectorAll('.vote-control-btn').forEach(btn => btn.disabled = true);
        return;
    }
    
    // Freie Stimmen übrig UND Stimmen ausgewählt
    const totalSelected = Object.values(currentVotes).reduce((sum, count) => sum + count, 0);
    submitButton.disabled = totalSelected === 0;

    // Aktualisiere alle Plus/Minus-Buttons
    document.querySelectorAll('.vote-controls-group').forEach(group => {
        const id = group.querySelector('.plus-btn').getAttribute('data-id');
        const count = currentVotes[id] || 0;
        
        // Minus-Button aktivieren/deaktivieren
        group.querySelector('.minus-btn').disabled = count === 0;
        
        // Plus-Button aktivieren/deaktivieren (deaktiviert, wenn keine Stimmen mehr übrig sind)
        group.querySelector('.plus-btn').disabled = (votesRemaining <= 0);
        
        // Anzeige aktualisieren
        group.querySelector('.current-selection').textContent = count;
    });
}

function handleMultiVote(event) {
    const button = event.target;
    const lokalId = button.getAttribute('data-id');
    const isPlus = button.classList.contains('plus-btn');

    // Initialisiere den Zähler für dieses Lokal, falls nicht vorhanden
    currentVotes[lokalId] = currentVotes[lokalId] || 0;
    
    if (isPlus && votesRemaining > 0) {
        currentVotes[lokalId] += 1;
        votesRemaining -= 1;
    } else if (!isPlus && currentVotes[lokalId] > 0) {
        currentVotes[lokalId] -= 1;
        votesRemaining += 1;
    }
    
    // Button-Status und Zähler neu anzeigen
    updateVoteControls(false); 
}

// ----------------------------------------------------------------------------------
// 4. NEUE FUNKTION: Speichert alle Stimmen auf einmal
// ----------------------------------------------------------------------------------
async function handleSubmitVotes() {
    const submitButton = document.getElementById('submit-votes');
    submitButton.disabled = true;
    submitButton.textContent = 'Speichere Stimmen...';
    
    const today = getTodayDate();
    const headers = {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const recordsToCreate = [];
        
        // Erstelle für JEDE abgegebene Stimme einen Eintrag im Log (für einfache Zählung)
        for (const lokalId in currentVotes) {
            const numVotes = currentVotes[lokalId];
            for (let i = 0; i < numVotes; i++) {
                recordsToCreate.push({
                    fields: {
                        'Lokal ID': lokalId,
                        'Datum': today
                    }
                });
            }
        }
        
        // Airtable erlaubt maximal 10 Records pro API-Call (Chunking)
        const chunkSize = 10;
        for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
            const chunk = recordsToCreate.slice(i, i + chunkSize);
            
            const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LOG_TABLE}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ records: chunk }) // Muss "records" als Array senden
            });

            if (!response.ok) throw new Error(`Airtable API Fehler beim Speichern von Chunk ${i/chunkSize + 1}`);
        }

        // Sperre den Benutzer für den heutigen Tag
        localStorage.setItem(LOCAL_STORAGE_KEY, today);
        
        alert(`Ihre ${MAX_VOTES - votesRemaining} Stimmen wurden erfolgreich gespeichert!`);
        fetchAndRenderLokale(); // Ergebnisse aktualisieren

    } catch (error) {
        console.error('Fehler beim Abstimmen:', error);
        alert('Ein Fehler ist aufgetreten und die Stimmen konnten nicht gespeichert werden.');
        submitButton.textContent = 'Senden fehlgeschlagen';
    }
}
// ----------------------------------------------------------------------------------
// 5. Start der Anwendung (bleibt gleich)
// ----------------------------------------------------------------------------------
fetchAndRenderLokale();
// WICHTIG: ERSETZEN SIE DIES MIT IHRER TATSÄCHLICHEN GAS-URL!
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbz1oIw9h38a0qUirBQ40Yfag6EDWMlaA253IFTnqwE82vMwYpP4JqPhkSPcHZTHnKj6/exec'; 
const LOCAL_STORAGE_KEY = 'votedToday';

// Helper: Ruft die Daten vom GAS-Backend ab und rendert sie
async function fetchAndRenderLokale() {
    document.getElementById('info-text').textContent = 'Lade Lokale...';

    try {
        const response = await fetch(GAS_API_URL);
        if (!response.ok) throw new Error('API-Aufruf fehlgeschlagen');
        
        const data = await response.json();
        
        // Anzeigen des Datums und Überprüfung, ob heute bereits abgestimmt wurde
        const hasVotedToday = localStorage.getItem(LOCAL_STORAGE_KEY) === data.datum;
        
        document.getElementById('info-text').innerHTML = `Abstimmung für den **${data.datum}**. (${hasVotedToday ? 'Sie haben heute bereits abgestimmt.' : 'Sie können noch abstimmen.'})`;
        
        renderLokale(data.lokale.sort((a, b) => b.Stimmen - a.Stimmen), hasVotedToday);
        
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        document.getElementById('info-text').textContent = 'Fehler beim Laden der Lokale. Bitte später erneut versuchen.';
    }
}

// Funktion: Erstellt die HTML-Elemente für die Lokale
function renderLokale(lokale, hasVoted) {
    const container = document.getElementById('lokale-liste');
    container.innerHTML = ''; // Vorherige Liste löschen

    lokale.forEach((lokal, index) => {
        // Erstellen des Karten-Elements
        const card = document.createElement('div');
        card.className = 'lokal-card';
        // Das Lokal mit den meisten Stimmen hervorheben
        if (index === 0 && lokal.Stimmen > 0) {
            card.classList.add('winner');
        }

        // Inhalt der Karte
        card.innerHTML = `
            <h2>${lokal.Name}</h2>
            <p class="essen">${lokal.Essen}</p>
            <p>💰 **Preis:** ${lokal.Preis}</p>
            <p>🚶 **Wegzeit:** ${lokal['Time to Travel (1-way)']}</p>
            
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

    // Event Listener für die Buttons hinzufügen
    document.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', handleVote);
    });
}

// Funktion: Verarbeitet den Klick auf den Abstimm-Button
async function handleVote(event) {
    const button = event.target;
    const lokalId = button.getAttribute('data-id');

    // Button deaktivieren, um Doppel-Klicks zu vermeiden
    button.disabled = true;
    button.textContent = 'Wird gesendet...';
    
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: lokalId, // Sende nur die ID an das GAS
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' 
                // Wichtig: 'text/plain' verwenden, da GAS raw body erwartet
            }
        });

        if (!response.ok) throw new Error('Abstimmung fehlgeschlagen');

        // Speichern, dass der Benutzer heute abgestimmt hat
        // (Wir verwenden das aktuelle Datum, das vom GAS-Server zurückkommt, 
        // um sicherzustellen, dass es am nächsten Tag zurückgesetzt wird)
        const dateResponse = await fetch(GAS_API_URL); // Erneuter Fetch, um das Datum zu erhalten
        const data = await dateResponse.json();
        localStorage.setItem(LOCAL_STORAGE_KEY, data.datum);

        // Seite neu laden (oder nur die Ergebnisse aktualisieren)
        fetchAndRenderLokale(); 

    } catch (error) {
        console.error('Fehler beim Abstimmen:', error);
        alert('Abstimmung konnte nicht gespeichert werden!');
        button.textContent = 'Abstimmen';
        button.disabled = false;
    }
}

// Start der Anwendung
fetchAndRenderLokale();
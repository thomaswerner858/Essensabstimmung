import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, TABLE_LOKALE, TABLE_LOG } from '../constants';
import { AirtableRecord, LogRecord, Restaurant } from '../types';

const HEADERS = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json'
};

const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const fetchRestaurantsAndVotes = async (): Promise<Restaurant[]> => {
  const today = getTodayDate();

  // 1. Fetch Restaurants
  const responseLokale = await fetch(`${BASE_URL}/${TABLE_LOKALE}`, { headers: HEADERS });
  if (!responseLokale.ok) throw new Error('Failed to fetch restaurants');
  const jsonLokale = await responseLokale.json();

  const restaurants: Restaurant[] = jsonLokale.records.map((r: AirtableRecord) => ({
    id: r.id,
    name: r.fields.Name,
    cuisine: r.fields.Essen || 'Keine Angabe',
    link: r.fields.Link,
    price: r.fields.Preis,
    distance: r.fields['Time to Travel (1-way)'],
    currentVotes: 0,
  }));

  // 2. Fetch Votes
  const responseLog = await fetch(`${BASE_URL}/${TABLE_LOG}`, { headers: HEADERS });
  if (!responseLog.ok) throw new Error('Failed to fetch vote log');
  const jsonLog = await responseLog.json();

  // 3. Aggregate Votes for Today
  jsonLog.records.forEach((log: LogRecord) => {
    // Check if the date field exists and matches today
    const voteDate = log.fields.Datum ? new Date(log.fields.Datum).toISOString().split('T')[0] : '';
    
    if (voteDate === today) {
      const restaurant = restaurants.find(r => r.id === log.fields['Lokal ID']);
      if (restaurant) {
        restaurant.currentVotes += 1;
      }
    }
  });

  // Sort by votes (descending)
  return restaurants.sort((a, b) => b.currentVotes - a.currentVotes);
};

export const submitVotesToAirtable = async (votes: { [id: string]: number }): Promise<void> => {
  const today = getTodayDate();
  const recordsToCreate: any[] = [];

  // Flatten the vote object into individual records
  Object.entries(votes).forEach(([id, count]) => {
    for (let i = 0; i < count; i++) {
      recordsToCreate.push({
        fields: {
          'Lokal ID': id,
          'Datum': today
        }
      });
    }
  });

  // Batch requests (Airtable limit is 10 per request)
  const chunkSize = 10;
  for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
    const chunk = recordsToCreate.slice(i, i + chunkSize);
    const response = await fetch(`${BASE_URL}/${TABLE_LOG}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ records: chunk })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit batch ${i}`);
    }
  }
};
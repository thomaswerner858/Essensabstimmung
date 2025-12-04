export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  link?: string;
  price?: string;
  distance?: string;
  currentVotes: number;
}

export interface AirtableRecord {
  id: string;
  fields: {
    Name: string;
    Essen?: string;
    Link?: string;
    Preis?: string;
    'Time to Travel (1-way)'?: string;
    [key: string]: any;
  };
}

export interface LogRecord {
  id: string;
  fields: {
    'Lokal ID': string;
    Datum: string;
  };
}

export interface VoteSelection {
  [restaurantId: string]: number;
}
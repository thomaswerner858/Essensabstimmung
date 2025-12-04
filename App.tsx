import React, { useEffect, useState, useMemo } from 'react';
import { fetchRestaurantsAndVotes, getTodayDate, submitVotesToAirtable } from './services/airtableService';
import { Restaurant, VoteSelection } from './types';
import { MAX_VOTES, LOCAL_STORAGE_KEY } from './constants';
import { RestaurantCard } from './components/RestaurantCard';
import { StickyFooter } from './components/StickyFooter';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<VoteSelection>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVotedToday, setHasVotedToday] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchRestaurantsAndVotes();
      setRestaurants(data);
      
      const storedDate = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedDate === getTodayDate()) {
        setHasVotedToday(true);
      }
    } catch (err) {
      console.error(err);
      setError('Daten konnten nicht geladen werden. Bitte prüfen Sie den API Key oder die Verbindung.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derived State
  const totalVotesUsed = useMemo(() => {
    return Object.values(userVotes).reduce((sum: number, count: number) => sum + count, 0);
  }, [userVotes]);

  const maxVotesForRest = (id: string) => {
    const current = userVotes[id] || 0;
    return (MAX_VOTES - totalVotesUsed) + current; // Should technically just check remaining
  };

  // Handlers
  const handleIncrement = (id: string) => {
    if (totalVotesUsed >= MAX_VOTES) return;
    setUserVotes(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const handleDecrement = (id: string) => {
    setUserVotes(prev => {
      const current = prev[id] || 0;
      if (current <= 0) return prev;
      const copy = { ...prev, [id]: current - 1 };
      if (copy[id] === 0) delete copy[id];
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (totalVotesUsed === 0) return;
    
    try {
      setIsSubmitting(true);
      await submitVotesToAirtable(userVotes);
      
      localStorage.setItem(LOCAL_STORAGE_KEY, getTodayDate());
      setHasVotedToday(true);
      setUserVotes({});
      
      // Refresh data to show new totals
      await loadData();
      
    } catch (err) {
      alert('Fehler beim Senden der Stimmen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find the highest vote count to highlight leaders
  const highestVoteCount = Math.max(...restaurants.map(r => r.currentVotes), 0);

  if (loading && restaurants.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <Loader2 className="animate-spin" size={48} />
        <p>Lade Lokale...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-red-500 gap-4 p-4 text-center">
        <AlertCircle size={48} />
        <p className="max-w-md">{error}</p>
        <button onClick={loadData} className="text-primary underline hover:text-purple-800">Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-gradient-to-b from-purple-100 to-slate-50 pt-12 pb-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary mb-3">
            Wo gehen wir heute essen?
          </h1>
          <p className="text-slate-500 text-lg">
            Abstimmung für den <span className="font-semibold text-slate-700">{getTodayDate()}</span>
          </p>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id}
              data={restaurant}
              userVotes={userVotes[restaurant.id] || 0}
              canVote={totalVotesUsed < MAX_VOTES}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              isLeading={restaurant.currentVotes === highestVoteCount}
              hasAlreadyVotedToday={hasVotedToday}
            />
          ))}
        </div>
      </main>

      {/* Footer Controls */}
      <StickyFooter 
        votesUsed={totalVotesUsed}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        hasVotedToday={hasVotedToday}
      />
    </div>
  );
};

export default App;
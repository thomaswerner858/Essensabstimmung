import React from 'react';
import { Restaurant } from '../types';
import { ExternalLink, Utensils, MapPin, DollarSign, Plus, Minus } from 'lucide-react';

interface Props {
  data: Restaurant;
  userVotes: number;
  canVote: boolean;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  isLeading: boolean;
  hasAlreadyVotedToday: boolean;
}

export const RestaurantCard: React.FC<Props> = ({ 
  data, 
  userVotes, 
  canVote, 
  onIncrement, 
  onDecrement,
  isLeading,
  hasAlreadyVotedToday
}) => {
  
  const isWinner = isLeading && hasAlreadyVotedToday && data.currentVotes > 0;

  return (
    <div className={`
      relative flex flex-col justify-between
      bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 
      border-2 overflow-hidden
      ${isWinner ? 'border-secondary shadow-lg shadow-orange-100' : 'border-transparent'}
    `}>
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
          Top Favorit
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-slate-800 leading-tight pr-4">
            {data.name}
          </h3>
        </div>

        <div className="space-y-2 text-sm text-slate-500 mb-6">
          <div className="flex items-center gap-2">
            <Utensils size={16} className="text-primary" />
            <span>{data.cuisine}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-slate-400" />
            <span>{data.price || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <span>{data.distance || 'N/A'}</span>
          </div>
          
          {data.link && (
             <a 
             href={data.link} 
             target="_blank" 
             rel="noreferrer"
             className="inline-flex items-center gap-1 text-primary hover:text-purple-800 hover:underline mt-2 text-sm font-medium"
           >
             Speisekarte / Web
             <ExternalLink size={14} />
           </a>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
        
        {/* Total Public Votes */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gesamt</span>
          <span className={`text-xl font-bold ${isLeading && data.currentVotes > 0 ? 'text-secondary' : 'text-slate-700'}`}>
            {data.currentVotes}
          </span>
        </div>

        {/* Voting Controls */}
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200">
          <button 
            onClick={() => onDecrement(data.id)}
            disabled={userVotes === 0 || hasAlreadyVotedToday}
            className="p-3 text-slate-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 rounded-l-lg transition-colors"
          >
            <Minus size={18} />
          </button>
          
          <div className="w-8 text-center font-bold text-slate-800">
            {userVotes}
          </div>
          
          <button 
            onClick={() => onIncrement(data.id)}
            disabled={!canVote || hasAlreadyVotedToday}
            className="p-3 text-slate-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 rounded-r-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { MAX_VOTES } from '../constants';
import { Send, CheckCircle2 } from 'lucide-react';

interface Props {
  votesUsed: number;
  onSubmit: () => void;
  isSubmitting: boolean;
  hasVotedToday: boolean;
}

export const StickyFooter: React.FC<Props> = ({ votesUsed, onSubmit, isSubmitting, hasVotedToday }) => {
  
  if (hasVotedToday) {
    return (
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
        <div className="bg-green-600 text-white shadow-xl rounded-full px-6 py-3 flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 size={20} />
          <span className="font-medium">Du hast heute bereits abgestimmt!</span>
        </div>
      </div>
    );
  }

  const remaining = MAX_VOTES - votesUsed;
  const canSubmit = votesUsed > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <div className="text-sm text-slate-500">
            Deine Stimmen:
          </div>
          <div className="flex gap-1">
            {[...Array(MAX_VOTES)].map((_, i) => (
              <div 
                key={i} 
                className={`
                  h-3 w-8 rounded-full transition-colors duration-300
                  ${i < votesUsed ? 'bg-primary' : 'bg-slate-200'}
                `}
              />
            ))}
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-700">
            {remaining > 0 ? `${remaining} übrig` : 'Alle verteilt!'}
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all
            ${canSubmit 
              ? 'bg-primary hover:bg-purple-700 shadow-lg shadow-purple-200 translate-y-0' 
              : 'bg-slate-300 cursor-not-allowed'}
            ${isSubmitting ? 'opacity-75 cursor-wait' : ''}
          `}
        >
          {isSubmitting ? (
            'Wird gesendet...'
          ) : (
            <>
              <span>Absenden</span>
              <Send size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
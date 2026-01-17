import React, { useMemo, useEffect, useState } from 'react';
import { Trophy, Globe, Users } from 'lucide-react';

interface GlobalRankingProps {
  currentScore: number;
  gameMode?: 'SOLO' | 'MULTI_HOST' | 'MULTI_CLIENT';
  gameId: string; // Used to trigger reset
}

interface RankEntry {
  name: string;
  score: number;
  isPlayer?: boolean;
}

const GlobalRanking: React.FC<GlobalRankingProps> = ({ currentScore, gameMode, gameId }) => {
  
  // State to hold the "Rival" bots so they stay consistent during a run, but reset on new game
  const [rivals, setRivals] = useState<RankEntry[]>([]);

  // Generate rivals when gameId changes (New Game)
  useEffect(() => {
    const generateRivals = () => {
        const botNames = ["Chef Ramsay", "Chef Jacquin", "Paola C.", "Fogaça", "Claude T.", "Jamie O.", "Cake Boss"];
        
        // Randomize 5 bots
        const newRivals = Array(5).fill(null).map(() => {
            const name = botNames[Math.floor(Math.random() * botNames.length)];
            // Random score between 500 and 8000
            const score = Math.floor(Math.random() * 7500) + 500;
            return { name, score };
        });
        
        // Remove duplicate names if any (simple approach)
        const uniqueRivals = Array.from(new Set(newRivals.map(r => r.name)))
            .map(name => newRivals.find(r => r.name === name)!);

        setRivals(uniqueRivals.slice(0, 5));
    };

    generateRivals();
  }, [gameId]);

  // Create a leaderboard including the player/team
  const leaderboard: RankEntry[] = useMemo(() => {
    const isMulti = gameMode === 'MULTI_HOST' || gameMode === 'MULTI_CLIENT';
    const playerName = isMulti ? "TIME DUPLA" : "VOCÊ";

    const playerEntry = { name: playerName, score: currentScore, isPlayer: true };
    
    // Combine and sort
    return [...rivals, playerEntry].sort((a, b) => b.score - a.score).slice(0, 6);
  }, [currentScore, rivals, gameMode]);

  return (
    <div className="bg-[#2c2c2c] border-4 border-stone-600 rounded-xl p-4 flex flex-col gap-3 shadow-xl relative overflow-hidden h-64">
       {/* Background Grid */}
       <div className="absolute inset-0 opacity-10" style={{ 
           backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
           backgroundSize: '20px 20px'
       }}></div>

       <div className="flex items-center justify-between border-b border-stone-500 pb-2 z-10">
          <h3 className="font-pixel text-xl text-yellow-500 font-bold tracking-wide flex items-center gap-2">
            <Globe className="w-5 h-5" /> Ranking {gameMode === 'SOLO' || !gameMode ? 'Solo' : 'Dupla'}
          </h3>
          {gameMode === 'SOLO' || !gameMode ? (
              <Trophy className="w-5 h-5 text-yellow-500" />
          ) : (
              <Users className="w-5 h-5 text-blue-400 animate-pulse" />
          )}
       </div>
      
      <div className="flex flex-col gap-1 z-10 overflow-y-auto pr-1 custom-scrollbar">
        {leaderboard.map((entry, index) => (
            <div 
                key={index} 
                className={`flex justify-between items-center p-2 rounded font-pixel text-lg ${entry.isPlayer ? 'bg-yellow-600 text-white border border-yellow-400' : 'bg-stone-700/50 text-stone-300'}`}
            >
                <div className="flex items-center gap-2">
                    <span className={`font-bold w-5 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-stone-500'}`}>
                        #{index + 1}
                    </span>
                    <span className="truncate max-w-[100px]">{entry.name}</span>
                </div>
                <span className="font-bold text-white">{entry.score}</span>
            </div>
        ))}
      </div>
      
      {/* Footer Text */}
      <div className="text-[10px] text-stone-500 text-center font-pixel mt-auto pt-1 border-t border-stone-700">
          Ranking Global Reiniciado
      </div>
    </div>
  );
};

export default GlobalRanking;
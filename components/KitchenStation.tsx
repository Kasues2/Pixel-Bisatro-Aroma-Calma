import React from 'react';
import { Station, IngredientKey } from '../types';
import { INGREDIENTS, RECIPES } from '../constants';
import { Timer, Utensils, CheckCircle, ChefHat, Flame, MoveHorizontal } from 'lucide-react';

interface KitchenStationProps {
  station: Station;
  isActive: boolean;
  onClick: () => void;
  onServe: () => void;
}

const KitchenStation: React.FC<KitchenStationProps> = ({ station, isActive, onClick, onServe }) => {
  const currentRecipe = station.currentRecipeId 
    ? RECIPES.find(r => r.id === station.currentRecipeId) 
    : null;

  const nextIngredient: IngredientKey | null = currentRecipe && station.prepSequence.length < currentRecipe.ingredients.length
    ? currentRecipe.ingredients[station.prepSequence.length]
    : null;

  const renderContent = () => {
    switch (station.state) {
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 group-hover:text-stone-600 transition-colors opacity-60">
            <Utensils className="w-16 h-16 mb-4" />
            <span className="font-pixel uppercase text-2xl font-bold tracking-widest">Bancada Livre</span>
          </div>
        );

      case 'prepping':
        return (
          <div className="flex flex-col h-full w-full relative">
            {/* Cutting Board Overlay */}
            <div className="absolute inset-2 bg-cutting-board rounded shadow-inner border border-[#a1887f]"></div>
            
            <div className="z-10 flex flex-col h-full p-4">
                <div className="text-center font-pixel text-[#5d4037] font-bold text-2xl border-b-2 border-[#a1887f] pb-2 mb-4 truncate bg-white/50 rounded px-2 shadow-sm">
                {currentRecipe?.name}
                </div>
                
                {/* Prep Area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                
                {/* Ingredients Done */}
                <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
                    {station.prepSequence.map((key, idx) => (
                    <div 
                        key={idx} 
                        className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center text-sm font-bold ${INGREDIENTS[key].color} ${INGREDIENTS[key].textColor || 'text-white'} border-2 border-black/10`}
                    >
                        {key}
                    </div>
                    ))}
                </div>

                {/* NEXT ACTION PROMPT - KEYBOARD HINT */}
                {nextIngredient && isActive && (
                    <div className="flex flex-col items-center animate-bounce mt-2">
                    <span className="text-xs uppercase font-bold text-[#5d4037] mb-1 tracking-widest bg-white/80 px-2 rounded">Adicionar</span>
                    <kbd className={`w-16 h-16 flex items-center justify-center rounded-lg border-b-[6px] text-4xl font-bold shadow-xl transition-colors font-pixel ${INGREDIENTS[nextIngredient].color} ${INGREDIENTS[nextIngredient].textColor || 'text-white'} border-black/20`}>
                        {nextIngredient}
                    </kbd>
                    <span className="text-xs font-bold text-[#5d4037] mt-2 uppercase tracking-wider bg-white/80 px-2 rounded">{INGREDIENTS[nextIngredient].name}</span>
                    </div>
                )}
                </div>
            </div>
          </div>
        );

      case 'cooking':
        return (
          <div className="flex flex-col h-full items-center justify-center relative w-full overflow-hidden">
            {/* Stove Burner Graphic (CSS) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-48 h-48 rounded-full border-8 border-stone-800 bg-stone-900 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-4 border-stone-700 border-dashed"></div>
                </div>
            </div>

            <div className="absolute inset-0 bg-orange-500/10 animate-pulse z-0" />
            
            <div className="z-10 bg-white p-3 rounded-full shadow-lg mb-4 border-2 border-stone-200">
               <Timer className="w-10 h-10 text-orange-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <span className="font-pixel text-orange-800 z-10 text-2xl mb-4 bg-white/80 px-4 py-1 rounded shadow-sm">Cozinhando...</span>
            
            <div className="w-3/4 bg-stone-300 rounded-full h-5 z-10 border-2 border-stone-400 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full transition-all duration-300 ease-linear" style={{ width: `${station.cookProgress}%` }}></div>
            </div>
          </div>
        );

      case 'ready':
        return (
          <button onClick={(e) => { e.stopPropagation(); onServe(); }} className="w-full h-full flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 transition-colors group relative overflow-hidden">
            {/* Background Image of the Food */}
            <div className="absolute inset-0 z-0">
                 <img src={currentRecipe?.image} alt="Ready" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 group-hover:bg-black/40 transition-colors"></div>
            </div>

            <div className="absolute top-4 left-0 w-full text-center z-10">
                 <span className="text-sm font-pixel uppercase font-bold text-white bg-green-700/90 px-4 py-1 rounded shadow-lg border border-green-500">{currentRecipe?.name}</span>
            </div>
            
            <div className="z-10 bg-white/95 p-4 rounded-full mb-2 shadow-2xl group-hover:scale-110 transition-transform backdrop-blur-sm mt-8">
               <ChefHat className="w-12 h-12 text-green-700" />
            </div>
            <span className="z-10 font-pixel text-white text-5xl font-bold tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-pulse">SERVIR</span>
          </button>
        );

      case 'burned':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-stone-900 rounded-lg animate-pulse w-full border-4 border-red-900">
            <Flame className="w-20 h-20 text-red-600 mb-4 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
            <span className="font-pixel text-red-500 text-4xl tracking-widest">QUEIMOU!</span>
            <span className="text-sm text-stone-500 mt-4 uppercase tracking-widest bg-black px-4 py-1 rounded">Clique p/ Limpar</span>
          </div>
        );
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative h-80 w-full bg-marble rounded-xl shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
        border-t-4 border-white/50 border-b-8 border-stone-300
        ${isActive 
            ? 'ring-4 ring-amber-400 scale-[1.02] shadow-2xl z-10' 
            : 'hover:border-stone-400 hover:shadow-xl'}
      `}
    >
      {renderContent()}
      
      {/* Station Number Badge (Metal Plate style) */}
      <div className="absolute top-3 right-3 bg-gradient-to-b from-stone-200 to-stone-400 text-stone-800 px-3 py-1 rounded-sm text-xs font-bold font-pixel shadow border border-stone-500 z-20">
        B-{station.id + 1}
      </div>
    </div>
  );
};

export default KitchenStation;
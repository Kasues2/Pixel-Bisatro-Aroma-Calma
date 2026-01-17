import React from 'react';
import { Trash2, Sparkles } from 'lucide-react';

interface HygieneStationProps {
  hygiene: number;
  onClean: () => void;
}

const HygieneStation: React.FC<HygieneStationProps> = ({ hygiene, onClean }) => {
  // Color changes based on hygiene level
  const barColor = hygiene > 60 ? 'bg-green-500' : hygiene > 30 ? 'bg-yellow-500' : 'bg-red-600';

  return (
    <div className="bg-pixel-cream border-4 border-pixel-wood rounded-xl p-4 flex flex-col items-center gap-3 shadow-lg relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-100 rounded-full opacity-50" />

      <h3 className="font-pixel text-xl text-pixel-dark font-bold tracking-wide z-10">Higiene & Limpeza</h3>
      
      <div className="w-full space-y-1">
        <div className="w-full h-5 bg-stone-200 rounded-full overflow-hidden border-2 border-stone-400 shadow-inner">
            <div 
            className={`h-full transition-all duration-500 ease-out ${barColor}`} 
            style={{ width: `${hygiene}%` }}
            />
        </div>
        <div className="flex justify-between text-xs font-pixel text-stone-500 px-1">
            <span>Sujo</span>
            <span>Limpo</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full mt-1">
        <button 
          onClick={onClean}
          className="group relative flex flex-col items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 border-b-4 rounded-lg active:translate-y-1 active:border-b-2 transition-all h-20"
        >
          <Sparkles className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform mb-1" />
          <span className="font-pixel text-blue-800 text-lg leading-none">Limpar</span>
          <span className="text-[10px] text-blue-400 uppercase font-bold">Cozinha</span>
        </button>

        <button 
          onClick={onClean}
          className="group relative flex flex-col items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 border-2 border-stone-400 border-b-4 rounded-lg active:translate-y-1 active:border-b-2 transition-all h-20"
        >
          <Trash2 className="w-6 h-6 text-stone-600 group-hover:rotate-12 transition-transform mb-1" />
          <span className="font-pixel text-stone-800 text-lg leading-none">Lixo</span>
          <span className="text-[10px] text-stone-400 uppercase font-bold">Esvaziar</span>
        </button>
      </div>
    </div>
  );
};

export default HygieneStation;
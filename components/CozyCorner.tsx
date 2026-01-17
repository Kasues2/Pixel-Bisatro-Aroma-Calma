import React, { useState } from 'react';
import { Flower, Music, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '../services/audioManager';

interface CozyCornerProps {
  onWaterPlant: () => void;
}

const CozyCorner: React.FC<CozyCornerProps> = ({ onWaterPlant }) => {
  const [muted, setMuted] = useState(false);
  const [plantHappy, setPlantHappy] = useState(false);

  const handleWater = () => {
    onWaterPlant();
    setPlantHappy(true);
    audioManager.playPop();
    setTimeout(() => setPlantHappy(false), 2000);
  };

  const toggleMute = () => {
      const isMuted = audioManager.toggleMute();
      setMuted(isMuted);
  };

  return (
    <div className="bg-pixel-cream border-4 border-pixel-wood rounded-xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden">
       {/* Background Decor */}
       <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-green-100 rounded-full opacity-50" />

      <h3 className="font-pixel text-xl text-pixel-dark font-bold tracking-wide z-10 text-center">Cantinho Zen</h3>
      
      <div className="flex justify-around items-end w-full px-2 z-10">
        
        {/* Plant Interaction */}
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={handleWater}
            className="relative group p-3 bg-green-50 hover:bg-green-100 border-2 border-green-300 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95"
            title="Regar Plantas (Acalma Clientes)"
          >
            <Flower 
              className={`w-8 h-8 ${plantHappy ? 'text-pink-500 animate-bounce' : 'text-green-600'}`} 
            />
             {plantHappy && (
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                  <span className="text-pink-500 font-bold font-pixel text-xl">♥</span>
               </div>
             )}
          </button>
          <span className="font-pixel text-xs font-bold text-stone-500 uppercase">Regar</span>
        </div>

        {/* Separator */}
        <div className="h-10 w-px bg-stone-300"></div>

        {/* Sound Toggle */}
        <div className="flex flex-col items-center gap-1">
            <button 
              onClick={toggleMute}
              className={`p-3 border-2 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 ${muted ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-amber-50 border-amber-300 text-amber-600'}`}
              title={muted ? "Ativar Som" : "Silenciar"}
            >
              {muted ? <VolumeX className="w-8 h-8" /> : <Music className="w-8 h-8" />}
            </button>
             <span className="font-pixel text-xs font-bold text-stone-500 uppercase">Som</span>
        </div>
      </div>
    </div>
  );
};

export default CozyCorner;
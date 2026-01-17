import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameState, 
  Order, 
  Station, 
  IngredientKey,
  ClientActionType,
  NetworkMessage
} from './types';
import { GAME_CONFIG, RECIPES, INGREDIENTS } from './constants';
import { generateOrder, OrderValidator } from './services/gameLogic';
import { audioManager } from './services/audioManager';
import { multiplayerManager } from './services/multiplayerManager';
import { storageManager } from './services/storageManager'; // Import Storage
import KitchenStation from './components/KitchenStation';
import HygieneStation from './components/HygieneStation';
import GlobalRanking from './components/GlobalRanking';
import { Coins, Trophy, UtensilsCrossed, Volume2, VolumeX, Users, ArrowRight, Copy, Clock, Calendar, TrendingUp, PlayCircle, Save } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    money: GAME_CONFIG.INITIAL_MONEY,
    hygiene: GAME_CONFIG.MAX_HYGIENE,
    score: 0,
    day: 1,
    dailyTarget: GAME_CONFIG.INITIAL_TARGET,
    timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS,
    phase: 'MENU',
    gameMode: 'SOLO'
  });

  const [menuState, setMenuState] = useState<'MAIN' | 'MULTIPLAYER_LOBBY' | 'GAME'>('MAIN');
  const [lobbyState, setLobbyState] = useState<'NONE' | 'HOST_WAITING' | 'CLIENT_JOINING'>('NONE');
  const [hostId, setHostId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [gameRunId, setGameRunId] = useState('initial'); // Used to reset ranking
  const [hasSaveFile, setHasSaveFile] = useState(false); // Check for save

  const [isMuted, setIsMuted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [stations, setStations] = useState<Station[]>(
    Array(3).fill(null).map((_, i) => ({
      id: i,
      state: 'empty',
      currentRecipeId: null,
      prepSequence: [],
      cookStartTime: null,
      cookProgress: 0,
    }))
  );

  const [activeStationId, setActiveStationId] = useState<number | null>(null);
  
  // Refs for loop
  const loopRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const secondTickRef = useRef<number>(0); // Helper to count seconds for the clock

  // --- INITIAL CHECK ---
  useEffect(() => {
      setHasSaveFile(storageManager.hasSave());
  }, [menuState]);

  // --- SAVE / LOAD LOGIC ---

  const continueGame = () => {
      const savedData = storageManager.load();
      if (savedData) {
          audioManager.playPop();
          setGameState(prev => ({
              ...prev,
              ...savedData,
              phase: 'PRE_DAY', // Always load into Pre-Day so player isn't overwhelmed
              timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS, // Reset clock for the day
              gameMode: 'SOLO'
          }));
          setGameRunId(Date.now().toString());
          setMenuState('GAME');
      }
  };

  const startSolo = () => {
      audioManager.playPop();
      storageManager.clear(); // Clear old save on new game
      setGameState(prev => ({ 
          ...prev, 
          gameMode: 'SOLO',
          phase: 'PRE_DAY',
          day: 1,
          money: 0,
          dailyTarget: GAME_CONFIG.INITIAL_TARGET,
          hygiene: GAME_CONFIG.MAX_HYGIENE,
          timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS,
          score: 0
      }));
      setGameRunId(Date.now().toString());
      setMenuState('GAME');
      
      // Save initial state immediately
      storageManager.save({
          money: 0,
          hygiene: GAME_CONFIG.MAX_HYGIENE,
          score: 0,
          day: 1,
          dailyTarget: GAME_CONFIG.INITIAL_TARGET,
          timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS,
          phase: 'PRE_DAY',
          gameMode: 'SOLO'
      });
  };

  // --- MULTIPLAYER SETUP ---

  const setupHost = async () => {
      setLobbyState('HOST_WAITING');
      setConnectionStatus('Gerando ID...');
      try {
          const id = await multiplayerManager.initialize();
          setHostId(id);
          setConnectionStatus('Aguardando Jogador 2...');
          
          multiplayerManager.onConnect(() => {
              setConnectionStatus('Jogador 2 Conectado!');
              setTimeout(() => {
                  setGameState(prev => ({ ...prev, gameMode: 'MULTI_HOST', phase: 'PRE_DAY' }));
                  setGameRunId(Date.now().toString());
                  setMenuState('GAME');
                  // Notify client to enter PRE_DAY
                  multiplayerManager.sendMessage({ type: 'GAME_START', payload: {} });
              }, 1000);
          });

          // Listen for client actions
          multiplayerManager.onData((msg) => {
              if (msg.type === 'CLIENT_ACTION') {
                  handleClientAction(msg.payload.action);
              }
          });

      } catch (e) {
          setConnectionStatus('Erro ao criar sala.');
      }
  };

  const joinHost = async () => {
      if (!joinId) return;
      setConnectionStatus('Conectando...');
      try {
          await multiplayerManager.initialize();
          multiplayerManager.connectToHost(joinId);
          
          multiplayerManager.onConnect(() => {
              setConnectionStatus('Conectado ao Host! Aguardando início...');
          });

          multiplayerManager.onData((msg) => {
              if (msg.type === 'GAME_START') {
                  setGameState(prev => ({ 
                      ...prev, 
                      gameMode: 'MULTI_CLIENT',
                      phase: 'PRE_DAY'
                  }));
                  setGameRunId(Date.now().toString());
                  setMenuState('GAME');
                  audioManager.startAmbience();
              } else if (msg.type === 'SYNC_STATE') {
                  // Sync local state with host
                  const { gameState: remoteState, stations: remoteStations, orders: remoteOrders } = msg.payload;
                  setGameState(remoteState);
                  setStations(remoteStations);
                  setOrders(remoteOrders);
              }
          });

      } catch (e) {
          setConnectionStatus('Erro ao conectar.');
      }
  };

  // --- GAME LOGIC HELPERS ---

  const handleStartService = () => {
    audioManager.playPop();
    audioManager.startAmbience(); 
    setGameState(prev => ({
      ...prev,
      phase: 'SERVICE',
      timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS
    }));
    // Clear old state just in case
    setOrders([]);
    setStations(stations.map(s => ({ 
      ...s, state: 'empty', currentRecipeId: null, prepSequence: [], cookProgress: 0 
    })));
    setActiveStationId(null);
  };

  const handleNextDay = () => {
      audioManager.playPop();
      
      setGameState(prev => {
          const nextState = {
            ...prev,
            day: prev.day + 1,
            dailyTarget: prev.dailyTarget + GAME_CONFIG.TARGET_INCREASE_PER_DAY + (prev.day * 20),
            timeRemaining: GAME_CONFIG.DAY_DURATION_SECONDS,
            phase: 'PRE_DAY',
            hygiene: Math.min(100, prev.hygiene + 20) // Bonus hygiene for new day
          };
          
          // Auto Save on Next Day (SOLO ONLY)
          if (prev.gameMode === 'SOLO') {
             storageManager.save(nextState as GameState);
          }
          
          return nextState as GameState;
      });
  };

  const checkEndOfDay = (currentState: GameState) => {
      audioManager.stopAmbience();
      audioManager.playCash(); // Or a specific end chime
      
      const success = currentState.money >= currentState.dailyTarget;
      
      if (success) {
          setGameState(prev => ({ ...prev, phase: 'EOD_REPORT' }));
      } else {
          // Bankruptcy
          if (currentState.gameMode === 'SOLO') storageManager.clear();
          setGameState(prev => ({ ...prev, phase: 'GAME_OVER' }));
      }
  };

  const spawnOrder = () => {
    if (orders.length < 3) {
      setOrders(prev => [...prev, generateOrder()]);
      audioManager.playPop();
    }
  };

  const updateStations = (dt: number) => {
    setStations(prevStations => prevStations.map(station => {
      if (station.state === 'cooking') {
        const recipe = RECIPES.find(r => r.id === station.currentRecipeId);
        if (!recipe) return station;

        let newProgress = station.cookProgress + (100 / (recipe.prepTime / GAME_CONFIG.TICK_RATE));
        
        if (newProgress >= 100) {
           if (station.cookProgress < 100) {
               audioManager.playOrderUp();
           }
          return { ...station, state: 'ready', cookProgress: 100 };
        }
        return { ...station, cookProgress: newProgress };
      }
      return station;
    }));
  };

  const updateOrders = () => {
    setOrders(prevOrders => {
      const activeOrders = prevOrders
        .map(o => ({ ...o, patience: o.patience - GAME_CONFIG.PATIENCE_DECAY_RATE }))
        .filter(o => o.patience > 0);

      const expiredCount = prevOrders.length - activeOrders.length;
      if (expiredCount > 0) {
        audioManager.playError();
        setGameState(prev => {
           const newState = { 
                ...prev, 
                money: Math.max(0, prev.money - (5 * expiredCount)),
                hygiene: Math.max(0, prev.hygiene - (5 * expiredCount)) 
           };
           // We do NOT save on every penalty, only on day completion
           return newState;
        });
      }

      return activeOrders;
    });
  };

  const updateHygiene = () => {
    setGameState(prev => {
        const newHygiene = prev.hygiene - (GAME_CONFIG.HYGIENE_DECAY_RATE * 0.1);
        if (newHygiene <= 0) {
            if (prev.gameMode === 'SOLO') storageManager.clear();
            return { ...prev, hygiene: 0, phase: 'GAME_OVER' };
        }
        return { ...prev, hygiene: newHygiene };
    });
  };

  // --- AUDIO CONTROL ---
  const toggleMute = () => {
     const muted = audioManager.toggleMute();
     setIsMuted(muted);
     if (!muted && gameState.phase === 'SERVICE') {
         audioManager.startAmbience();
     }
  };

  // --- MAIN LOOP (HOST ONLY) ---
  useEffect(() => {
    // If we are a CLIENT, we don't run the loop logic, we just listen to sync
    if (gameState.gameMode === 'MULTI_CLIENT') return;

    // Only loop during SERVICE phase
    if (gameState.phase !== 'SERVICE') {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      if (gameState.phase === 'GAME_OVER' || gameState.phase === 'EOD_REPORT') {
          audioManager.stopAmbience();
      }
      return;
    }

    const loop = (timestamp: number) => {
      if (timestamp - lastTickRef.current >= GAME_CONFIG.TICK_RATE) {
        // Game Logic
        if (Math.random() < GAME_CONFIG.ORDER_SPAWN_RATE) {
          spawnOrder();
        }
        
        updateStations(GAME_CONFIG.TICK_RATE);
        updateOrders();
        updateHygiene();
        
        // Clock Logic
        if (timestamp - secondTickRef.current >= 1000) {
             secondTickRef.current = timestamp;
             setGameState(prev => {
                 const newTime = prev.timeRemaining - 1;
                 if (newTime <= 0) {
                     // Trigger End of Day in next render cycle effectively
                     setTimeout(() => checkEndOfDay(prev), 0);
                     return { ...prev, timeRemaining: 0 };
                 }
                 return { ...prev, timeRemaining: newTime };
             });
        }
        
        // If Host, broadcast state
        if (gameState.gameMode === 'MULTI_HOST') {
            multiplayerManager.sendMessage({
                type: 'SYNC_STATE',
                payload: { gameState, stations, orders }
            });
        }

        lastTickRef.current = timestamp;
      }
      loopRef.current = requestAnimationFrame(loop);
    };

    loopRef.current = requestAnimationFrame(loop);

    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState.phase, gameState.gameMode, orders.length, stations]); 

  // --- INPUT HANDLERS (Local & Remote) ---

  const processAction = (action: ClientActionType) => {
     // Actions allowed only during SERVICE except START_DAY/NEXT_DAY
     
     if (action.type === 'START_DAY') {
         if (gameState.phase === 'PRE_DAY') handleStartService();
         return;
     }

     if (action.type === 'NEXT_DAY_CONFIRM') {
         if (gameState.phase === 'EOD_REPORT') handleNextDay();
         return;
     }

     if (gameState.phase !== 'SERVICE') return;

     if (action.type === 'CLICK_STATION') {
        const id = action.stationId;
        const station = stations[id];
        if (station.state === 'burned') {
            setStations(prev => prev.map(s => s.id === id ? { ...s, state: 'empty', cookProgress: 0 } : s));
            setGameState(prev => ({ ...prev, hygiene: Math.max(0, prev.hygiene - 10) }));
            audioManager.playTrash();
        } else {
            setActiveStationId(prev => prev === id ? null : id);
            audioManager.playPop();
        }
     } 
     else if (action.type === 'SELECT_RECIPE') {
         const { recipeId } = action;
         if (activeStationId === null) return;
         
         setStations(prev => prev.map(s => {
            if (s.id === activeStationId && s.state === 'empty') {
                audioManager.playKeyType();
                return {
                ...s,
                state: 'prepping',
                currentRecipeId: recipeId,
                prepSequence: []
                };
            }
            return s;
         }));
     }
     else if (action.type === 'KEY_PRESS') {
         const { key } = action;
         if (activeStationId === null) return;

         setStations(prev => {
            const station = prev[activeStationId];
            if (station.state !== 'prepping' || !station.currentRecipeId) return prev;
    
            const recipe = OrderValidator.getRecipe(station.currentRecipeId);
            if (!recipe) return prev;
    
            const nextIngredientIndex = station.prepSequence.length;
            const expectedIngredient = recipe.ingredients[nextIngredientIndex];
    
            if (key === expectedIngredient) {
              audioManager.playKeyType();
              const newSequence = [...station.prepSequence, key];
              
              if (newSequence.length === recipe.ingredients.length) {
                audioManager.playCookStart();
                return prev.map(s => s.id === activeStationId ? {
                  ...s,
                  state: 'cooking',
                  prepSequence: newSequence,
                  cookProgress: 0
                } : s);
              }
              return prev.map(s => s.id === activeStationId ? { ...s, prepSequence: newSequence } : s);
            } else {
              audioManager.playError();
              return prev; 
            }
          });
     }
     else if (action.type === 'SERVE') {
         const { stationId } = action;
         const station = stations[stationId];
         if (station.state !== 'ready' || !station.currentRecipeId) return;

         const matchingOrder = orders.find(o => o.recipeId === station.currentRecipeId);
         if (matchingOrder) {
            const recipe = OrderValidator.getRecipe(station.currentRecipeId);
            if (recipe) {
                const tip = OrderValidator.calculateTip(matchingOrder.patience, recipe.price);
                const total = recipe.price + tip;

                audioManager.playCash();
                setGameState(prev => ({
                ...prev,
                money: prev.money + total,
                score: prev.score + 10 + tip,
                }));

                setOrders(prev => prev.filter(o => o.id !== matchingOrder.id));
                setStations(prev => prev.map(s => s.id === stationId ? {
                ...s, state: 'empty', currentRecipeId: null, prepSequence: [], cookProgress: 0
                } : s));
            }
         } else {
             audioManager.playError();
             setGameState(prev => ({
                ...prev,
                money: Math.max(0, prev.money - 5),
                hygiene: Math.max(0, prev.hygiene - 5)
              }));
              setStations(prev => prev.map(s => s.id === stationId ? {
                ...s, state: 'empty', currentRecipeId: null, prepSequence: [], cookProgress: 0
              } : s));
         }
     }
     else if (action.type === 'CLEAN') {
        audioManager.playPop();
        setGameState(prev => ({ ...prev, hygiene: Math.min(100, prev.hygiene + 20) }));
     }
  };

  // Host receiving client input
  const handleClientAction = (action: ClientActionType) => {
      processAction(action);
  };

  // Local user (Host or Client) inputs
  const emitAction = (action: ClientActionType) => {
      if (gameState.gameMode === 'MULTI_CLIENT') {
          multiplayerManager.sendMessage({
              type: 'CLIENT_ACTION',
              payload: { action }
          });
          
          if (action.type === 'CLICK_STATION') {
             setActiveStationId(prev => prev === action.stationId ? null : action.stationId);
          }
      } else {
          processAction(action);
      }
  };

  // --- COMPONENT HANDLERS ---

  const handleStationClick = (id: number) => emitAction({ type: 'CLICK_STATION', stationId: id });
  const handleRecipeSelect = (recipeId: string) => emitAction({ type: 'SELECT_RECIPE', recipeId });
  const handleServe = (stationId: number) => emitAction({ type: 'SERVE', stationId });
  const cleanKitchen = () => emitAction({ type: 'CLEAN' });
  const requestStartDay = () => emitAction({ type: 'START_DAY' });
  const requestNextDay = () => emitAction({ type: 'NEXT_DAY_CONFIRM' });

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== 'SERVICE' || activeStationId === null) return;
      
      const key = e.key.toUpperCase() as IngredientKey;
      const validKeys: IngredientKey[] = ['P', 'C', 'Q', 'A', 'T', 'M', 'O'];
      if (!validKeys.includes(key)) return;

      emitAction({ type: 'KEY_PRESS', key });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, activeStationId, gameState.gameMode]);


  // --- FORMATTERS ---
  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };


  // --- MENU RENDERER ---
  if (menuState === 'MAIN') {
      return (
        <div className="flex flex-col h-screen w-full items-center justify-center bg-restaurant relative overflow-hidden font-pixel text-white">
            <div className="absolute inset-0 bg-black/60"></div>
            <div className="z-10 bg-stone-800/90 p-10 rounded-xl border-4 border-stone-600 shadow-2xl flex flex-col gap-6 w-96 text-center">
                <div>
                    <h1 className="text-5xl text-amber-500 mb-2 drop-shadow-md">Pixel Bistro</h1>
                    <p className="text-stone-300 tracking-wider">Aroma & Calma</p>
                </div>
                
                {hasSaveFile && (
                    <button onClick={continueGame} className="bg-amber-600 hover:bg-amber-500 py-4 rounded text-2xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 border-2 border-amber-400">
                        <PlayCircle /> Continuar
                    </button>
                )}

                <button onClick={startSolo} className="bg-green-600 hover:bg-green-500 py-4 rounded text-2xl font-bold shadow-lg transition-transform hover:scale-105">
                    {hasSaveFile ? 'Novo Jogo' : 'Modo Solo'}
                </button>
                <button onClick={() => setMenuState('MULTIPLAYER_LOBBY')} className="bg-blue-600 hover:bg-blue-500 py-4 rounded text-2xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2">
                    <Users /> Multiplayer (Co-op)
                </button>
            </div>
        </div>
      );
  }

  if (menuState === 'MULTIPLAYER_LOBBY') {
     return (
        <div className="flex flex-col h-screen w-full items-center justify-center bg-restaurant relative overflow-hidden font-pixel text-white">
            <div className="absolute inset-0 bg-black/70"></div>
            <div className="z-10 bg-stone-800/95 p-8 rounded-xl border-4 border-blue-600 shadow-2xl flex flex-col gap-6 w-[500px] text-center">
                <h2 className="text-4xl text-blue-400 mb-4">Lobby Multiplayer</h2>
                
                {lobbyState === 'NONE' && (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={setupHost} className="bg-amber-600 hover:bg-amber-500 p-6 rounded text-xl font-bold shadow-lg flex flex-col items-center gap-2">
                            <span>Criar Sala</span>
                            <span className="text-sm font-sans font-normal opacity-80">Você será o Host</span>
                        </button>
                        <button onClick={() => setLobbyState('CLIENT_JOINING')} className="bg-stone-600 hover:bg-stone-500 p-6 rounded text-xl font-bold shadow-lg flex flex-col items-center gap-2">
                            <span>Entrar</span>
                            <span className="text-sm font-sans font-normal opacity-80">Você tem um código</span>
                        </button>
                    </div>
                )}

                {lobbyState === 'HOST_WAITING' && (
                    <div className="space-y-4">
                        <div className="bg-black/40 p-4 rounded border border-stone-500">
                            <p className="text-stone-400 mb-1">Código da Sala:</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-5xl font-mono text-green-400 tracking-widest">{hostId || '...'}</span>
                                {hostId && (
                                    <button onClick={() => navigator.clipboard.writeText(hostId)} className="p-2 hover:bg-white/10 rounded">
                                        <Copy size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="animate-pulse text-yellow-300">{connectionStatus}</p>
                    </div>
                )}

                {lobbyState === 'CLIENT_JOINING' && (
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="CÓDIGO" 
                            maxLength={4}
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                            className="w-full text-center text-4xl text-black font-mono p-2 rounded uppercase tracking-widest"
                        />
                        <button onClick={joinHost} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded text-xl font-bold flex items-center justify-center gap-2">
                            Entrar na Sala <ArrowRight />
                        </button>
                        <p className="text-yellow-300">{connectionStatus}</p>
                    </div>
                )}
                
                <button onClick={() => { setMenuState('MAIN'); setLobbyState('NONE'); multiplayerManager.cleanup(); }} className="text-stone-400 underline hover:text-white mt-4">
                    Voltar
                </button>
            </div>
        </div>
      );
  }

  // --- OVERLAYS: PRE-DAY, REPORT, GAME OVER ---

  if (gameState.phase === 'GAME_OVER') {
    const isBankruptcy = gameState.money < gameState.dailyTarget;
    return (
      <div className="flex h-screen w-full items-center justify-center bg-stone-900 text-white font-pixel bg-restaurant relative">
        <div className="absolute inset-0 bg-black/80"></div>
        <div className="text-center space-y-6 p-10 bg-stone-800 rounded-lg border-4 border-stone-600 shadow-2xl relative z-10 w-[500px]">
          <h1 className="text-6xl text-red-500 mb-4 drop-shadow-md uppercase">{isBankruptcy ? "Falência!" : "Vigilância Sanitária!"}</h1>
          
          <div className="bg-stone-900/50 p-4 rounded border border-stone-700">
              <p className="text-2xl text-stone-300 mb-2">Dias Sobrevividos: <span className="text-white font-bold">{gameState.day}</span></p>
              <p className="text-xl text-stone-400">Pontuação Final: <span className="text-yellow-400">{gameState.score}</span></p>
              
              {isBankruptcy && (
                  <p className="text-red-400 mt-2 text-sm">Meta não atingida: R${gameState.money} / R${gameState.dailyTarget}</p>
              )}
              {!isBankruptcy && (
                  <p className="text-red-400 mt-2 text-sm">A cozinha estava muito suja!</p>
              )}
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full px-8 py-4 bg-stone-600 text-white text-2xl hover:bg-stone-500 rounded transition-colors shadow-lg uppercase tracking-wider font-bold"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
    );
  }

  // --- GAME RENDERER ---
  return (
    <div className="min-h-screen font-sans bg-restaurant relative overflow-hidden">
       {/* Background Dimmer for Game Loop */}
       <div className="absolute inset-0 bg-black/50 z-0"></div>
       
       {/* Phase Overlays */}
       {gameState.phase === 'PRE_DAY' && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <div className="bg-stone-800 p-8 rounded-lg border-4 border-stone-600 text-center shadow-2xl max-w-md w-full">
                   <h2 className="text-4xl font-pixel text-yellow-400 mb-2 uppercase">Dia {gameState.day}</h2>
                   <div className="w-full h-px bg-stone-600 my-4"></div>
                   
                   <div className="flex justify-between items-center mb-6 bg-stone-900/50 p-4 rounded">
                       <div className="flex flex-col items-center">
                           <span className="text-stone-400 text-sm font-pixel uppercase">Caixa Atual</span>
                           <span className="text-2xl text-white font-bold font-pixel">R$ {gameState.money}</span>
                       </div>
                       <ArrowRight className="text-stone-500" />
                       <div className="flex flex-col items-center">
                           <span className="text-stone-400 text-sm font-pixel uppercase">Meta do Dia</span>
                           <span className="text-2xl text-green-400 font-bold font-pixel">R$ {gameState.dailyTarget}</span>
                       </div>
                   </div>

                   {gameState.gameMode === 'MULTI_CLIENT' ? (
                       <div className="animate-pulse text-xl font-pixel text-stone-400">Aguardando Chef Anfitrião...</div>
                   ) : (
                       <button onClick={requestStartDay} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold font-pixel text-2xl py-3 rounded shadow-lg transition-transform hover:scale-105">
                           Abrir Restaurante
                       </button>
                   )}
                   
                   {gameState.gameMode === 'SOLO' && (
                     <div className="flex items-center justify-center gap-2 mt-4 text-stone-500 text-sm font-pixel">
                        <Save size={14} /> Jogo Salvo
                     </div>
                   )}
               </div>
           </div>
       )}

       {gameState.phase === 'EOD_REPORT' && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <div className="bg-stone-100 p-8 rounded-sm border-t-8 border-stone-800 text-center shadow-2xl max-w-md w-full transform rotate-1 relative paper-shadow">
                    {/* Clip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-10 bg-stone-400 rounded-t-lg shadow-md border-x-2 border-t-2 border-stone-500 flex justify-center items-center">
                        <div className="w-12 h-3 bg-stone-700 rounded-full"></div>
                    </div>
                   
                   <h2 className="text-4xl font-pixel text-stone-800 mb-2 uppercase tracking-widest border-b-2 border-stone-300 pb-2">Relatório</h2>
                   <p className="text-stone-500 font-pixel text-lg mb-6">Resumo do Dia {gameState.day}</p>
                   
                   <div className="space-y-4 mb-8 font-pixel text-xl">
                       <div className="flex justify-between border-b border-dashed border-stone-300 pb-1">
                           <span className="text-stone-600">Vendas:</span>
                           <span className="text-stone-900 font-bold">R$ {gameState.money}</span>
                       </div>
                       <div className="flex justify-between border-b border-dashed border-stone-300 pb-1">
                           <span className="text-stone-600">Meta:</span>
                           <span className="text-stone-900 font-bold">R$ {gameState.dailyTarget}</span>
                       </div>
                       <div className="flex justify-between items-center bg-green-100 p-2 rounded border border-green-200">
                           <span className="text-green-800 font-bold uppercase">Resultado:</span>
                           <span className="text-green-600 font-bold text-2xl flex items-center gap-2"> <TrendingUp size={20}/> Sucesso</span>
                       </div>
                   </div>

                   {gameState.gameMode === 'MULTI_CLIENT' ? (
                       <div className="animate-pulse text-xl font-pixel text-stone-500">Aguardando decisão...</div>
                   ) : (
                       <button onClick={requestNextDay} className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold font-pixel text-2xl py-3 rounded shadow-lg transition-transform hover:scale-105">
                           Próximo Dia
                       </button>
                   )}
               </div>
           </div>
       )}
       
       {/* Vignette */}
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.5)_100%)] z-40"></div>
       
      <div className="max-w-7xl mx-auto p-4 flex flex-col h-screen relative z-10">
        
        {/* TOP BAR: Stainless Steel Counter */}
        <header className="flex justify-between items-center mb-6 bg-stainless-steel p-4 rounded-b-lg shadow-xl h-24 border-x border-b border-stone-400 relative">
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-stone-400 shadow-inner"></div>
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-stone-400 shadow-inner"></div>

          <div className="flex items-center gap-6 pl-4">
             {/* Day Counter */}
             <div className="flex flex-col bg-stone-800/10 px-3 py-1 rounded border border-white/20">
                <span className="text-[10px] text-stone-700 font-bold uppercase tracking-wider font-pixel flex items-center gap-1"><Calendar size={10} /> Dia</span>
                <span className="text-2xl font-pixel font-bold text-stone-800 leading-none">{gameState.day}</span>
             </div>

             {/* Clock / Timer */}
             <div className="flex flex-col bg-stone-800/10 px-3 py-1 rounded border border-white/20 min-w-[80px]">
                <span className="text-[10px] text-stone-700 font-bold uppercase tracking-wider font-pixel flex items-center gap-1"><Clock size={10} /> Tempo</span>
                <span className={`text-2xl font-pixel font-bold leading-none ${gameState.timeRemaining < 30 ? 'text-red-700 animate-pulse' : 'text-stone-800'}`}>
                    {formatTime(gameState.timeRemaining)}
                </span>
             </div>

             {/* Money & Target */}
             <div className="flex flex-col bg-black/10 px-3 py-1 rounded border border-white/20">
                <span className="text-[10px] text-stone-700 font-bold uppercase tracking-wider font-pixel">Caixa / Meta</span>
                <div className="flex items-center gap-2 text-stone-800">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <span className="text-2xl font-pixel font-bold">R$ {gameState.money} <span className="text-stone-500 text-lg">/ {gameState.dailyTarget}</span></span>
                </div>
             </div>
             
             {/* Score */}
             <div className="flex flex-col bg-black/10 px-3 py-1 rounded border border-white/20 hidden md:flex">
                <span className="text-[10px] text-stone-700 font-bold uppercase tracking-wider font-pixel">Reputação</span>
                <div className="flex items-center gap-2 text-stone-800">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-pixel font-bold">{gameState.score}</span>
                </div>
             </div>
             
             {gameState.gameMode !== 'SOLO' && (
                 <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded border border-blue-300">
                     <Users className="w-5 h-5 text-blue-600" />
                     <span className="font-pixel font-bold text-blue-800">
                        {gameState.gameMode === 'MULTI_HOST' ? 'HOST' : 'CLIENT'}
                     </span>
                 </div>
             )}
          </div>
          
          <div className="w-32 flex justify-end pr-2">
            <button 
              onClick={toggleMute}
              className={`p-2 rounded-full transition-all border-2 shadow-inner ${isMuted ? 'bg-red-100 border-red-300 text-red-500' : 'bg-green-100 border-green-300 text-green-600'}`}
              title={isMuted ? "Ligar Som" : "Silenciar"}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
        </header>

        <div className="flex flex-1 gap-6 overflow-hidden">
          
          {/* LEFT: Kitchen Area */}
          <main className="flex-[3] flex flex-col gap-4 relative">
             <div className="absolute inset-0 bg-subway-tile rounded-xl shadow-inner -z-10 opacity-80"></div>
            
            {/* Order Rail */}
            <div className="relative pt-4 pb-2 px-3">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-stone-300 to-stone-400 border-y border-stone-500 shadow-md z-10 flex items-center justify-around">
                 <div className="w-full h-1 bg-black/10"></div>
              </div>

              <div className="grid grid-cols-3 gap-4 relative h-[260px] z-0 pt-4 px-2">
                {orders.length === 0 && (
                  <div className="col-span-3 flex items-center justify-center text-stone-400/50 font-pixel text-3xl italic">
                     {gameState.phase === 'SERVICE' ? 'Aguardando pedidos...' : 'Restaurante Fechado'}
                  </div>
                )}
                
                {orders.map((order, i) => {
                  const recipe = RECIPES.find(r => r.id === order.recipeId);
                  const rotation = i % 2 === 0 ? 'rotate-1' : '-rotate-1';
                  
                  return (
                    <div key={order.id} className={`w-full h-full bg-[#fff9c4] text-stone-900 shadow-lg flex flex-col relative overflow-hidden transform ${rotation} origin-top transition-all duration-300 hover:scale-105 paper-shadow rounded-b-sm`}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-stone-800/20 z-20"></div>

                      <div className="h-24 w-full relative grayscale-[20%] sepia-[20%] shrink-0">
                          <img 
                              src={recipe?.image} 
                              alt={recipe?.name} 
                              className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-1 right-1 text-base font-bold text-stone-800 bg-[#fff9c4] px-1.5 border border-stone-300 shadow-sm font-pixel">R${recipe?.price}</div>
                      </div>

                      <div className="h-1.5 bg-stone-300 w-full z-10 border-y border-stone-400 shrink-0">
                         <div 
                           className={`h-full transition-all duration-1000 linear ${order.patience < 30 ? 'bg-red-500' : 'bg-green-600'}`} 
                           style={{ width: `${order.patience}%` }}
                         />
                      </div>
                      
                      <div className="p-3 flex flex-col h-full justify-between font-sans min-h-0">
                        <div className="font-bold text-xl text-stone-800 leading-tight mb-2 truncate font-pixel border-b border-dashed border-stone-400 pb-1">{recipe?.name}</div>

                        <div className="flex-1 flex flex-col justify-center min-h-0">
                          <div className="flex flex-wrap gap-2 justify-center">
                             {recipe?.ingredients.map((ing, i) => (
                               <div key={i} className={`w-7 h-7 rounded border border-black/20 shadow-sm flex items-center justify-center text-xs font-bold font-pixel text-white ${INGREDIENTS[ing].color}`} title={INGREDIENTS[ing].name}>
                                 {ing}
                               </div>
                             ))}
                          </div>
                        </div>
                        <div className="text-xs text-center text-stone-500 font-pixel mt-1 shrink-0">MESA {i + 1}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stations Grid */}
            <div className="grid grid-cols-3 gap-4 flex-1 px-3 items-start">
              {stations.map(station => (
                <div key={station.id} className="relative w-full">
                   <KitchenStation 
                      station={station}
                      isActive={activeStationId === station.id}
                      onClick={() => handleStationClick(station.id)}
                      onServe={() => handleServe(station.id)}
                   />
                   
                   {activeStationId === station.id && station.state === 'empty' && (
                     <div className="absolute inset-0 bg-stone-900/90 z-20 rounded shadow-2xl flex flex-col items-center p-3 animate-in fade-in zoom-in duration-200 border-2 border-stone-600 backdrop-blur-sm">
                        <div className="flex justify-between w-full items-center mb-2 px-1 shrink-0">
                           <h3 className="text-white font-pixel text-xl uppercase tracking-wider border-b border-stone-600 pb-1">Menu</h3>
                           <button 
                              onClick={(e) => { e.stopPropagation(); setActiveStationId(null); }}
                              className="text-xs text-red-300 hover:text-white uppercase tracking-widest transition-colors font-bold"
                            >
                              [X]
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 w-full flex-1 min-h-0">
                          {RECIPES.map(r => (
                            <button 
                              key={r.id}
                              onClick={(e) => { e.stopPropagation(); handleRecipeSelect(r.id); }}
                              className="relative overflow-hidden group bg-stone-800 rounded border border-stone-600 hover:border-amber-400 transition-all flex flex-col justify-end items-center text-left"
                            >
                              <img src={r.image} alt={r.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity grayscale hover:grayscale-0 duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                              
                              <div className="z-10 w-full p-2 flex flex-col items-center">
                                <div className="text-sm font-pixel text-white font-bold leading-tight text-center mb-0.5 drop-shadow-md truncate w-full">{r.name}</div>
                                <div className="flex gap-0.5 justify-center flex-wrap max-w-full">
                                    {r.ingredients.map((ing, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${INGREDIENTS[ing].color} border border-white/20`} />
                                    ))}
                                </div>
                                <span className="text-[10px] text-amber-300 font-pixel mt-0.5">R${r.price}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
              ))}
            </div>

            {/* Prep Board */}
            <div className="mx-3 mb-3 bg-stone-100/90 rounded border border-stone-300 shadow-lg p-2 flex items-center justify-between paper-shadow relative transform -rotate-0.5">
               <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-100/50 rotate-1"></div>
               
               <div className="flex flex-col w-full">
                 <span className="text-stone-500 text-[10px] font-bold uppercase mb-1 tracking-widest font-pixel border-b border-stone-300 pb-1 text-center">Atalhos de Preparo</span>
                 <div className="flex flex-wrap gap-2 justify-center">
                    {Object.values(INGREDIENTS).map(ing => (
                      <div key={ing.key} className="flex flex-col items-center group cursor-default">
                        <kbd className="bg-stone-800 text-white font-pixel font-bold text-lg w-8 h-8 rounded flex items-center justify-center shadow-lg border border-stone-600 group-hover:-translate-y-1 transition-transform">
                          {ing.key}
                        </kbd>
                        <span className="text-[9px] text-stone-600 mt-1 font-bold uppercase">{ing.name}</span>
                      </div>
                    ))}
                 </div>
               </div>
            </div>

          </main>

          {/* RIGHT: Management & Ranking Area */}
          <aside className="flex-1 flex flex-col gap-6 pt-4 pr-4">
             <HygieneStation 
               hygiene={gameState.hygiene}
               onClean={cleanKitchen}
             />
             
             <GlobalRanking 
                currentScore={gameState.score} 
                gameMode={gameState.gameMode}
                gameId={gameRunId}
             />

             {/* Log Clipboard */}
             <div className="flex-1 bg-[#fffde7] rounded-sm p-4 font-pixel text-stone-700 text-sm overflow-y-auto border-t-8 border-stone-700 shadow-xl relative paper-shadow">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-8 bg-stone-400 rounded-t-lg shadow-inner z-10 border border-stone-500">
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-2 bg-stone-700 rounded-full"></div>
                    </div>
                </div>

                <h4 className="text-stone-900 border-b-2 border-stone-800 pb-2 mb-2 uppercase tracking-wider text-center font-bold">Registro do Chef</h4>
                
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, #e0e0e0 24px)', backgroundAttachment: 'local', top: '60px' }}></div>

                <div className="space-y-2 relative z-10">
                  <p className="text-stone-600">[{gameState.day}] Bistrô aberto.</p>
                  {orders.length > 0 && <p className="text-amber-700 font-bold">! Novo Pedido (Mesa {orders.length})</p>}
                  {gameState.money >= gameState.dailyTarget && <p className="text-green-700">* META DO DIA ATINGIDA!</p>}
                  {gameState.hygiene < 40 && <p className="text-red-600 font-bold">!!! LIMPEZA NECESSÁRIA !!!</p>}
                  {gameState.timeRemaining < 15 && <p className="text-red-500 animate-pulse">! FECHANDO EM BREVE !</p>}
                </div>
             </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default App;
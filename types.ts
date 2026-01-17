export type IngredientKey = 'P' | 'C' | 'Q' | 'A' | 'T' | 'M' | 'O';

export interface Ingredient {
  key: IngredientKey;
  name: string;
  color: string;
  textColor?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: IngredientKey[]; // Sequence required
  prepTime: number; // ms to cook after prep
  price: number;
  image: string; // URL for the real food image
}

export interface Order {
  id: string;
  recipeId: string;
  createdAt: number;
  patience: number; // 0-100
  status: 'waiting' | 'served' | 'expired';
}

export type StationState = 'empty' | 'prepping' | 'cooking' | 'ready' | 'burned';

export interface Station {
  id: number;
  state: StationState;
  currentRecipeId: string | null;
  prepSequence: IngredientKey[]; // Ingredients added so far
  cookStartTime: number | null;
  cookProgress: number; // 0-100
}

export type GamePhase = 'MENU' | 'PRE_DAY' | 'SERVICE' | 'EOD_REPORT' | 'GAME_OVER';

export interface GameState {
  money: number;
  hygiene: number; // 0-100
  score: number;
  
  // New Mechanics
  day: number;
  dailyTarget: number; // Cash goal to pass the day
  timeRemaining: number; // Seconds left in the day
  phase: GamePhase; // Replaces simple isPlaying boolean
  
  gameMode?: 'SOLO' | 'MULTI_HOST' | 'MULTI_CLIENT';
}

// --- Multiplayer Types ---

export type MessageType = 'SYNC_STATE' | 'CLIENT_ACTION' | 'GAME_START' | 'GAME_OVER' | 'NEXT_DAY';

export interface NetworkMessage {
  type: MessageType;
  payload: any;
}

export interface SyncStatePayload {
  gameState: GameState;
  stations: Station[];
  orders: Order[];
  activeStationId?: number | null; // For visual sync (optional)
}

export type ClientActionType = 
  | { type: 'CLICK_STATION', stationId: number }
  | { type: 'SELECT_RECIPE', recipeId: string }
  | { type: 'KEY_PRESS', key: IngredientKey }
  | { type: 'SERVE', stationId: number }
  | { type: 'CLEAN' }
  | { type: 'START_DAY' } // For multiplayer sync
  | { type: 'NEXT_DAY_CONFIRM' }; // For multiplayer sync

export interface ClientActionPayload {
  action: ClientActionType;
}
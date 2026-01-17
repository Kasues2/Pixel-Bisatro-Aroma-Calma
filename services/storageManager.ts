import { GameState } from '../types';

const SAVE_KEY = 'PIXEL_BISTRO_SAVE_DATA_V1';

export const storageManager = {
  save: (state: GameState) => {
    try {
      // Save only necessary data, reset operational data
      const dataToSave = {
        money: state.money,
        hygiene: state.hygiene,
        score: state.score,
        day: state.day,
        dailyTarget: state.dailyTarget,
        gameMode: 'SOLO' // We only save SOLO progress
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed to save game", e);
    }
  },

  load: (): Partial<GameState> | null => {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load game", e);
      return null;
    }
  },

  clear: () => {
    localStorage.removeItem(SAVE_KEY);
  },

  hasSave: (): boolean => {
    return !!localStorage.getItem(SAVE_KEY);
  }
};
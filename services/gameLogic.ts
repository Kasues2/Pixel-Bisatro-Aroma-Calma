import { Order, Recipe } from '../types';
import { RECIPES } from '../constants';

/**
 * Simulates the backend logic described in the prompt as "Java".
 * Handles validation, scoring calculations, and data retrieval.
 */
export class OrderValidator {
  
  static getRecipe(recipeId: string): Recipe | undefined {
    return RECIPES.find(r => r.id === recipeId);
  }

  /**
   * Calculates tip based on remaining patience (speed) and accuracy.
   * Matches the logic: public int calcularGorjeta(long tempoGasto, boolean erroIngrediente)
   */
  static calculateTip(patienceRemaining: number, basePrice: number): number {
    // If patience is high (>50%), give a good tip.
    if (patienceRemaining > 50) {
      return Math.floor(basePrice * 0.25); // 25% tip
    } else if (patienceRemaining > 20) {
      return Math.floor(basePrice * 0.10); // 10% tip
    }
    return 0;
  }

  static validateService(stationRecipeId: string | null, orderRecipeId: string): boolean {
    return stationRecipeId === orderRecipeId;
  }
}

export const generateOrder = (): Order => {
  const randomRecipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return {
    id: Math.random().toString(36).substr(2, 9),
    recipeId: randomRecipe.id,
    createdAt: Date.now(),
    patience: 100,
    status: 'waiting'
  };
};
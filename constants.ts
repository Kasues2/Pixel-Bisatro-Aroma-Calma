import { Ingredient, Recipe, IngredientKey } from './types';

export const INGREDIENTS: Record<IngredientKey, Ingredient> = {
  'P': { key: 'P', name: 'Pão', color: 'bg-amber-600' },
  'C': { key: 'C', name: 'Carne', color: 'bg-red-800' },
  'Q': { key: 'Q', name: 'Queijo', color: 'bg-yellow-400', textColor: 'text-yellow-900' },
  'A': { key: 'A', name: 'Alface', color: 'bg-green-500' },
  'T': { key: 'T', name: 'Tomate', color: 'bg-red-500' },
  'M': { key: 'M', name: 'Massa', color: 'bg-yellow-200', textColor: 'text-yellow-900' },
  'O': { key: 'O', name: 'Ovo', color: 'bg-white', textColor: 'text-black' },
};

export const RECIPES: Recipe[] = [
  {
    id: 'hamburguer',
    name: 'X-Burguer Clássico',
    ingredients: ['P', 'C', 'Q', 'P'],
    prepTime: 3000,
    price: 25,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'salada',
    name: 'Salada Fresca',
    ingredients: ['A', 'T', 'Q'],
    prepTime: 1000,
    price: 15,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'carbonara',
    name: 'Carbonara',
    ingredients: ['M', 'O', 'C', 'Q'],
    prepTime: 5000,
    price: 40,
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'bauru',
    name: 'Bauru',
    ingredients: ['P', 'Q', 'T', 'P'],
    prepTime: 2500,
    price: 20,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80'
  }
];

export const GAME_CONFIG = {
  INITIAL_MONEY: 0,
  INITIAL_TARGET: 100, // Goal for Day 1
  TARGET_INCREASE_PER_DAY: 120, // Add this much to target each day
  
  MAX_HYGIENE: 100,
  HYGIENE_DECAY_RATE: 0.3, // Slower decay for cozy feel
  PATIENCE_DECAY_RATE: 0.6, // Slower decay
  ORDER_SPAWN_RATE: 0.008, 
  
  TICK_RATE: 100, // ms
  DAY_DURATION_SECONDS: 90, // 1 min 30 sec per day
};
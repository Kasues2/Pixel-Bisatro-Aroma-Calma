import { GoogleGenAI } from "@google/genai";

class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      console.warn("API_KEY not found. AI features disabled.");
    }
  }

  async generateDailyReview(day: number, money: number, target: number, hygiene: number, score: number): Promise<string> {
    if (!this.ai) {
      return "O crítico gastronômico não compareceu hoje. (Configure a API KEY para ver avaliações!)";
    }

    const isSuccess = money >= target;
    let mood = "";
    
    if (!isSuccess) {
      mood = "Decepcionado, crítico, sarcástico.";
    } else if (hygiene < 50) {
      mood = "Enojado com a sujeira, mas talvez gostando da comida.";
    } else if (score > 100) {
      mood = "Extasiado, poético, encantado.";
    } else {
      mood = "Profissional, justo, breve.";
    }

    const prompt = `
      Você é um crítico gastronômico famoso visitando o 'Pixel Bistro'.
      Escreva uma avaliação CURTA (máximo 140 caracteres) sobre o dia de hoje.
      
      Estatísticas:
      - Dia: ${day}
      - Faturamento: R$${money} (Meta: R$${target})
      - Higiene da Cozinha: ${hygiene}%
      
      Tom da avaliação: ${mood}
      Idioma: Português do Brasil.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Avaliação ilegível...";
    } catch (error) {
      console.error("AI Error:", error);
      return "O crítico perdeu suas anotações...";
    }
  }
}

export const aiService = new AIService();
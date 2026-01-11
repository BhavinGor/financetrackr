import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const GEMINI_MODEL = "gemini-2.5-flash";

export const getFinancialInsights = async (transactions: Transaction[], balance: number): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing. Skipping AI insight.");
    return "API Key not configured. Unable to generate insights.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare a summary string of the last 15 transactions
  const recentTx = transactions.slice(0, 15).map(t => 
    `${t.date}: ${t.type} - ${t.category} (₹${t.amount}) - ${t.description}`
  ).join('\n');

  const prompt = `
    You are a financial advisor for the "FinanceTrackr" app tailored for an Indian user context.
    Current Total Balance: ₹${balance}
    
    Here are the recent transactions:
    ${recentTx}

    Please provide a concise, 3-point financial insight or advice summary based on this data.
    Focus on spending habits, potential savings, or budget alerts.
    Keep the tone professional yet encouraging.
    Format as a markdown list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Error generating financial insights:", error);
    return "Unable to generate insights at this moment. Please try again later.";
  }
};

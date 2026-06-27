import { Transaction } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getFinancialInsights = async (transactions: Transaction[], balance: number): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/api/ai/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance, provider: 'gemini' }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get insights');
        }

        const data = await response.json();
        return data.insights || "No insights generated.";
    } catch (error) {
        console.error("Error generating financial insights:", error);
        return "Unable to generate insights at this moment. Please try again later.";
    }
};

import { Transaction } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getFinancialInsights = async (transactions: Transaction[], balance: number): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/api/ai/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions, balance, provider: 'bedrock' }),
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

export const parseTransactionFromEmail = async (emailContent: string): Promise<Partial<Transaction> | null> => {
    try {
        const response = await fetch(`${API_BASE}/api/ai/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdf_text: emailContent, provider: 'bedrock' }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data?.transactions?.[0] || null;
    } catch (error) {
        console.error("Error parsing email:", error);
        return null;
    }
};

export const extractTransactionsFromPdf = async (pdfText: string): Promise<any> => {
    if (!pdfText || pdfText.trim().length === 0) {
        throw new Error('No text available for extraction. PDF may be empty or unreadable.');
    }

    const response = await fetch(`${API_BASE}/api/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_text: pdfText, provider: 'bedrock' }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract transactions');
    }

    const data = await response.json();
    return data.data;
};

import { create } from 'zustand';
import { Budget } from '../types';
import { fetchBudgets, saveBudgetsToDb } from '../services/supabase/database';
import { Transaction, TransactionType } from '../types';

const calculateBudgetSpent = (category: string, transactions: Transaction[]): number => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.category === category &&
        t.type === TransactionType.EXPENSE &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  load: (transactions: Transaction[]) => Promise<void>;
  saveBudgets: (budgets: Budget[]) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: true,

  load: async (transactions: Transaction[]) => {
    try {
      const bgs = await fetchBudgets();
      const budgetsWithSpent = bgs.map((b) => ({
        ...b,
        spent: calculateBudgetSpent(b.category as string, transactions),
        period: 'monthly' as const,
      }));
      set({ budgets: budgetsWithSpent });
    } finally {
      set({ loading: false });
    }
  },

  saveBudgets: async (budgets: Budget[]) => {
    set({ budgets });
    await saveBudgetsToDb(budgets);
  },
}));

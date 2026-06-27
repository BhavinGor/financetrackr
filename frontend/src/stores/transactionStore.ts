import { create } from 'zustand';
import { Transaction, TransactionType } from '../types';
import {
  fetchTransactions,
  addTransactionToDb,
  updateTransactionInDb,
  deleteTransactionFromDb,
  addTransactionWithExtensions,
  updateTransactionWithExtensions,
  fetchAllFuelTransactions,
  fetchAllInvestmentTransactions,
} from '../services/supabase/database';

interface TransactionState {
  transactions: Transaction[];
  fuelLogs: any[];
  investments: any[];
  loading: boolean;
  load: () => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  bulkAddTransactions: (txs: Transaction[]) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransactionWithExt: (
    tx: Transaction,
    fuelData?: { vehicleId: string; liters: number; mileage?: number },
    investmentData?: { investmentType: string; assetName: string; quantity?: number; pricePerUnit?: number }
  ) => Promise<string>;
  addFuelLog: (log: any, defaultAccountId: string) => Promise<void>;
  addInvestment: (inv: any, defaultAccountId: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  fuelLogs: [],
  investments: [],
  loading: true,

  load: async () => {
    try {
      const [txs, fuelTxs, invTxs] = await Promise.all([
        fetchTransactions(),
        fetchAllFuelTransactions(),
        fetchAllInvestmentTransactions(),
      ]);
      set({ transactions: txs, fuelLogs: fuelTxs, investments: invTxs });
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (tx: Transaction) => {
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    try {
      const id = await addTransactionToDb(tx);
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === tx.id ? { ...tx, id } : t)),
      }));
    } catch {
      set((s) => ({ transactions: s.transactions.filter((t) => t.id !== tx.id) }));
    }
  },

  bulkAddTransactions: async (txs: Transaction[]) => {
    set((s) => ({ transactions: [...txs, ...s.transactions] }));
    await Promise.all(txs.map((tx) => addTransactionToDb(tx)));
  },

  updateTransaction: async (tx: Transaction) => {
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)) }));
    await updateTransactionWithExtensions(tx);
    const [fuelTxs, invTxs] = await Promise.all([
      fetchAllFuelTransactions(),
      fetchAllInvestmentTransactions(),
    ]);
    set({ fuelLogs: fuelTxs, investments: invTxs });
  },

  deleteTransaction: async (id: string) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    await deleteTransactionFromDb(id);
  },

  addTransactionWithExt: async (tx, fuelData, investmentData) => {
    const id = await addTransactionWithExtensions(tx, fuelData, investmentData);
    set((s) => ({ transactions: [{ ...tx, id }, ...s.transactions] }));
    if (fuelData) {
      const fuelTxs = await fetchAllFuelTransactions();
      set({ fuelLogs: fuelTxs });
    }
    return id;
  },

  addFuelLog: async (log, defaultAccountId) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      type: TransactionType.EXPENSE,
      category: 'Fuel',
      description: 'Fuel for vehicle',
      amount: log.cost,
      date: log.date,
      accountId: defaultAccountId,
      source: 'manual',
    };
    await get().addTransactionWithExt(transaction, {
      vehicleId: log.vehicleId,
      liters: log.liters,
      mileage: log.mileage,
    });
  },

  addInvestment: async (inv, defaultAccountId) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      type: TransactionType.EXPENSE,
      category: 'Investment',
      description: `Investment in ${inv.name}`,
      amount: inv.investedAmount,
      date: inv.date,
      accountId: defaultAccountId,
      source: 'manual',
    };
    await get().addTransactionWithExt(transaction, undefined, {
      investmentType: inv.type,
      assetName: inv.name,
      quantity: inv.quantity,
      pricePerUnit: inv.quantity ? inv.investedAmount / inv.quantity : undefined,
    });
  },
}));

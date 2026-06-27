import { create } from 'zustand';
import { Account } from '../types';
import {
  fetchAccounts,
  addAccountToDb,
  updateAccountInDb,
  deleteAccountFromDb,
} from '../services/supabase/database';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  load: () => Promise<void>;
  addAccount: (acc: Account) => Promise<Account>;
  updateAccount: (acc: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  loading: true,

  load: async () => {
    try {
      const accounts = await fetchAccounts();
      set({ accounts });
    } finally {
      set({ loading: false });
    }
  },

  addAccount: async (acc: Account) => {
    set((s) => ({ accounts: [...s.accounts, acc] }));
    try {
      const id = await addAccountToDb(acc);
      const saved = { ...acc, id };
      set((s) => ({ accounts: s.accounts.map((a) => (a.id === acc.id ? saved : a)) }));
      return saved;
    } catch (error) {
      set((s) => ({ accounts: s.accounts.filter((a) => a.id !== acc.id) }));
      throw error;
    }
  },

  updateAccount: async (acc: Account) => {
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === acc.id ? acc : a)) }));
    await updateAccountInDb(acc);
  },

  deleteAccount: async (id: string) => {
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
    await deleteAccountFromDb(id);
  },
}));

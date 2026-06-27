import { create } from 'zustand';
import { supabase } from '../services/supabase/client';

interface AuthState {
  session: any;
  loading: boolean;
  setSession: (session: any) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  setSession: (session) => set({ session, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

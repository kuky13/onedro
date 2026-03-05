import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreState {
  currentStore: Store | null;
  isLoading: boolean;
  setCurrentStore: (store: Store | null) => void;
  fetchUserStore: (userId: string) => Promise<void>;
}

export const useStoreStore = create<StoreState>((set) => ({
  currentStore: null,
  isLoading: false,
  setCurrentStore: (store) => set({ currentStore: store }),
  fetchUserStore: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      set({ currentStore: data });
    } catch (error) {
      console.error('Error fetching store:', error);
      // For demo purposes, if table doesn't exist, we don't set store
    } finally {
      set({ isLoading: false });
    }
  },
}));

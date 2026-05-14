import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setApiToken } from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,
      setAuth: ({ token, user }) => {
        setApiToken(token);
        set({ token, user });
      },
      clearAuth: () => {
        setApiToken(null);
        set({ token: null, user: null });
      },
      setHydrated: (value) => set({ isHydrated: value }),
    }),
    {
      name: 'sql-realtime-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setApiToken(state.token);
        }
        state?.setHydrated(true);
      },
    }
  )
);

export default useAuthStore;

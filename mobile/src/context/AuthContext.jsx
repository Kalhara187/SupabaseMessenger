import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { loginUser, logoutUser, registerUser } from '../services/authService';
import { initApi } from '../services/api';
import useAuthStore from '../store/authStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { token, user, setAuth, clearAuth, isHydrated } = useAuthStore();

  const value = useMemo(
    () => ({
      token,
      user,
      isHydrated,
      isAuthenticated: Boolean(token && user),
      login: async ({ email, password }) => {
        const result = await loginUser({ email, password });
        setAuth(result);
        return result;
      },
      register: async (payload) => {
        const result = await registerUser(payload);
        setAuth(result);
        return result;
      },
      logout: async () => {
        try {
          await logoutUser();
        } catch (error) {
          // Ignore network/logout errors and clear local state anyway.
        }
        clearAuth();
      },
    }),
    [token, user, isHydrated, setAuth, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// initialize API host on mount
export const AuthProviderWrapper = ({ children }) => {
  useEffect(() => {
    initApi()
      .then((host) => console.log('[API] Host set to', host))
      .catch((error) => console.warn('[API] Initialization warning:', error?.message));
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

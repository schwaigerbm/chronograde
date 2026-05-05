import { useState, useEffect, useCallback } from 'react';
import type { AppUser } from '../schema';
import { firebaseService } from '../services/firebaseService';

const AUTH_STORAGE_KEY = 'chronograde_user';

/**
 * Hook to manage custom authentication state using Firestore 'users' collection.
 * Persists session in localStorage and handles state updates.
 */
export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize: check if user is in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const appUser = await firebaseService.loginWithCredentials(username, password);
      // FIRST: Update state to trigger re-render
      setUser(appUser);
      // SECOND: Persist for next refresh
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(appUser));
      return appUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    // Clear state FIRST
    setUser(null);
    // Clear storage SECOND
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};

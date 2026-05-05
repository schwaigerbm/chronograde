import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { firebaseService } from '../services/firebaseService';

/**
 * Hook to manage and provide the current Firebase authentication state.
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = firebaseService.subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
};

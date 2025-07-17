import { useState, useEffect, useCallback } from 'react';
import { auth, User, AuthState, UserPreferences } from '../services/auth';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (userId: string, updates: Partial<User>) => Promise<User>;
  updatePreferences: (userId: string, preferences: Partial<UserPreferences>) => Promise<UserPreferences>;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(auth.getAuthState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.subscribe(newState => {
      setAuthState(newState);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    return auth.login({ email, password });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<User> => {
    return auth.register({ email, password, name });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    return auth.logout();
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: Partial<User>): Promise<User> => {
    return auth.updateProfile(userId, updates);
  }, []);

  const updatePreferences = useCallback(async (userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
    return auth.updatePreferences(userId, preferences);
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    login,
    register,
    logout,
    updateProfile,
    updatePreferences
  };
} 
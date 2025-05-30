import React, { createContext, useContext, useEffect, useState } from 'react';
import { log, logError } from '../constants/Config';
import { authApi } from '../services/authApi';
import { AUTH_KEYS, storage } from '../utils/storage';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void; // Changed to redirect-based login
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Check for existing auth and OAuth callback on app load
  useEffect(() => {
    async function initializeAuth() {
      try {
        setIsLoading(true);
        
        // First, check if we have OAuth callback parameters
        const oauthResult = authApi.parseOAuthCallback();
        if (oauthResult) {
          log('Processing OAuth callback');
          await handleAuthSuccess(oauthResult.token, oauthResult.user);
          return;
        }

        // Otherwise, check for existing stored auth
        const [storedToken, storedUser] = await Promise.all([
          storage.getItem(AUTH_KEYS.TOKEN),
          storage.getItem(AUTH_KEYS.USER_PROFILE)
        ]);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          log('Restored authentication from storage', { userId: parsedUser.email });
        } else {
          log('No existing authentication found');
        }
      } catch (error) {
        logError('Error initializing auth', error);
        // Clear any corrupted data
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = async (authToken: string, userProfile: UserProfile) => {
    try {
      setToken(authToken);
      setUser(userProfile);

      // Store authentication data
      await Promise.all([
        storage.setItem(AUTH_KEYS.TOKEN, authToken),
        storage.setItem(AUTH_KEYS.USER_PROFILE, JSON.stringify(userProfile))
      ]);

      log('Authentication successful', { userId: userProfile.email });
    } catch (error) {
      logError('Error storing auth data', error);
      throw error;
    }
  };

  // Redirect-based login
  const login = () => {
    try {
      log('Starting OAuth login flow');
      authApi.initiateGoogleLogin();
    } catch (error) {
      logError('Error starting login', error);
      throw error;
    }
  };

  // Clear authentication
  const clearAuth = async () => {
    setUser(null);
    setToken(null);
    await Promise.all([
      storage.removeItem(AUTH_KEYS.TOKEN),
      storage.removeItem(AUTH_KEYS.USER_PROFILE)
    ]);
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);
      
      if (token) {
        await authApi.logout(token);
      }
      
      await clearAuth();
      log('Logout completed');
    } catch (error) {
      logError('Error during logout', error);
      // Clear local auth even if API call fails
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
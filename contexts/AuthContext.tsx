import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AUTH_KEYS, storage } from '../utils/storage';

export interface UserProfile {
  name: string;
  profilePicUrl: string;
  email: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserProfile | null;
}

export interface AuthContextType extends AuthState {
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    token: null,
    user: null,
  });

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getItem(AUTH_KEYS.TOKEN);
      const userProfileJson = await storage.getItem(AUTH_KEYS.USER_PROFILE);
      
      if (token && userProfileJson) {
        const user = JSON.parse(userProfileJson);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          token,
          user,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          token: null,
          user: null,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
      });
    }
  };

  const login = async (token: string, user: UserProfile) => {
    try {
      await storage.setItem(AUTH_KEYS.TOKEN, token);
      await storage.setItem(AUTH_KEYS.USER_PROFILE, JSON.stringify(user));
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        token,
        user,
      });
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await storage.removeItem(AUTH_KEYS.TOKEN);
      await storage.removeItem(AUTH_KEYS.USER_PROFILE);
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        user: null,
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
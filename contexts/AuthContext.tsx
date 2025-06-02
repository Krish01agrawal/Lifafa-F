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
  login: () => void;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = !!token;

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Check for existing auth and OAuth callback on app load
  useEffect(() => {
    async function initializeAuth() {
      try {
        setIsLoading(true);
        log('Starting authentication initialization...');
        
        // First, check if we have OAuth callback parameters
        const oauthResult = authApi.parseOAuthCallback();
        if (oauthResult) {
          // Check if it's an error response
          if ('error' in oauthResult) {
            log('OAuth error detected', { error: oauthResult.error });
            setAuthError(oauthResult.error);
            setIsLoading(false);
            return;
          }
          
          // Success case
          log('OAuth callback detected, processing...', {
            tokenPresent: !!oauthResult.token,
            userEmail: oauthResult.user.email
          });
          await handleAuthSuccess(oauthResult.token, oauthResult.user);
          log('OAuth callback processing completed, user should be logged in');
          setIsLoading(false);
          return;
        }

        // Check for existing stored auth using the new keys
        log('No OAuth callback, checking localStorage...', {
          tokenKey: AUTH_KEYS.TOKEN,
          userKey: AUTH_KEYS.USER_PROFILE
        });
        
        const [storedToken, storedCurrentUser] = await Promise.all([
          storage.getItem(AUTH_KEYS.TOKEN),
          storage.getItem(AUTH_KEYS.USER_PROFILE)
        ]);

        log('localStorage check results', {
          tokenFound: !!storedToken,
          userFound: !!storedCurrentUser,
          tokenValue: storedToken ? 'PRESENT' : 'NULL',
          userValue: storedCurrentUser ? 'PRESENT' : 'NULL'
        });

        if (storedToken && storedCurrentUser) {
          // Handle currentUser as email string or JSON object
          let parsedUser: UserProfile;
          
          try {
            // Try parsing as JSON first (new format)
            parsedUser = JSON.parse(storedCurrentUser);
            log('Parsed user from JSON format', { email: parsedUser.email });
          } catch (jsonError) {
            // If not JSON, treat as email string (legacy format)
            log('JSON parsing failed, treating as email string', { userString: storedCurrentUser });
            
            if (storedCurrentUser.includes('@')) {
              parsedUser = {
                id: storedCurrentUser,
                email: storedCurrentUser,
                name: storedCurrentUser.split('@')[0],
                avatar: undefined
              };
            } else {
              // Fallback if not an email
              parsedUser = {
                id: storedCurrentUser,
                email: `${storedCurrentUser}@example.com`,
                name: storedCurrentUser,
                avatar: undefined
              };
            }
            log('Created user object from email string', { email: parsedUser.email });
          }
          
          setToken(storedToken);
          setUser(parsedUser);
          log('Authentication restored from localStorage', { 
            userId: parsedUser.email,
            tokenPresent: !!storedToken 
          });
        } else {
          log('No existing authentication found in localStorage');
        }
      } catch (error) {
        logError('Error initializing auth', error);
        // Clear any corrupted data
        await clearAuth();
      } finally {
        setIsLoading(false);
        log('Authentication initialization completed');
      }
    }

    initializeAuth();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = async (authToken: string, userProfile: UserProfile) => {
    try {
      log('handleAuthSuccess called', { 
        tokenPresent: !!authToken, 
        userEmail: userProfile.email,
        userName: userProfile.name 
      });
      
      setToken(authToken);
      setUser(userProfile);

      // Store authentication data in localStorage
      // Store currentUser as JSON object and jwtToken as string
      await Promise.all([
        storage.setItem(AUTH_KEYS.TOKEN, authToken),
        storage.setItem(AUTH_KEYS.USER_PROFILE, JSON.stringify(userProfile)) // Store full user object as JSON
      ]);

      log('Authentication data stored successfully', { 
        userId: userProfile.email,
        storedKeys: [AUTH_KEYS.TOKEN, AUTH_KEYS.USER_PROFILE]
      });
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
      log('Starting logout process...');
      setIsLoading(true);
      
      if (token) {
        log('Calling API logout...');
        await authApi.logout(token);
        log('API logout completed');
      } else {
        log('No token present, skipping API logout');
      }
      
      log('Clearing local auth data...');
      await clearAuth();
      log('Logout completed successfully');
    } catch (error) {
      logError('Error during logout', error);
      // Clear local auth even if API call fails
      log('Clearing local auth data after error...');
      await clearAuth();
    } finally {
      setIsLoading(false);
      log('Logout process finished, loading set to false');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    authError,
    clearAuthError,
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
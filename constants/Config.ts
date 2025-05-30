import Constants from 'expo-constants';

// Type definitions for better TypeScript support
interface AppConfig {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  retryAttempts: number;
  
  // App Information
  appName: string;
  appVersion: string;
  
  // Environment Configuration
  environment: string;
  debugMode: boolean;
  enableLogging: boolean;
  
  // OAuth Configuration
  googleClientId: string;
  
  // Feature Flags
  enableWebSocket: boolean;
  enableAnalytics: boolean;
}

// Get configuration from Expo Constants
const getConfig = (): AppConfig => {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    // API Configuration
    apiUrl: extra.apiUrl || 'http://localhost:3000',
    apiTimeout: extra.apiTimeout || 10000,
    retryAttempts: extra.retryAttempts || 3,
    
    // App Information
    appName: extra.appName || 'Lifafa',
    appVersion: extra.appVersion || '1.0.0',
    
    // Environment Configuration
    environment: extra.environment || 'development',
    debugMode: extra.debugMode || false,
    enableLogging: extra.enableLogging || false,
    
    // OAuth Configuration
    googleClientId: extra.googleClientId || '',
    
    // Feature Flags
    enableWebSocket: extra.enableWebSocket || false,
    enableAnalytics: extra.enableAnalytics || false,
  };
};

// Export the configuration object
export const Config = getConfig();

// Helper functions for common checks
export const isDevelopment = () => Config.environment === 'development';
export const isProduction = () => Config.environment === 'production';
export const isDebugMode = () => Config.debugMode;

// API Configuration helpers
export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = Config.apiUrl.endsWith('/') 
    ? Config.apiUrl.slice(0, -1) 
    : Config.apiUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Logging helper
export const log = (message: string, ...args: any[]) => {
  if (Config.enableLogging || isDevelopment()) {
    console.log(`[${Config.appName}]`, message, ...args);
  }
};

export const logError = (message: string, error?: any) => {
  if (Config.enableLogging || isDevelopment()) {
    console.error(`[${Config.appName}] ERROR:`, message, error);
  }
};

// Export types for use in other files
export type { AppConfig };

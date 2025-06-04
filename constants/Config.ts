import Constants from 'expo-constants';

interface ConfigType {
  env: 'development' | 'production';
  apiUrl: string;
  enableLogging: boolean;
  enableDetailedLogging: boolean;
  enableMockApi: boolean;
}

const extra = Constants.expoConfig?.extra || {};

// Core configuration
export const Config: ConfigType = {
  env: extra.env || 'development',
  apiUrl: extra.apiUrl,
  enableLogging: extra.enableLogging !== undefined ? extra.enableLogging : true,
  enableDetailedLogging: extra.enableDetailedLogging !== undefined ? extra.enableDetailedLogging : false,
  enableMockApi: extra.enableMockApi !== undefined ? extra.enableMockApi : false,
};

// Log current config (only in development)
if (Config.env === 'development' && Config.enableLogging) {
  console.log('📱 App Config:', {
    env: Config.env,
    apiUrl: Config.apiUrl,
    enableLogging: Config.enableLogging,
    enableDetailedLogging: Config.enableDetailedLogging,
    enableMockApi: Config.enableMockApi,
  });
}

// Conditional logging
export const log = (...args: any[]) => {
  if (Config.enableLogging) {
    console.log('[LifafaApp]', ...args);
  }
};

export const logError = (...args: any[]) => {
  if (Config.enableLogging) {
    console.error('[LifafaApp Error]', ...args);
  }
};

export const logDetailed = (...args: any[]) => {
  if (Config.enableDetailedLogging) {
    console.log('[LifafaApp Detailed]', ...args);
  }
};

// Helper functions for common checks
export const isDevelopment = () => Config.env === 'development';
export const isProduction = () => Config.env === 'production';
export const isDebugMode = () => Config.env === 'development';

// API Configuration helpers
export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = Config.apiUrl.endsWith('/') 
    ? Config.apiUrl.slice(0, -1) 
    : Config.apiUrl;
  console.log('baseUrl', baseUrl);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Export types for use in other files
export type { ConfigType };
 
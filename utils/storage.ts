import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      // Use AsyncStorage on web (localStorage)
      await AsyncStorage.setItem(key, value);
    } else {
      // Use SecureStore on mobile with fallback
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', error);
        await AsyncStorage.setItem(key, value);
      }
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return await AsyncStorage.getItem(key);
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', error);
        return await AsyncStorage.getItem(key);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', error);
        await AsyncStorage.removeItem(key);
      }
    }
  },

  async clear(): Promise<void> {
    if (isWeb) {
      await AsyncStorage.clear();
    } else {
      // For SecureStore, we need to manually remove known keys
      // We'll handle this in the auth context
      try {
        await SecureStore.deleteItemAsync(AUTH_KEYS.TOKEN);
        await SecureStore.deleteItemAsync(AUTH_KEYS.USER_PROFILE);
      } catch (error) {
        console.warn('SecureStore clear failed, falling back to AsyncStorage:', error);
        await AsyncStorage.clear();
      }
    }
  }
};

export const AUTH_KEYS = {
  TOKEN: 'jwtToken',
  USER_PROFILE: 'currentUser'
} as const;

// Utility function to generate unique IDs for chats and other purposes
export const generateId = (prefix: string = 'id'): string => {
  const timestamp = Date.now().toString(36); // Convert timestamp to base36
  const randomPart = Math.random().toString(36).substring(2, 8); // Random 6-character string
  return `${prefix}-${timestamp}-${randomPart}`;
};

// Specific function for generating chat IDs
export const generateChatId = (): string => {
  return generateId('chat');
}; 
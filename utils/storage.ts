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
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_profile');
      } catch (error) {
        console.warn('SecureStore clear failed, falling back to AsyncStorage:', error);
        await AsyncStorage.clear();
      }
    }
  }
};

export const AUTH_KEYS = {
  TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile'
} as const; 
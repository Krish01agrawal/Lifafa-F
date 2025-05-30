import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/authApi';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Call the Google login API
      const response = await authApi.googleLogin();
      
      // Store auth data using the auth context
      await login(response.token, response.user);
      
      // Optionally fetch Gmail data in the background
      // This could be done after login or triggered separately
      
      // Navigate to chat interface
      router.replace('/');
      
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Failed', 
        'Unable to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-8">
          <TouchableOpacity
            onPress={handleBackPress}
            className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-medium">Sign In</Text>
          <View className="w-10" />
        </View>

        {/* Content */}
        <View className="flex-1 justify-center">
          {/* Hero Text */}
          <View className="items-center mb-12">
            <Ionicons name="chatbubbles" size={64} color="#3B82F6" className="mb-6" />
            <Text className="text-white text-2xl font-bold text-center mb-4">
              Welcome to Lifafa
            </Text>
            <Text className="text-gray-400 text-center text-base leading-relaxed max-w-sm">
              Sign in with your Google account to start managing your emails with AI assistance.
            </Text>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading}
            className={`w-full bg-white rounded-2xl mb-6 ${isLoading ? 'opacity-70' : ''}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-center py-4 px-6">
              {isLoading ? (
                <ActivityIndicator size="small" color="#1F2937" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={24} color="#EA4335" />
                  <Text className="text-gray-900 font-semibold text-lg ml-3">
                    Continue with Google
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Alternative Login Methods (Future) */}
          <View className="items-center mb-8">
            <Text className="text-gray-500 text-sm mb-4">More options coming soon</Text>
            
            <View className="flex-row space-x-4">
              <TouchableOpacity 
                className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center opacity-50"
                disabled
              >
                <Ionicons name="logo-apple" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center opacity-50"
                disabled
              >
                <Ionicons name="mail" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="items-center mb-8">
              <Text className="text-gray-400 text-sm">
                Setting up your account...
              </Text>
            </View>
          )}

          {/* Security Notice */}
          <View className="bg-gray-900 rounded-2xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="shield-checkmark" size={20} color="#10B981" className="mr-3 mt-1" />
              <View className="flex-1">
                <Text className="text-white font-medium text-sm mb-1">
                  Secure & Private
                </Text>
                <Text className="text-gray-400 text-xs leading-relaxed">
                  We use industry-standard encryption to protect your data. Your emails are processed securely and never shared with third parties.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="pb-8">
          <Text className="text-gray-500 text-xs text-center leading-relaxed">
            By signing in, you agree to our{' '}
            <Text className="text-blue-400">Terms of Service</Text>
            {' '}and{' '}
            <Text className="text-blue-400">Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
} 
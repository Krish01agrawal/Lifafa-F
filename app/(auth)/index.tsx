import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { log } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const { login, isLoading } = useAuth();

  const handleGoogleLogin = () => {
    try {
      log('User initiated Google login from landing page');
      login(); // This will redirect to Google OAuth
    } catch (error) {
      console.error('Login error:', error);
      // You could show an error toast here
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-8">
        {/* Hero Section */}
        <View className="items-center mb-12">
          {/* App Icon/Logo */}
          <View 
            className="w-24 h-24 rounded-3xl mb-8 justify-center items-center bg-blue-600"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 16,
            }}
          >
            <Ionicons name="chatbubbles" size={48} color="white" />
          </View>

          {/* App Title */}
          <Text className="text-4xl font-bold text-center mb-4 text-white">
            Lifafa
          </Text>

          {/* Subtitle */}
          <Text className="text-gray-400 text-lg text-center leading-relaxed max-w-sm">
            Your intelligent email assistant powered by AI. Organize, analyze, and chat with your inbox.
          </Text>
        </View>

        {/* Features */}
        <View className="w-full max-w-sm mb-12">
          <FeatureItem 
            icon="mail-outline" 
            title="Smart Email Management" 
            description="AI-powered inbox organization"
          />
          <FeatureItem 
            icon="chatbubble-ellipses-outline" 
            title="Intelligent Chat" 
            description="Ask questions about your emails"
          />
          <FeatureItem 
            icon="shield-checkmark-outline" 
            title="Secure & Private" 
            description="Your data stays protected"
          />
        </View>

        {/* Google Login Button */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={isLoading}
          className={`w-full max-w-sm bg-blue-600 rounded-2xl ${isLoading ? 'opacity-70' : ''}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-center py-4 px-6">
            <Ionicons name="logo-google" size={24} color="white" />
            <Text className="text-white font-semibold text-lg ml-3">
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <Text className="text-gray-500 text-sm text-center mt-8 max-w-xs leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <View className="flex-row items-center mb-6">
      <View className="w-12 h-12 rounded-xl bg-gray-800 items-center justify-center mr-4">
        <Ionicons name={icon as any} size={24} color="#9CA3AF" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium text-base mb-1">{title}</Text>
        <Text className="text-gray-400 text-sm">{description}</Text>
      </View>
    </View>
  );
}; 
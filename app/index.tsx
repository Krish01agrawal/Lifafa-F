import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { generateChatId } from '../utils/storage';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleStartChat = () => {
    const chatId = generateChatId();
    router.push(`/chat/${chatId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-white text-3xl font-bold text-center mb-4">
          Welcome to Lifafa!
        </Text>
        
        {user && (
          <Text className="text-gray-300 text-lg text-center mb-8">
            Hello, {user.email}
          </Text>
        )}
        
        <Text className="text-gray-400 text-center mb-8 leading-relaxed">
          You have successfully logged in. This is your main app screen.
        </Text>
        
        {/* Chat Button */}
        <TouchableOpacity
          onPress={handleStartChat}
          className="w-full max-w-sm bg-blue-600 rounded-lg mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-center py-4 px-6">
            <Ionicons name="chatbubbles" size={24} color="white" />
            <Text className="text-white text-lg font-semibold ml-3">
              Start New Chat
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-600 px-8 py-3 rounded-lg"
        >
          <Text className="text-white text-lg font-semibold">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 
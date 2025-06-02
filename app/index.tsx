import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateChatId } from '../utils/storage';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { data: userProfile, isLoading: profileLoading, error: profileError } = useUserProfile();

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
        
        {/* User Profile Section */}
        {user && (
          <View className="items-center mb-8">
            {/* Profile Picture */}
            {userProfile?.picture && (
              <Image 
                source={{ uri: userProfile.picture }}
                className="w-20 h-20 rounded-full mb-4 border-2 border-blue-600"
              />
            )}
            
            {/* Name and Email */}
            <Text className="text-white text-xl font-semibold text-center mb-1">
              {userProfile?.name || user.name || 'User'}
            </Text>
            <Text className="text-gray-300 text-lg text-center mb-2">
              {userProfile?.email || user.email}
            </Text>
            
            {/* Gmail Sync Status */}
            {userProfile && (
              <View className="flex-row items-center bg-gray-800 rounded-lg px-3 py-2">
                <Ionicons 
                  name={userProfile.initial_gmailData_sync ? "checkmark-circle" : "time"} 
                  size={16} 
                  color={userProfile.initial_gmailData_sync ? "#10B981" : "#F59E0B"} 
                />
                <Text className="text-gray-300 text-sm ml-2">
                  Gmail: {userProfile.initial_gmailData_sync ? 'Synced' : 'Pending'}
                </Text>
              </View>
            )}
            
            {/* Loading/Error States */}
            {profileLoading && (
              <Text className="text-gray-400 text-sm mt-2">Loading profile...</Text>
            )}
            {profileError && (
              <Text className="text-red-400 text-sm mt-2">Profile loading failed</Text>
            )}
          </View>
        )}
        
        <Text className="text-gray-400 text-center mb-8 leading-relaxed">
          Your intelligent email assistant powered by AI. Start chatting to organize and analyze your inbox.
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
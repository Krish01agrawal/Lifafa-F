import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateChatId } from '../utils/storage';

const { width } = Dimensions.get('window');

// Apple-style Circular Progress Component
const AppleProgressRing: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Apple-style breathing animation with progress
    progress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.bezier(0.4, 0.0, 0.6, 1) }),
      -1,
      false
    );
    
    // Subtle breathing scale effect
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.bezier(0.4, 0.0, 0.6, 1) }),
        withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0.0, 0.6, 1) })
      ),
      -1,
      false
    );
  }, []);

  const progressStyle = useAnimatedStyle(() => {
    const rotation = interpolate(progress.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={containerStyle} className="relative">
      {/* Background Ring */}
      <View className="w-[116px] h-[116px] rounded-full border-4 border-gray-800 items-center justify-center">
        {/* Progress Ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 108,
              height: 108,
              borderRadius: 54,
              borderWidth: 4,
              borderTopColor: '#007AFF',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            },
            progressStyle
          ]}
        />
        {children}
      </View>
    </Animated.View>
  );
};

// Glass morphism status pill
const StatusPill: React.FC<{ synced: boolean }> = ({ synced }) => (
  <View 
    className={`flex-row items-center px-3 py-1.5 rounded-full mb-6 ${
      synced ? 'bg-green-500/20' : 'bg-amber-500/20'
    }`}
    style={{
      backgroundColor: synced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: synced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
      shadowColor: synced ? '#10B981' : '#F59E0B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    }}
  >
    <View 
      className={`w-2 h-2 rounded-full mr-2 ${
        synced ? 'bg-green-400' : 'bg-amber-400'
      }`}
    />
    <Text 
      className={`text-xs font-medium ${
        synced ? 'text-green-400' : 'text-amber-400'
      }`}
      style={{ letterSpacing: -0.2 }}
    >
      {synced ? 'Gmail Synced' : 'Gmail Pending'}
    </Text>
  </View>
);

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

  const isGmailSynced = userProfile?.initial_gmailData_sync ?? false;
  const canStartChat = isGmailSynced && !profileLoading;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-8">
        {/* Main Content - Centered like Revolut */}
        <View className="items-center mb-16">
          {/* App Title */}
          <Text 
            className="text-white font-bold text-center mb-16"
            style={{ 
              fontSize: 34,
              letterSpacing: -1,
              lineHeight: 40
            }}
          >
            Welcome to Lifafa!
          </Text>
          
          {/* Profile Section - Centered */}
          {profileLoading ? (
            <View className="items-center mb-8">
              <View className="w-24 h-24 rounded-full bg-gray-800 items-center justify-center mb-6">
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
              <Text className="text-gray-400 text-center">Loading your profile...</Text>
            </View>
          ) : userProfile ? (
            <View className="items-center mb-8">
              {!isGmailSynced ? (
                <AppleProgressRing>
                  {userProfile.picture ? (
                    <View className="relative items-center justify-center">
                      {/* Glow Layers */}
                      <View 
                        className="absolute w-28 h-28 rounded-full bg-blue-500"
                        style={{
                          opacity: 0.1,
                          top: -16,
                          left: -16,
                        }}
                      />
                      <View 
                        className="absolute w-24 h-24 rounded-full bg-blue-500"
                        style={{
                          opacity: 0.2,
                          top: -8,
                          left: -8,
                        }}
                      />
                      <View 
                        className="absolute rounded-full bg-blue-500"
                        style={{
                          opacity: 0.3,
                          top: -4,
                          left: -4,
                          width: 88,
                          height: 88,
                        }}
                      />
                      {/* Profile Image */}
                      <Image 
                        source={{ uri: userProfile.picture }}
                        className="w-20 h-20 rounded-full"
                        style={{
                          borderWidth: 3,
                          borderColor: '#007AFF',
                        }}
                      />
                    </View>
                  ) : (
                    <View className="relative items-center justify-center">
                      {/* Glow Layers */}
                      <View 
                        className="absolute w-28 h-28 rounded-full bg-blue-500"
                        style={{
                          opacity: 0.1,
                          top: -16,
                          left: -16,
                        }}
                      />
                      <View 
                        className="absolute w-24 h-24 rounded-full bg-blue-500"
                        style={{
                          opacity: 0.2,
                          top: -8,
                          left: -8,
                        }}
                      />
                      <View 
                        className="absolute rounded-full bg-blue-500"
                        style={{
                          opacity: 0.3,
                          top: -4,
                          left: -4,
                          width: 88,
                          height: 88,
                        }}
                      />
                      {/* Avatar */}
                      <View 
                        className="w-20 h-20 rounded-full bg-gray-800 items-center justify-center"
                        style={{
                          borderWidth: 3,
                          borderColor: '#007AFF',
                        }}
                      >
                        <Text className="text-white font-semibold text-2xl">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                </AppleProgressRing>
              ) : (
                // Static profile picture when synced
                userProfile.picture ? (
                  <View className="relative mb-6 items-center justify-center">
                    {/* Glow Layers */}
                    <View 
                      className="absolute w-32 h-32 rounded-full bg-green-500"
                      style={{
                        opacity: 0.15,
                        top: -16,
                        left: -16,
                      }}
                    />
                    <View 
                      className="absolute w-28 h-28 rounded-full bg-green-500"
                      style={{
                        opacity: 0.25,
                        top: -8,
                        left: -8,
                      }}
                    />
                    <View 
                      className="absolute rounded-full bg-green-500"
                      style={{
                        opacity: 0.35,
                        top: -4,
                        left: -4,
                        width: 104,
                        height: 104,
                      }}
                    />
                    {/* Profile Image */}
                    <Image 
                      source={{ uri: userProfile.picture }}
                      className="w-24 h-24 rounded-full"
                      style={{
                        borderWidth: 3,
                        borderColor: '#10B981',
                      }}
                    />
                  </View>
                ) : (
                  <View className="relative mb-6 items-center justify-center">
                    {/* Glow Layers */}
                    <View 
                      className="absolute w-32 h-32 rounded-full bg-green-500"
                      style={{
                        opacity: 0.15,
                        top: -16,
                        left: -16,
                      }}
                    />
                    <View 
                      className="absolute w-28 h-28 rounded-full bg-green-500"
                      style={{
                        opacity: 0.25,
                        top: -8,
                        left: -8,
                      }}
                    />
                    <View 
                      className="absolute rounded-full bg-green-500"
                      style={{
                        opacity: 0.35,
                        top: -4,
                        left: -4,
                        width: 104,
                        height: 104,
                      }}
                    />
                    {/* Avatar */}
                    <View 
                      className="w-24 h-24 rounded-full bg-gray-800 items-center justify-center"
                      style={{
                        borderWidth: 3,
                        borderColor: '#10B981',
                      }}
                    >
                      <Text className="text-white font-semibold text-2xl">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )
              )}
              
              {/* User Info */}
              <Text 
                className="text-white font-semibold text-center mb-2"
                style={{ fontSize: 24, letterSpacing: -0.5 }}
              >
                {userProfile.name}
              </Text>
              <Text 
                className="text-gray-400 text-center mb-6"
                style={{ fontSize: 16, letterSpacing: -0.2 }}
              >
                {userProfile.email}
              </Text>
              
              {/* Status Pill */}
              <StatusPill synced={isGmailSynced} />
            </View>
          ) : (
            <View className="items-center mb-8">
              <View className="w-24 h-24 rounded-full bg-gray-800 items-center justify-center mb-6">
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-gray-400 text-center">Failed to load profile</Text>
            </View>
          )}
        </View>
        
        {/* Description - Clean and centered */}
        <Text 
          className="text-gray-400 text-center mb-16 leading-relaxed px-4"
          style={{ 
            fontSize: 16, 
            lineHeight: 24,
            letterSpacing: -0.2,
            maxWidth: width * 0.85
          }}
        >
          Your intelligent email assistant powered by AI. Start chatting to organize and analyze your inbox.
        </Text>
        
        {/* Action Buttons - Positioned like Revolut */}
        <View className="w-full max-w-sm space-y-4">
          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={handleStartChat}
            disabled={!canStartChat}
            className={`w-full rounded-2xl ${
              canStartChat ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            style={{
              shadowColor: canStartChat ? '#3B82F6' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: canStartChat ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-center py-4 px-6">
              <Ionicons 
                name="chatbubbles" 
                size={20} 
                color={canStartChat ? "white" : "#6B7280"} 
              />
              <Text 
                className={`font-semibold text-lg ml-3 ${
                  canStartChat ? 'text-white' : 'text-gray-400'
                }`}
                style={{ letterSpacing: -0.3 }}
              >
                {!isGmailSynced && userProfile ? 'Gmail Syncing...' : 'Start New Chat'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Secondary Action - Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="w-full bg-red-600/10 border border-red-600/20 rounded-2xl"
            style={{
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            <View className="flex-row items-center justify-center py-4 px-6">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text 
                className="text-red-400 font-semibold text-lg ml-3"
                style={{ letterSpacing: -0.3 }}
              >
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 
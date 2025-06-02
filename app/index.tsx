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
    const strokeDashoffset = interpolate(progress.value, [0, 1], [314, 0]); // 2 * π * 50
    return {
      transform: [{ rotate: '-90deg' }],
      strokeDashoffset,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[containerStyle, { position: 'relative' }]}>
      {/* Background Ring */}
      <View className="w-32 h-32 rounded-full justify-center items-center">
        <View className="absolute w-full h-full rounded-full border-4 border-gray-800/30" />
        
        {/* Progress Ring using SVG-like effect */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 128,
              height: 128,
              borderRadius: 64,
              borderWidth: 4,
              borderColor: 'transparent',
              borderTopColor: '#007AFF',
              borderRightColor: '#007AFF',
              borderBottomColor: '#007AFF',
              borderLeftColor: '#007AFF',
            },
            progressStyle
          ]}
        />
        
        {/* Profile Image Container with Glass Effect */}
        <View 
          className="w-24 h-24 rounded-full overflow-hidden"
          style={{
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 16,
          }}
        >
          {children}
        </View>
      </View>
    </Animated.View>
  );
};

// Apple-style Button Component
const AppleButton: React.FC<{
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  icon?: string;
}> = ({ onPress, disabled = false, variant = 'primary', children, icon }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const buttonStyle = variant === 'primary' 
    ? 'bg-blue-600' 
    : 'bg-red-600';
    
  const disabledStyle = disabled 
    ? 'bg-gray-700/60' 
    : buttonStyle;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={`${disabledStyle} rounded-2xl`}
        style={{
          shadowColor: variant === 'primary' ? '#007AFF' : '#FF453A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0.1 : 0.3,
          shadowRadius: 16,
          elevation: 16,
        }}
      >
        <View className="flex-row items-center justify-center py-4 px-8">
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={22} 
              color={disabled ? "#9CA3AF" : "white"} 
            />
          )}
          <Text className={`font-semibold text-lg ${icon ? 'ml-3' : ''} ${
            disabled ? 'text-gray-400' : 'text-white'
          }`}>
            {children}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Apple-style Status Pill
const StatusPill: React.FC<{ synced: boolean }> = ({ synced }) => {
  return (
    <View 
      className={`flex-row items-center px-4 py-2 rounded-full ${
        synced ? 'bg-green-600/20' : 'bg-orange-600/20'
      }`}
      style={{
        backgroundColor: synced ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 146, 60, 0.15)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <View 
        className={`w-2 h-2 rounded-full mr-2 ${
          synced ? 'bg-green-400' : 'bg-orange-400'
        }`}
      />
      <Text className={`text-sm font-medium ${
        synced ? 'text-green-300' : 'text-orange-300'
      }`}>
        {synced ? 'Gmail Synced' : 'Syncing Gmail'}
      </Text>
      {!synced && (
        <ActivityIndicator 
          size="small" 
          color="#FB923C" 
          style={{ marginLeft: 8 }} 
        />
      )}
    </View>
  );
};

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
        {/* Hero Section */}
        <View className="items-center mb-12">
          <Text 
            className="text-white font-bold text-center mb-12"
            style={{ 
              fontSize: Math.min(width * 0.08, 36),
              letterSpacing: -0.5,
              lineHeight: Math.min(width * 0.09, 40)
            }}
          >
            Welcome to Lifafa!
          </Text>
          
          {/* Profile Section */}
          {user && (
            <View className="items-center">
              {/* Profile Picture with Apple-style Progress */}
              {userProfile?.picture ? (
                <View className="mb-6">
                  {isGmailSynced ? (
                    // Synced state with subtle glow
                    <View 
                      className="w-32 h-32 rounded-full justify-center items-center"
                      style={{
                        shadowColor: '#34D399',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 16,
                      }}
                    >
                      <View className="w-24 h-24 rounded-full border-4 border-green-400/50 overflow-hidden">
                        <Image 
                          source={{ uri: userProfile.picture }}
                          className="w-full h-full"
                          style={{ resizeMode: 'cover' }}
                        />
                      </View>
                    </View>
                  ) : (
                    // Syncing state with Apple-style progress ring
                    <AppleProgressRing>
                      <Image 
                        source={{ uri: userProfile.picture }}
                        className="w-full h-full"
                        style={{ resizeMode: 'cover' }}
                      />
                    </AppleProgressRing>
                  )}
                </View>
              ) : (
                // Fallback avatar
                <View 
                  className="w-24 h-24 rounded-full bg-gray-800 items-center justify-center mb-6"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
              
              {/* User Info */}
              <Text 
                className="text-white font-semibold text-center mb-2"
                style={{ fontSize: 24, letterSpacing: -0.3 }}
              >
                {userProfile?.name || user.name || 'User'}
              </Text>
              <Text 
                className="text-gray-400 text-center mb-4"
                style={{ fontSize: 16, letterSpacing: -0.2 }}
              >
                {userProfile?.email || user.email}
              </Text>
              
              {/* Status Pill */}
              {userProfile && <StatusPill synced={isGmailSynced} />}
            </View>
          )}
        </View>
        
        {/* Description */}
        <Text 
          className="text-gray-400 text-center mb-12 leading-relaxed"
          style={{ 
            fontSize: 16, 
            lineHeight: 24,
            letterSpacing: -0.2,
            maxWidth: width * 0.8
          }}
        >
          Your intelligent email assistant powered by AI.{' '}
          {!isGmailSynced && userProfile 
            ? 'Please wait while we sync your Gmail data.' 
            : 'Start chatting to organize and analyze your inbox.'
          }
        </Text>
        
        {/* Action Buttons */}
        <View className="w-full max-w-sm space-y-4">
          <AppleButton
            onPress={canStartChat ? handleStartChat : undefined}
            disabled={!canStartChat}
            variant="primary"
            icon={canStartChat ? "chatbubbles" : "time"}
          >
            {canStartChat ? 'Start New Chat' : 'Syncing Gmail...'}
          </AppleButton>
          
          <AppleButton
            onPress={handleLogout}
            variant="secondary"
            icon="log-out"
          >
            Logout
          </AppleButton>
        </View>
      </View>
    </SafeAreaView>
  );
} 
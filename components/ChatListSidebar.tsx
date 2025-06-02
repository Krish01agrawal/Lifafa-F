import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useChatList } from '../hooks/useChatCache';
import { useUserProfile } from '../hooks/useUserProfile';
import { generateChatId } from '../utils/storage';

interface ChatListSidebarProps {
  animatedSidebarStyle: any;
  currentChatId?: string;
}

export const ChatListSidebar: React.FC<ChatListSidebarProps> = ({
  animatedSidebarStyle,
  currentChatId
}) => {
  const { data: userProfile } = useUserProfile();
  const { chats, deleteChat, isLoading } = useChatList();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewChat = () => {
    const newChatId = generateChatId();
    router.push(`/chat/${newChatId}`);
  };

  const handleChatPress = (chatId: string) => {
    if (chatId !== currentChatId) {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleDeleteChat = (chatId: string, chatTitle: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${chatTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteChat(chatId)
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'now' : `${minutes}m`;
    } else if (hours < 24) {
      return `${Math.floor(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      return days === 1 ? '1d' : `${days}d`;
    }
  };

  return (
    <Animated.View 
      style={animatedSidebarStyle}
      className="bg-gray-900 border-r border-gray-800 overflow-hidden"
    >
      {/* Sidebar Header */}
      <View className="px-4 py-4 border-b border-gray-800">
        {/* User Profile Section */}
        {userProfile && (
          <View className="mb-4 pb-4 border-b border-gray-700">
            <View className="flex-row items-center mb-3">
              {/* Profile Picture */}
              {userProfile.picture ? (
                <Image 
                  source={{ uri: userProfile.picture }}
                  className="w-12 h-12 rounded-full mr-3"
                  style={{
                    borderWidth: 2,
                    borderColor: '#3B82F6',
                  }}
                />
              ) : (
                <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-semibold text-lg">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                  {userProfile.name}
                </Text>
                <Text className="text-gray-400 text-xs" numberOfLines={1}>
                  {userProfile.email}
                </Text>
              </View>
            </View>
            
            {/* Gmail Sync Status */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons 
                  name={userProfile.initial_gmailData_sync ? "checkmark-circle" : "time-outline"} 
                  size={14} 
                  color={userProfile.initial_gmailData_sync ? "#10B981" : "#F59E0B"} 
                />
                <Text className="text-gray-400 text-xs ml-2">
                  Gmail {userProfile.initial_gmailData_sync ? 'Synced' : 'Pending'}
                </Text>
              </View>
              
              {/* Access Token Status */}
              <View className="flex-row items-center">
                <Ionicons 
                  name="key-outline" 
                  size={12} 
                  color="#3B82F6" 
                />
                <Text className="text-blue-400 text-xs ml-1">
                  Connected
                </Text>
              </View>
            </View>
            
            {/* Token Expiry */}
            <Text className="text-gray-500 text-xs">
              Token expires: {new Date(userProfile.token_expiry).toLocaleDateString()}
            </Text>
          </View>
        )}
        
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-xl font-bold">
            Chats
          </Text>
          <TouchableOpacity 
            onPress={handleNewChat}
            className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center"
            style={{
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View className="bg-gray-800 rounded-xl px-3 py-2 flex-row items-center">
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            className="text-gray-300 text-sm ml-2 flex-1"
            placeholder="Search chats..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ outline: 'none' }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Chat History */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          // Loading skeleton
          <View className="px-3 py-2">
            {[1, 2, 3].map((_, index) => (
              <View key={index} className="bg-gray-800/50 rounded-xl p-3 mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="bg-gray-600 rounded h-3 mb-2 w-3/4" />
                    <View className="bg-gray-700 rounded h-2.5 mb-1 w-full" />
                    <View className="bg-gray-700 rounded h-2.5 mb-2 w-2/3" />
                    <View className="bg-gray-700 rounded h-2 w-1/3" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : filteredChats.length > 0 ? (
          <View className="px-3 py-2">
            {filteredChats.map((chat) => (
              <TouchableOpacity 
                key={chat.id}
                onPress={() => handleChatPress(chat.id)}
                className={`rounded-xl p-3 mb-2 border ${
                  chat.id === currentChatId
                    ? 'bg-blue-600/20 border-blue-600/30'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
                style={{
                  shadowColor: chat.id === currentChatId ? '#3B82F6' : '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: chat.id === currentChatId ? 0.3 : 0.1,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center mb-1">
                      <Text 
                        className={`font-semibold text-sm flex-1 ${
                          chat.id === currentChatId ? 'text-white' : 'text-gray-200'
                        }`} 
                        numberOfLines={1}
                      >
                        {chat.title}
                      </Text>
                      {chat.unreadCount > 0 && (
                        <View className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                      )}
                    </View>
                    
                    {chat.lastMessage && (
                      <Text 
                        className={`text-xs mb-2 ${
                          chat.id === currentChatId ? 'text-blue-300' : 'text-gray-400'
                        }`}
                        numberOfLines={2}
                      >
                        {chat.lastMessage}
                      </Text>
                    )}
                    
                    {chat.lastMessageTime && (
                      <Text 
                        className={`text-xs ${
                          chat.id === currentChatId ? 'text-blue-400' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(chat.lastMessageTime)}
                      </Text>
                    )}
                  </View>
                  
                  {/* Delete Button */}
                  <TouchableOpacity 
                    onPress={() => handleDeleteChat(chat.id, chat.title)}
                    className="w-8 h-8 bg-red-600/20 rounded-full items-center justify-center ml-2"
                    style={{
                      shadowColor: '#EF4444',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          // Empty state
          <View className="flex-1 justify-center items-center px-6 py-12">
            <Ionicons name="chatbubbles-outline" size={48} color="#6B7280" />
            <Text className="text-gray-400 text-center mt-4 mb-2">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </Text>
            <Text className="text-gray-500 text-xs text-center leading-4">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Start a new conversation to see your chats here'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                onPress={handleNewChat}
                className="bg-blue-600 rounded-lg px-4 py-2 mt-4"
              >
                <Text className="text-white font-medium">Start First Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}; 
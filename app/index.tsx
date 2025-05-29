import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    useChats,
    useDeleteChat,
} from '../hooks/useChatQueries';
import { Chat } from '../services/chatApi';

const { width } = Dimensions.get('window');

interface ChatItemProps {
  chat: Chat;
  onDelete: (chatId: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, onDelete }) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(chat.id) },
      ]
    );
  };

  const handlePress = () => {
    router.push(`/chat/${chat.id}`);
  };

  return (
    <TouchableOpacity
      className="p-4 border-b border-gray-800 bg-black"
      onPress={handlePress}
      onLongPress={handleDelete}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2">
          <Text className="text-white font-medium text-base mb-1" numberOfLines={1}>
            {chat.title}
          </Text>
          <Text className="text-gray-400 text-sm" numberOfLines={2}>
            {chat.lastMessage}
          </Text>
        </View>
        <Text className="text-gray-500 text-xs">
          {formatTime(chat.lastMessageTime)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatListScreen() {
  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const deleteChatMutation = useDeleteChat();

  const handleNewChat = () => {
    router.push('/new-chat');
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChatMutation.mutateAsync(chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="p-4 border-b border-gray-800">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-2xl font-bold">Chats</Text>
          <TouchableOpacity
            onPress={handleNewChat}
            className="bg-blue-600 p-2 rounded-full"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* New Chat Button */}
        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-lg flex-row items-center justify-center"
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-medium ml-2">Start New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {chatsLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-400 mt-4">Loading chats...</Text>
        </View>
      ) : chats.length > 0 ? (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatItem
              chat={item}
              onDelete={handleDeleteChat}
            />
          )}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-8">
          <Ionicons name="chatbubbles-outline" size={80} color="#6B7280" />
          <Text className="text-gray-400 text-xl text-center mt-6">
            No chats yet
          </Text>
          <Text className="text-gray-500 text-center mt-2 mb-8">
            Start a conversation by creating a new chat
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleNewChat}
          >
            <Text className="text-white font-medium">Create Your First Chat</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
} 
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeBlock } from '../../components/chat/CodeBlock';
import {
  useChats,
  useDeleteChat
} from '../../hooks/useChatQueries';
import { Chat, Message } from '../../services/chatApi';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

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

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Parse message content for code blocks
  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <Text key={`text-${lastIndex}`} className={`text-base ${isUser ? 'text-white' : 'text-gray-100'}`}>
              {textBefore}
            </Text>
          );
        }
      }

      // Add code block
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      parts.push(
        <CodeBlock key={`code-${match.index}`} language={language} code={code} />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push(
          <Text key={`text-${lastIndex}`} className={`text-base ${isUser ? 'text-white' : 'text-gray-100'}`}>
            {remainingText}
          </Text>
        );
      }
    }

    // If no code blocks found, return simple text
    if (parts.length === 0) {
      return (
        <Text className={`text-base ${isUser ? 'text-white' : 'text-gray-100'}`}>
          {content}
        </Text>
      );
    }

    return <View>{parts}</View>;
  };

  return (
    <View className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] p-3 rounded-2xl ${
          isUser
            ? 'bg-blue-600 rounded-br-md'
            : 'bg-gray-800 rounded-bl-md'
        }`}
      >
        {renderMessageContent(message.content)}
      </View>
      <Text className="text-gray-500 text-xs mt-1">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
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

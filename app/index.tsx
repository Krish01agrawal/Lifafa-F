import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeBlock } from '../components/chat/CodeBlock';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import {
    useChat,
    useChats,
    useCreateChat,
    useDeleteChat,
    useGetAIResponse,
    useSendMessage,
} from '../hooks/useChatQueries';
import { Chat, Message } from '../services/chatApi';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, isSelected, onSelect, onDelete }) => {
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

  return (
    <TouchableOpacity
      className={`p-4 mx-2 my-1 rounded-lg ${isSelected ? 'bg-gray-800' : 'bg-black'} ${isSelected ? 'border-l-4 border-l-blue-500' : ''}`}
      onPress={() => onSelect(chat.id)}
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

    const gradientStyle = isUser ? {
      background: 'linear-gradient(90deg, rgb(179, 174, 245) 0.41%, rgb(215, 203, 231) 40.68%, rgb(229, 200, 200) 64.12%, rgb(234, 168, 121) 97.82%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    } : {};

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <Text 
              key={`text-${lastIndex}`} 
              className={`${isUser ? 'text-base font-medium' : 'text-lg font-normal leading-relaxed text-gray-100'}`}
              style={isUser ? gradientStyle : {}}
            >
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
          <Text 
            key={`text-${lastIndex}`} 
            className={`${isUser ? 'text-base font-medium' : 'text-lg font-normal leading-relaxed text-gray-100'}`}
            style={isUser ? gradientStyle : {}}
          >
            {remainingText}
          </Text>
        );
      }
    }

    // If no code blocks found, return simple text
    if (parts.length === 0) {
      return (
        <Text 
          className={`${isUser ? 'text-base font-medium' : 'text-lg font-normal leading-relaxed text-gray-100'}`}
          style={isUser ? gradientStyle : {}}
        >
          {content}
        </Text>
      );
    }

    return <View>{parts}</View>;
  };

  return (
    <View className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser ? (
        // AI Message with gradient border matching user text gradient
        <View className="max-w-[85%] relative" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Gradient border effect using horizontal segments */}
          <View className="absolute inset-0 rounded-2xl overflow-hidden flex-row">
            <View className="flex-1 rounded-l-2xl" style={{ backgroundColor: 'rgba(179, 174, 245, 0.6)' }} />
            <View className="flex-1" style={{ backgroundColor: 'rgba(215, 203, 231, 0.6)' }} />
            <View className="flex-1" style={{ backgroundColor: 'rgba(229, 200, 200, 0.6)' }} />
            <View className="flex-1 rounded-r-2xl" style={{ backgroundColor: 'rgba(234, 168, 121, 0.6)' }} />
          </View>
          
          {/* Inner content with black background */}
          <View className="m-px p-6 rounded-2xl bg-black">
            {renderMessageContent(message.content)}
          </View>
        </View>
      ) : (
        // User Message
        <View
          className="max-w-[80%] px-4 py-2 rounded-2xl bg-black border border-gray-400"
          style={{
            shadowColor: '#D1D5DB',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          {renderMessageContent(message.content)}
        </View>
      )}
      <Text className="text-gray-500 text-xs mt-1">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};

export default function ChatScreen() {
  const { chatId, newChat } = useLocalSearchParams<{ chatId?: string; newChat?: string }>();
  const [inputText, setInputText] = useState('');
  const [showSidebar, setShowSidebar] = useState(isTablet);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const { data: currentChat, isLoading: chatLoading } = useChat(chatId || '');
  const createChatMutation = useCreateChat();
  const sendMessageMutation = useSendMessage();
  const getAIResponseMutation = useGetAIResponse();
  const deleteChatMutation = useDeleteChat();

  // Auto-select first chat on load for larger screens if no chat is selected and not in new chat mode
  useEffect(() => {
    if (chats.length > 0 && !chatId && !newChat && isTablet) {
      router.replace(`/?chatId=${chats[0].id}`);
    }
  }, [chats, chatId, newChat, isTablet]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentChat?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentChat?.messages.length, getAIResponseMutation.isPending]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      let activeChatId = chatId;

      // Create new chat if none selected or in new chat mode
      if (!activeChatId || newChat) {
        const newChatResult = await createChatMutation.mutateAsync(messageContent);
        activeChatId = newChatResult.id;
        router.replace(`/?chatId=${activeChatId}`);
        
        // Get AI response for new chat
        await getAIResponseMutation.mutateAsync({
          chatId: activeChatId,
          userMessage: messageContent,
        });
      } else {
        // Send message to existing chat
        await sendMessageMutation.mutateAsync({
          chatId: activeChatId,
          content: messageContent,
        });

        // Get AI response
        await getAIResponseMutation.mutateAsync({
          chatId: activeChatId,
          userMessage: messageContent,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleDeleteChat = async (chatIdToDelete: string) => {
    try {
      await deleteChatMutation.mutateAsync(chatIdToDelete);
      if (chatId === chatIdToDelete) {
        const remainingChats = chats.filter(c => c.id !== chatIdToDelete);
        if (remainingChats.length > 0) {
          router.replace(`/?chatId=${remainingChats[0].id}`);
        } else {
          router.replace('/');
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  const handleNewChat = async () => {
    router.push('/?newChat=true');
    setShowSidebar(false);
  };

  const handleSelectChat = (selectedChatId: string) => {
    router.push(`/?chatId=${selectedChatId}`);
    if (!isTablet) {
      setShowSidebar(false);
    }
  };

  const toggleSidebar = () => {
    if (isTablet) {
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setShowSidebar(!showSidebar);
    }
  };

  const renderSidebar = () => (
    <View className="bg-black" style={{ width: isTablet ? 320 : width * 0.85 }}>
      {/* Sidebar Header */}
      <View className="p-4 mx-2 mt-2 mb-4 bg-black rounded-lg">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-xl font-bold">Chats</Text>
          <View className="flex-row items-center">
            {isTablet && (
              <TouchableOpacity
                onPress={() => setSidebarCollapsed(true)}
                className="p-1 mr-2"
              >
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
            )}
            {!isTablet && (
              <TouchableOpacity
                onPress={() => setShowSidebar(false)}
                className="p-1"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          className="bg-blue-600 p-3 rounded-lg flex-row items-center justify-center"
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-medium ml-2">New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <View className="flex-1 px-2">
        {chatsLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatItem
                chat={item}
                isSelected={item.id === chatId}
                onSelect={handleSelectChat}
                onDelete={handleDeleteChat}
              />
            )}
            className="flex-1"
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );

  const renderChatArea = () => (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="mx-2 mt-2 mb-4 p-4 bg-black rounded-lg flex-row items-center">
        {(isTablet && sidebarCollapsed) && (
          <TouchableOpacity
            onPress={() => setSidebarCollapsed(false)}
            className="mr-3 p-1"
          >
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        )}
        {!isTablet && !showSidebar && (
          <TouchableOpacity
            onPress={() => setShowSidebar(true)}
            className="mr-3 p-1"
          >
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text className="text-white text-lg font-medium flex-1">
          {currentChat?.title || (!chatId ? 'New Chat' : 'Select a chat or start a new conversation')}
        </Text>
      </View>

      {/* Messages */}
      <View className="flex-1 mx-2 mb-4 bg-black rounded-lg">
        {chatLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : currentChat?.messages.length || getAIResponseMutation.isPending ? (
          <FlatList
            ref={flatListRef}
            data={currentChat?.messages || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageItem message={item} />}
            ListFooterComponent={getAIResponseMutation.isPending ? <TypingIndicator /> : null}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <Ionicons name="chatbubbles-outline" size={64} color="#6B7280" />
            <Text className="text-gray-400 text-lg text-center mt-4">
              {!chatId ? 'Ready to start chatting!' : (chats.length > 0 ? 'Select a chat to start messaging' : 'Start a conversation')}
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              {!chatId ? 'Type your first message below to begin' : (chats.length > 0 ? 'Choose a chat from the sidebar' : 'Type a message below to begin chatting')}
            </Text>
          </View>
        )}
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="mx-2 mb-2 p-4 bg-black rounded-lg flex-row items-end">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
            className="flex-1 bg-gray-800 text-white p-3 rounded-2xl mr-3 max-h-32"
            style={{ textAlignVertical: 'top' }}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isPending || getAIResponseMutation.isPending}
            className={`p-3 rounded-full ${
              inputText.trim() && !sendMessageMutation.isPending && !getAIResponseMutation.isPending
                ? 'bg-blue-600'
                : 'bg-gray-600'
            }`}
          >
            {sendMessageMutation.isPending || getAIResponseMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  const shouldShowSidebar = isTablet ? !sidebarCollapsed : showSidebar;

  return (
    <SafeAreaView className="flex-1 bg-black">
      {isTablet ? (
        <View className="flex-1 flex-row">
          {shouldShowSidebar && renderSidebar()}
          {renderChatArea()}
        </View>
      ) : showSidebar ? (
        <View className="flex-1">
          {renderSidebar()}
        </View>
      ) : (
        renderChatArea()
      )}
    </SafeAreaView>
  );
} 
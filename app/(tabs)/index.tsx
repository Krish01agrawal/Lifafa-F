import { Ionicons } from '@expo/vector-icons';
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
import { CodeBlock } from '../../components/chat/CodeBlock';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import {
  useChat,
  useChats,
  useCreateChat,
  useDeleteChat,
  useGetAIResponse,
  useSendMessage,
} from '../../hooks/useChatQueries';
import { Chat, Message } from '../../services/chatApi';

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
      className={`p-4 border-b border-gray-800 ${isSelected ? 'bg-gray-800' : 'bg-black'}`}
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

export default function ChatScreen() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showSidebar, setShowSidebar] = useState(isTablet);
  const flatListRef = useRef<FlatList>(null);

  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const { data: currentChat, isLoading: chatLoading } = useChat(selectedChatId || '');
  const createChatMutation = useCreateChat();
  const sendMessageMutation = useSendMessage();
  const getAIResponseMutation = useGetAIResponse();
  const deleteChatMutation = useDeleteChat();

  // Auto-select first chat on load
  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

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
      let chatId = selectedChatId;

      // Create new chat if none selected
      if (!chatId) {
        const newChat = await createChatMutation.mutateAsync(messageContent);
        chatId = newChat.id;
        setSelectedChatId(chatId);
        
        // Get AI response for new chat
        await getAIResponseMutation.mutateAsync({
          chatId,
          userMessage: messageContent,
        });
      } else {
        // Send message to existing chat
        await sendMessageMutation.mutateAsync({
          chatId,
          content: messageContent,
        });

        // Get AI response
        await getAIResponseMutation.mutateAsync({
          chatId,
          userMessage: messageContent,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChatMutation.mutateAsync(chatId);
      if (selectedChatId === chatId) {
        setSelectedChatId(chats.length > 1 ? chats.find(c => c.id !== chatId)?.id || null : null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  const handleNewChat = () => {
    setSelectedChatId(null);
    setShowSidebar(false);
  };

  const renderSidebar = () => (
    <View className="bg-black border-r border-gray-800" style={{ width: isTablet ? 320 : width * 0.8 }}>
      <View className="p-4 border-b border-gray-800">
        <TouchableOpacity
          className="bg-blue-600 p-3 rounded-lg flex-row items-center justify-center"
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-medium ml-2">New Chat</Text>
        </TouchableOpacity>
      </View>

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
              isSelected={item.id === selectedChatId}
              onSelect={(chatId) => {
                setSelectedChatId(chatId);
                if (!isTablet) setShowSidebar(false);
              }}
              onDelete={handleDeleteChat}
            />
          )}
          className="flex-1"
        />
      )}
    </View>
  );

  const renderChatArea = () => (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="p-4 border-b border-gray-800 flex-row items-center">
        {!isTablet && (
          <TouchableOpacity
            onPress={() => setShowSidebar(true)}
            className="mr-3"
          >
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text className="text-white text-lg font-medium flex-1">
          {currentChat?.title || 'New Chat'}
        </Text>
      </View>

      {/* Messages */}
      <View className="flex-1">
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
              Start a conversation
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Type a message below to begin chatting
            </Text>
          </View>
        )}
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="border-t border-gray-800"
      >
        <View className="p-4 flex-row items-end">
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
                : 'bg-gray-700'
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

  return (
    <SafeAreaView className="flex-1 bg-black">
      {isTablet ? (
        <View className="flex-1 flex-row">
          {renderSidebar()}
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

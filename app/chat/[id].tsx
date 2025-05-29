import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    useGetAIResponse,
    useSendMessage,
} from '../../hooks/useChatQueries';
import { Message } from '../../services/chatApi';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: currentChat, isLoading: chatLoading } = useChat(id || '');
  const sendMessageMutation = useSendMessage();
  const getAIResponseMutation = useGetAIResponse();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentChat?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentChat?.messages.length, getAIResponseMutation.isPending]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !id) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      // Send message to existing chat
      await sendMessageMutation.mutateAsync({
        chatId: id,
        content: messageContent,
      });

      // Get AI response
      await getAIResponseMutation.mutateAsync({
        chatId: id,
        userMessage: messageContent,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <Text className="text-white text-lg">Invalid chat ID</Text>
        <TouchableOpacity onPress={handleGoBack} className="mt-4 bg-blue-600 px-4 py-2 rounded-lg">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="p-4 border-b border-gray-800 flex-row items-center">
        <TouchableOpacity onPress={handleGoBack} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-medium flex-1">
          {currentChat?.title || 'Chat'}
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
              Start the conversation
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
    </SafeAreaView>
  );
} 
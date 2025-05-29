import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateChat, useGetAIResponse } from '../hooks/useChatQueries';

export default function NewChatScreen() {
  const [inputText, setInputText] = useState('');
  const createChatMutation = useCreateChat();
  const getAIResponseMutation = useGetAIResponse();

  const handleStartChat = async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();

    try {
      // Create new chat
      const newChat = await createChatMutation.mutateAsync(messageContent);
      
      // Get AI response
      await getAIResponseMutation.mutateAsync({
        chatId: newChat.id,
        userMessage: messageContent,
      });

      // Navigate to the new chat
      router.replace(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create new chat. Please try again.');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const isLoading = createChatMutation.isPending || getAIResponseMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="p-4 border-b border-gray-800 flex-row items-center">
        <TouchableOpacity onPress={handleGoBack} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-medium flex-1">
          New Chat
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center p-8">
        <Ionicons name="chatbubbles" size={80} color="#3B82F6" />
        <Text className="text-white text-2xl font-bold text-center mt-6">
          Start a new conversation
        </Text>
        <Text className="text-gray-400 text-center mt-2 mb-8">
          What would you like to discuss today?
        </Text>

        {/* Suggested prompts */}
        <View className="w-full mb-8">
          <Text className="text-gray-300 text-sm mb-4">Suggested prompts:</Text>
          <TouchableOpacity
            className="bg-gray-800 p-4 rounded-lg mb-3"
            onPress={() => setInputText('Explain quantum computing in simple terms')}
            disabled={isLoading}
          >
            <Text className="text-gray-100">Explain quantum computing in simple terms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-800 p-4 rounded-lg mb-3"
            onPress={() => setInputText('Help me write a React Native component')}
            disabled={isLoading}
          >
            <Text className="text-gray-100">Help me write a React Native component</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-800 p-4 rounded-lg"
            onPress={() => setInputText('What are some creative writing prompts?')}
            disabled={isLoading}
          >
            <Text className="text-gray-100">What are some creative writing prompts?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="border-t border-gray-800"
      >
        <View className="p-4">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message here..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
            className="bg-gray-800 text-white p-4 rounded-2xl mb-4 min-h-[60px] max-h-32"
            style={{ textAlignVertical: 'top' }}
          />
          <TouchableOpacity
            onPress={handleStartChat}
            disabled={!inputText.trim() || isLoading}
            className={`p-4 rounded-2xl flex-row items-center justify-center ${
              inputText.trim() && !isLoading
                ? 'bg-blue-600'
                : 'bg-gray-700'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" />
                <Text className="text-white font-medium ml-2">Start Chat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
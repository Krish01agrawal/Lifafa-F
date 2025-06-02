import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. How can I help you with your emails today?',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleGoBack = () => {
    router.back();
  };

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for your message! I\'m here to help you with your emails and documents. What would you like to know?',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const MessageBubble = ({ message }: { message: Message }) => (
    <View className={`mb-3 ${message.isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          message.isUser
            ? 'bg-blue-600 rounded-br-md'
            : 'bg-gray-700 rounded-bl-md'
        }`}
      >
        <Text className="text-white text-base leading-5">
          {message.text}
        </Text>
      </View>
      <Text className="text-gray-500 text-xs mt-1 px-2">
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <TouchableOpacity
          onPress={handleGoBack}
          className="flex-row items-center"
        >
          <Ionicons name="chevron-back" size={28} color="#3B82F6" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center">
          <Text className="text-white text-lg font-semibold">
            AI Assistant
          </Text>
          <Text className="text-gray-400 text-sm">
            Chat ID: {chatId?.slice(-8)}
          </Text>
        </View>
        
        <TouchableOpacity className="p-2">
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ScrollView>

        {/* Input Area */}
        <View className="px-4 py-3 border-t border-gray-800">
          <View className="flex-row items-end bg-gray-800 rounded-3xl px-4 py-2">
            <TouchableOpacity className="mr-3 mb-1">
              <Ionicons name="add-circle" size={28} color="#3B82F6" />
            </TouchableOpacity>
            
            <TextInput
              className="flex-1 text-white text-base py-2 max-h-24"
              placeholder="Message"
              placeholderTextColor="#6B7280"
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
              style={{ fontSize: 16 }}
            />
            
            {inputText.trim() ? (
              <TouchableOpacity
                onPress={sendMessage}
                className="ml-3 mb-1"
              >
                <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
                  <Ionicons name="arrow-up" size={18} color="white" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity className="ml-3 mb-1">
                <Ionicons name="mic" size={28} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
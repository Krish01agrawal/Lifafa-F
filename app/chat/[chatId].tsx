import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { Config, log, logError } from '../../constants/Config';
import { AUTH_KEYS, storage } from '../../utils/storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

type ConnectionStatus = 'connecting' | 'connected' | 'ready' | 'disconnected' | 'error';

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Create WebSocket URL from API URL
  const getWebSocketUrl = (chatId: string) => {
    const apiUrl = Config.apiUrl;
    // Convert http://localhost:3001/api to ws://localhost:3001
    const wsUrl = apiUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')
      .replace('/api', ''); // Remove /api suffix
    
    return `${wsUrl}/ws/chat/${chatId}`;
  };

  const connectWebSocket = async () => {
    if (!chatId) {
      logError('No chatId provided for WebSocket connection');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl(chatId as string);
      log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        log('WebSocket connected, authenticating...');
        setConnectionStatus('connected');
        
        // Get JWT token from storage and authenticate
        try {
          const jwtToken = await storage.getItem(AUTH_KEYS.TOKEN);
          if (jwtToken) {
            log('Sending authentication...');
            ws.send(JSON.stringify({ jwt_token: jwtToken }));
            
            // Set status to ready immediately after sending auth
            setConnectionStatus('ready');
            
            // Add welcome message
            const welcomeMessage: Message = {
              id: 'welcome-' + Date.now(),
              text: 'Hello! I\'m your AI assistant. How can I help you with your emails today?',
              isUser: false,
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            
          } else {
            logError('No JWT token found for authentication');
            setConnectionStatus('error');
          }
        } catch (error) {
          logError('Error getting JWT token:', error);
          setConnectionStatus('error');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          log('Received WebSocket message:', data);

          // Handle regular messages (ignore auth responses)
          if (data.message) {
            const newMessage: Message = {
              id: 'ai-' + Date.now(),
              text: data.message,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
          }
        } catch (error) {
          logError('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        logError('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      logError('Error connecting to WebSocket:', error);
      setConnectionStatus('error');
    }
  };

  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        log('Closing WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [chatId]);

  const handleGoBack = () => {
    // Close WebSocket before navigating back
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.back();
  };

  const sendMessage = () => {
    if (inputText.trim() === '' || connectionStatus !== 'ready') return;

    const messageText = inputText.trim();
    
    // Add user message to UI immediately
    const userMessage: Message = {
      id: 'user-' + Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Send message through WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      log('Sending message via WebSocket:', messageText);
      wsRef.current.send(JSON.stringify({ message: messageText }));
    } else {
      logError('WebSocket not connected, cannot send message');
    }

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Authenticating...';
      case 'ready': return 'Ready';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'ready': return '#10B981'; // green
      case 'connecting':
      case 'connected': return '#F59E0B'; // yellow
      case 'disconnected':
      case 'error': return '#EF4444'; // red
      default: return '#6B7280'; // gray
    }
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
          <View className="flex-row items-center">
            <View 
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: getConnectionStatusColor() }}
            />
            <Text className="text-gray-400 text-sm">
              {getConnectionStatusText()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={connectWebSocket}
          className="p-2"
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={connectionStatus === 'ready' ? '#10B981' : '#3B82F6'} 
          />
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
              placeholder={connectionStatus === 'ready' ? 'Message' : 'Connecting...'}
              placeholderTextColor="#6B7280"
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
              editable={connectionStatus === 'ready'}
              style={{ fontSize: 16 }}
            />
            
            {inputText.trim() && connectionStatus === 'ready' ? (
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
                <Ionicons 
                  name="mic" 
                  size={28} 
                  color={connectionStatus === 'ready' ? '#3B82F6' : '#6B7280'} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
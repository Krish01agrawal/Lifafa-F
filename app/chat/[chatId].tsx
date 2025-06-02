import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Config, log, logError } from '../../constants/Config';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AUTH_KEYS, storage } from '../../utils/storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

type ConnectionStatus = 'connecting' | 'connected' | 'ready' | 'disconnected' | 'error';

// Move Sidebar component outside and memoize it
const SidebarComponent = React.memo(({ 
  animatedSidebarStyle, 
  userProfile 
}: { 
  animatedSidebarStyle: any;
  userProfile: any;
}) => (
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
        <TouchableOpacity className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View className="bg-gray-800 rounded-xl px-3 py-2 flex-row items-center">
        <Ionicons name="search" size={16} color="#9CA3AF" />
        <Text className="text-gray-400 text-sm ml-2 flex-1">Search chats...</Text>
      </View>
    </View>
    
    {/* Chat History */}
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Current Chat */}
      <View className="px-3 py-2">
        <View className="bg-blue-600/20 border border-blue-600/30 rounded-xl p-3 mb-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-sm mb-1" numberOfLines={1}>
                Current Chat
              </Text>
              <Text className="text-blue-300 text-xs" numberOfLines={2}>
                Hello! I'm your AI assistant. How can I help you with your emails today?
              </Text>
              <Text className="text-blue-400 text-xs mt-2">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
          </View>
        </View>
      </View>

      {/* Previous Chats */}
      <View className="px-3">
        {[
          { titleClass: 'w-3/4', line1Class: 'w-11/12', line2Class: 'w-2/3', timeClass: 'w-1/3', unread: false },
          { titleClass: 'w-4/5', line1Class: 'w-5/6', line2Class: 'w-3/5', timeClass: 'w-2/5', unread: true },
          { titleClass: 'w-2/3', line1Class: 'w-11/12', line2Class: 'w-1/2', timeClass: 'w-1/3', unread: false },
          { titleClass: 'w-3/4', line1Class: 'w-5/6', line2Class: 'w-3/5', timeClass: 'w-2/5', unread: false },
          { titleClass: 'w-2/3', line1Class: 'w-5/6', line2Class: 'w-2/3', timeClass: 'w-1/3', unread: false }
        ].map((item, index) => (
          <TouchableOpacity 
            key={index}
            className="bg-gray-800/50 rounded-xl p-3 mb-2 border border-gray-700/50"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center mb-2">
                  {/* Title Skeleton */}
                  <View className={`bg-gray-600 rounded h-3 mr-2 ${item.titleClass}`} />
                  {/* Unread indicator */}
                  {item.unread && (
                    <View className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </View>
                
                {/* Message Preview Skeleton */}
                <View className="mb-2">
                  <View className={`bg-gray-700 rounded h-2.5 mb-1 ${item.line1Class}`} />
                  <View className={`bg-gray-700 rounded h-2.5 ${item.line2Class}`} />
                </View>
                
                {/* Timestamp Skeleton */}
                <View className={`bg-gray-700 rounded h-2 ${item.timeClass}`} />
              </View>
              
              {/* Delete Button */}
              <TouchableOpacity 
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

      {/* Coming Soon Notice */}
      <View className="px-3 py-6">
        <View className="bg-amber-600/10 border border-amber-600/20 rounded-xl p-4 items-center">
          <Ionicons name="time-outline" size={24} color="#F59E0B" />
          <Text className="text-amber-400 font-medium text-sm mt-2 mb-1">
            Coming Soon
          </Text>
          <Text className="text-amber-300/80 text-xs text-center leading-4">
            Chat history and management features are currently in development
          </Text>
        </View>
      </View>
    </ScrollView>
  </Animated.View>
));

// Create a separate component for the chat area to isolate input state
const ChatArea = React.memo(({ 
  messages, 
  connectionStatus, 
  isWaitingForResponse,
  inputText,
  setInputText,
  sendMessage,
  connectWebSocket,
  scrollViewRef,
  MessageBubble,
  LoadingMessageBubble,
  getConnectionStatusColor,
  getConnectionStatusText,
  toggleSidebar,
  isSidebarCollapsed
}: {
  messages: Message[];
  connectionStatus: ConnectionStatus;
  isWaitingForResponse: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  sendMessage: () => void;
  connectWebSocket: () => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  MessageBubble: React.ComponentType<{ message: Message }>;
  LoadingMessageBubble: React.ComponentType;
  getConnectionStatusColor: () => string;
  getConnectionStatusText: () => string;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}) => (
  <View className="flex-1">
    {/* Header */}
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
      <TouchableOpacity
        onPress={toggleSidebar}
        className="flex-row items-center"
      >
        <Ionicons 
          name={isSidebarCollapsed ? "chevron-forward" : "chevron-back"} 
          size={28} 
          color="#3B82F6" 
        />
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
        
        {/* Loading Message */}
        {isWaitingForResponse && <LoadingMessageBubble />}
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
            style={{ 
              fontSize: 16,
              borderWidth: 0,
              outline: 'none',
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Enter') {
                // For now, just send on Enter press
                // In React Native, detecting Shift+Enter is complex, so we'll use Enter to send
                e.preventDefault();
                sendMessage();
              }
            }}
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
  </View>
));

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Get user profile from TanStack Query cache
  const { data: userProfile } = useUserProfile();
  
  // Animation values
  const sidebarWidth = useSharedValue(320); // 80 * 4 = 320px (w-80)
  const sidebarOpacity = useSharedValue(1);

  // Create WebSocket URL from API URL
  const getWebSocketUrl = useCallback((chatId: string) => {
    const apiUrl = Config.apiUrl;
    // Convert http://localhost:3001/api to ws://localhost:3001
    const wsUrl = apiUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')
      .replace('/api', ''); // Remove /api suffix
    
    return `${wsUrl}/ws/chat/${chatId}`;
  }, []);

  const connectWebSocket = useCallback(async () => {
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

          // Hide loading state when response arrives
          setIsWaitingForResponse(false);

          // Handle the new message format with reply array
          if (data.message && data.message.reply && Array.isArray(data.message.reply)) {
            const replyText = data.message.reply[0]; // Get the first reply from array
            if (replyText) {
              const newMessage: Message = {
                id: 'ai-' + Date.now(),
                text: replyText,
                isUser: false,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, newMessage]);
            }
          }
          // Fallback for simple message format (for backward compatibility)
          else if (data.message && typeof data.message === 'string') {
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
          setIsWaitingForResponse(false);
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
  }, [chatId, getWebSocketUrl]);

  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        log('Closing WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const toggleSidebar = useCallback(() => {
    const newCollapsedState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsedState);
    
    // Animate sidebar
    sidebarWidth.value = withTiming(newCollapsedState ? 0 : 320, { duration: 300 });
    sidebarOpacity.value = withTiming(newCollapsedState ? 0 : 1, { duration: 200 });
  }, [isSidebarCollapsed, sidebarWidth, sidebarOpacity]);

  const sendMessage = useCallback(() => {
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
    
    // Show loading state
    setIsWaitingForResponse(true);

    // Send message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        message: messageText,
        timestamp: new Date().toISOString()
      }));
      log('Sent message:', messageText);
    }
  }, [inputText, connectionStatus]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getConnectionStatusText = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Authenticating...';
      case 'ready': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  }, [connectionStatus]);

  const getConnectionStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting': return '#F59E0B';
      case 'connected': return '#3B82F6';
      case 'ready': return '#10B981';
      case 'disconnected': return '#6B7280';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  }, [connectionStatus]);

  const MessageBubble = useMemo(() => React.memo(({ message }: { message: Message }) => (
    <View className={`mb-4 ${message.isUser ? 'items-end' : 'items-start'}`}>
      <View 
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          message.isUser
            ? 'bg-blue-600 rounded-br-md'
            : 'bg-gray-800 rounded-bl-md border border-gray-700'
        }`}
      >
        <Text className="text-white text-base leading-5">
          {message.text}
        </Text>
        <Text className={`text-xs mt-2 ${message.isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  )), [formatTime]);

  const LoadingMessageBubble = useMemo(() => React.memo(() => {
    const [dotCount, setDotCount] = useState(1);
    
    useEffect(() => {
      const animateDots = () => {
        setDotCount(prev => prev >= 3 ? 1 : prev + 1);
      };
      
      const interval = setInterval(animateDots, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <View className="mb-4 items-start">
        <View className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700">
          <View className="flex-row items-center">
            <View className="flex-row mr-2">
              {[1, 2, 3].map((dot) => (
                <View
                  key={dot}
                  className={`w-2 h-2 rounded-full mx-0.5 ${
                    dot <= dotCount ? 'bg-blue-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </View>
            <Text className="text-gray-400 text-sm">AI is typing</Text>
          </View>
        </View>
      </View>
    );
  }), []);

  // Memoize the animated sidebar style to avoid recalculations
  const animatedSidebarStyle = useAnimatedStyle(() => {
    return {
      width: sidebarWidth.value,
      opacity: sidebarOpacity.value,
    };
  });

  // Memoize sidebar component to prevent rerenders
  const MemoizedSidebar = useMemo(() => (
    <SidebarComponent 
      animatedSidebarStyle={animatedSidebarStyle}
      userProfile={userProfile}
    />
  ), [animatedSidebarStyle, userProfile]);

  // Memoize chat area to prevent rerenders when sidebar state changes
  const MemoizedChatArea = useMemo(() => (
    <ChatArea
      messages={messages}
      connectionStatus={connectionStatus}
      isWaitingForResponse={isWaitingForResponse}
      inputText={inputText}
      setInputText={setInputText}
      sendMessage={sendMessage}
      connectWebSocket={connectWebSocket}
      scrollViewRef={scrollViewRef}
      MessageBubble={MessageBubble}
      LoadingMessageBubble={LoadingMessageBubble}
      getConnectionStatusColor={getConnectionStatusColor}
      getConnectionStatusText={getConnectionStatusText}
      toggleSidebar={toggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
    />
  ), [
    messages, 
    connectionStatus, 
    isWaitingForResponse, 
    inputText, 
    sendMessage, 
    connectWebSocket, 
    MessageBubble, 
    LoadingMessageBubble, 
    getConnectionStatusColor, 
    getConnectionStatusText, 
    toggleSidebar, 
    isSidebarCollapsed
  ]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 flex-row">
        {/* Animated Sidebar */}
        {MemoizedSidebar}
        
        {/* Main Chat Area */}
        {MemoizedChatArea}
      </View>
    </SafeAreaView>
  );
} 
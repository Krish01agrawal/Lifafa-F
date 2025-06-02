import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { ChatMessage, useChat } from '../../hooks/useChatCache';
import { useUserProfile } from '../../hooks/useUserProfile';
import { AUTH_KEYS, storage } from '../../utils/storage';

type ConnectionStatus = 'connecting' | 'connected' | 'ready' | 'disconnected' | 'error';

// Add SearchModal component
const SearchModal = React.memo(({ 
  isVisible, 
  onClose 
}: { 
  isVisible: boolean;
  onClose: () => void;
}) => {
  const [searchText, setSearchText] = useState('');

  // Mock chat data organized by time periods
  const chatSections = [
    {
      title: "Yesterday",
      chats: [
        { id: 1, title: "Email Marketing Strategy", icon: "mail-outline" },
        { id: 2, title: "AI Assistant Integration", icon: "chatbubble-outline" },
        { id: 3, title: "Database Optimization", icon: "server-outline" }
      ]
    },
    {
      title: "Previous 7 Days", 
      chats: [
        { id: 4, title: "React Native Performance", icon: "phone-portrait-outline" },
        { id: 5, title: "Authentication Setup", icon: "key-outline" },
        { id: 6, title: "Email Templates Design", icon: "design-outline" },
        { id: 7, title: "API Rate Limiting", icon: "speedometer-outline" }
      ]
    }
  ];

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        className="flex-1 bg-black/50" 
        activeOpacity={1}
        onPress={onClose}
        style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60 }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View 
            className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden"
            style={{ 
              position: 'relative',
              width: 650,
              maxHeight: 500
            }}
          >
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
              style={{ zIndex: 999 }}
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>

            {/* Search Bar */}
            <View className="px-4 py-3 border-b border-gray-800" style={{ paddingRight: 56 }}>
              <View className="bg-gray-800 rounded-lg px-3 py-2 flex-row items-center">
                <Ionicons name="search" size={16} color="#9CA3AF" />
                <TextInput
                  className="flex-1 text-white text-sm ml-2"
                  placeholder="Search chats..."
                  placeholderTextColor="#6B7280"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus
                  style={{ 
                    fontSize: 14,
                    borderWidth: 0,
                    outline: 'none',
                  }}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    className="ml-2"
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* New Chat Option */}
            <TouchableOpacity className="px-4 py-3 border-b border-gray-800 flex-row items-center">
              <View className="w-8 h-8 bg-gray-700 rounded-lg items-center justify-center mr-3">
                <Ionicons name="create-outline" size={16} color="#9CA3AF" />
              </View>
              <Text className="text-white text-sm font-medium">New chat</Text>
            </TouchableOpacity>

            {/* Under Development Notice */}
            <View className="px-4 py-3 bg-yellow-600/10 border-b border-gray-800">
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">🚧</Text>
                <Text className="text-yellow-200 text-xs font-medium">
                  Chat history feature under development
                </Text>
              </View>
            </View>

            {/* Chat History Sections */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {chatSections.map((section, sectionIndex) => (
                <View key={sectionIndex}>
                  {/* Section Header */}
                  <View className="px-4 py-2 bg-gray-800/50">
                    <Text className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                      {section.title}
                    </Text>
                  </View>
                  
                  {/* Section Chats */}
                  {section.chats.map((chat, chatIndex) => (
                    <TouchableOpacity 
                      key={chat.id}
                      className="px-4 py-3 flex-row items-center border-b border-gray-800/50 last:border-b-0"
                    >
                      <View className="w-8 h-8 bg-gray-700 rounded-lg items-center justify-center mr-3">
                        <Ionicons name={chat.icon as any} size={16} color="#9CA3AF" />
                      </View>
                      <Text className="text-gray-300 text-sm flex-1" numberOfLines={1}>
                        {chat.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              
              {/* Coming Soon Footer */}
              <View className="px-4 py-4 bg-gray-800/30">
                <View className="flex-row items-center justify-center">
                  <Text className="text-sm mr-2">⏳</Text>
                  <Text className="text-gray-400 text-xs">
                    More features coming soon!
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

// Move Sidebar component outside and memoize it
const SidebarComponent = React.memo(({ 
  animatedSidebarStyle, 
  userProfile,
  onSearchPress
}: { 
  animatedSidebarStyle: any;
  userProfile: any;
  onSearchPress: () => void;
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
      
      {/* Search Bar - Now Tappable */}
      <TouchableOpacity 
        onPress={onSearchPress}
        className="bg-gray-800 rounded-xl px-3 py-2 flex-row items-center"
      >
        <Ionicons name="search" size={16} color="#9CA3AF" />
        <Text className="text-gray-400 text-sm ml-2 flex-1">Search chats...</Text>
      </TouchableOpacity>
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
    </ScrollView>
    
    {/* Features Incoming Section */}
    <View className="px-4 py-4 border-t border-gray-800 bg-gray-900/80" style={{
      borderTopWidth: 3,
      borderTopColor: '#3B82F6',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    }}>
      <View className="flex-row items-center mb-3">
        <Ionicons name="rocket-outline" size={16} color="#FDE047" />
        <Text className="text-yellow-100 font-semibold text-sm ml-2">
          Features Incoming
        </Text>
      </View>
      
      <Text className="text-yellow-100 text-xs leading-4 mb-3">
        We're working hard to bring you amazing new features:
      </Text>
      
      <View className="space-y-2">
        <View className="flex-row items-center">
          <View className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-2" />
          <Text className="text-yellow-100 text-xs">Chat history & persistence</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-2" />
          <Text className="text-yellow-100 text-xs">Email search & filtering</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-2" />
          <Text className="text-yellow-100 text-xs">Smart email categorization</Text>
        </View>
      </View>
      
    </View>
  </Animated.View>
));

// Enhanced Message Component with status indicators
const MessageBubble = React.memo(({ 
  message, 
  formatTime 
}: { 
  message: ChatMessage; 
  formatTime: (date: Date) => string;
}) => (
  <View className={`flex-row mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
    <View className={`${message.isUser ? 'max-w-xs' : 'max-w-lg'} px-4 py-3 rounded-2xl ${
      message.isUser 
        ? 'bg-blue-600 rounded-br-md' 
        : 'bg-blue-600/20 rounded-bl-md'
    }`}>
      <Text className={`text-base leading-relaxed ${
        message.isUser ? 'text-white' : 'text-gray-100'
      }`}>
        {message.text}
      </Text>
    </View>
  </View>
));

// Loading Message Component
const LoadingMessageBubble = React.memo(() => {
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
});

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Use elegant chat caching system
  const {
    messages,
    addMessage,
    addAIResponse,
    updateMessageStatus,
    initializeChat,
    metadata,
    isLoading: isChatLoading,
    isAddingMessage
  } = useChat(chatId as string);
  
  // Get user profile from TanStack Query cache
  const { data: userProfile } = useUserProfile();
  
  // Animation values
  const sidebarWidth = useSharedValue(320); // 80 * 4 = 320px (w-80)
  const sidebarOpacity = useSharedValue(1);

  // Initialize chat on mount
  useEffect(() => {
    if (chatId) {
      initializeChat(`Chat ${new Date().toLocaleString()}`);
    }
  }, [chatId, initializeChat]);

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
            setConnectionStatus('ready');
            
            // Add welcome message only if no messages exist
            if (messages.length === 0) {
              await addAIResponse('Hello! I\'m your AI assistant. How can I help you with your emails today?');
            }
          } else {
            logError('No JWT token found for authentication');
            setConnectionStatus('error');
          }
        } catch (error) {
          logError('Error getting JWT token:', error);
          setConnectionStatus('error');
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          log('Received WebSocket message:', data);

          setIsWaitingForResponse(false);

          // Handle the new message format with reply array
          if (data.message && data.message.reply && Array.isArray(data.message.reply)) {
            const replyText = data.message.reply[0]; // Get the first reply from array
            if (replyText) {
              await addAIResponse(replyText);
            }
          }
          // Fallback for simple message format (for backward compatibility)
          else if (data.message && typeof data.message === 'string') {
            await addAIResponse(data.message);
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
  }, [chatId, getWebSocketUrl, messages.length, addAIResponse]);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const toggleSidebar = useCallback(() => {
    const newCollapsedState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsedState);
    
    // Animate sidebar
    sidebarWidth.value = withTiming(newCollapsedState ? 0 : 320, { duration: 300 });
    sidebarOpacity.value = withTiming(newCollapsedState ? 0 : 1, { duration: 200 });
  }, [isSidebarCollapsed, sidebarWidth, sidebarOpacity]);

  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '' || connectionStatus !== 'ready') return;

    const messageText = inputText.trim();
    setInputText('');
    
    try {
      // Add user message with optimistic update
      const userMessage = await addMessage({
        text: messageText,
        isUser: true,
        timestamp: new Date(),
        status: 'sending',
      });
      
      setIsWaitingForResponse(true);

      // Send message via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          message: messageText,
          timestamp: new Date().toISOString()
        }));
        
        // Update message status to sent
        await updateMessageStatus(userMessage.id, 'sent');
        log('Sent message:', messageText);
      } else {
        // Update message status to failed if WebSocket is not ready
        await updateMessageStatus(userMessage.id, 'failed');
        setIsWaitingForResponse(false);
      }
    } catch (error) {
      logError('Error sending message:', error);
      setIsWaitingForResponse(false);
    }
  }, [inputText, connectionStatus, addMessage, updateMessageStatus]);

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

  // Memoize the animated sidebar style to avoid recalculations
  const animatedSidebarStyle = useAnimatedStyle(() => {
    return {
      width: sidebarWidth.value,
      opacity: sidebarOpacity.value,
    };
  });

  // Add search modal handlers
  const openSearchModal = useCallback(() => {
    setIsSearchModalVisible(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setIsSearchModalVisible(false);
  }, []);

  // Memoize sidebar component to prevent rerenders
  const MemoizedSidebar = useMemo(() => (
    <SidebarComponent 
      animatedSidebarStyle={animatedSidebarStyle}
      userProfile={userProfile}
      onSearchPress={openSearchModal}
    />
  ), [animatedSidebarStyle, userProfile, openSearchModal]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 flex-row">
        {/* Animated Sidebar */}
        {MemoizedSidebar}
        
        {/* Main Chat Area */}
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
                <MessageBubble key={message.id} message={message} formatTime={formatTime} />
              ))}
              
              {/* Loading Message */}
              {isWaitingForResponse && (
                <LoadingMessageBubble />
              )}
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
      </View>

      {/* Search Modal */}
      <SearchModal 
        isVisible={isSearchModalVisible}
        onClose={closeSearchModal}
      />
    </SafeAreaView>
  );
} 
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Config, log } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';
import { chatWebSocket, TypingStatus } from '../services/websocket';

export interface WebSocketStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  error?: any;
  isServerReady?: boolean; // Track if server sent welcome message
}

// Hook for WebSocket connection management
export function useWebSocketConnection() {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WebSocketStatus>({
    status: 'disconnected',
    reconnectAttempts: 0,
    isServerReady: false
  });

  useEffect(() => {
    // Only attempt connection if WebSocket is enabled and user is authenticated
    if (isAuthenticated && token && Config.enableWebSocket) {
      // Initialize WebSocket with QueryClient and token
      chatWebSocket.initialize(queryClient, token);
      
      // Set up event listeners
      const handleConnected = (data: { isServerReady?: boolean; chatId?: string }) => {
        setStatus(prev => ({ 
          ...prev, 
          status: 'connected', 
          reconnectAttempts: 0, 
          error: undefined,
          isServerReady: data.isServerReady || false
        }));
      };

      const handleDisconnected = () => {
        setStatus(prev => ({ ...prev, status: 'disconnected', isServerReady: false }));
      };

      const handleError = (error: any) => {
        setStatus(prev => ({ ...prev, status: 'error', error, isServerReady: false }));
      };

      const handleMaxReconnectAttempts = (data: { attempts: number }) => {
        setStatus(prev => ({ 
          ...prev, 
          status: 'error', 
          reconnectAttempts: data.attempts,
          error: 'Max reconnection attempts reached',
          isServerReady: false
        }));
      };

      // NEW: Track reconnection attempts
      const handleReconnectAttempt = (data: { attempt: number }) => {
        setStatus(prev => ({ 
          ...prev, 
          status: 'connecting',
          reconnectAttempts: data.attempt,
          error: undefined, // Clear previous errors when attempting to reconnect
          isServerReady: false
        }));
      };

      chatWebSocket.addEventListener('connected', handleConnected);
      chatWebSocket.addEventListener('disconnected', handleDisconnected);
      chatWebSocket.addEventListener('error', handleError);
      chatWebSocket.addEventListener('max_reconnect_attempts_reached', handleMaxReconnectAttempts);
      chatWebSocket.addEventListener('reconnect_attempt', handleReconnectAttempt);

      // Connect to WebSocket
      setStatus(prev => ({ ...prev, status: 'connecting', reconnectAttempts: 0, isServerReady: false }));
      chatWebSocket.connect();

      // Cleanup on unmount or auth change
      return () => {
        chatWebSocket.removeEventListener('connected', handleConnected);
        chatWebSocket.removeEventListener('disconnected', handleDisconnected);
        chatWebSocket.removeEventListener('error', handleError);
        chatWebSocket.removeEventListener('max_reconnect_attempts_reached', handleMaxReconnectAttempts);
        chatWebSocket.removeEventListener('reconnect_attempt', handleReconnectAttempt);
        chatWebSocket.disconnect();
      };
    } else {
      // Disconnect if not authenticated or WebSocket disabled
      chatWebSocket.disconnect();
      setStatus({ 
        status: 'disconnected', 
        reconnectAttempts: 0,
        error: !Config.enableWebSocket ? 'WebSocket disabled in config' : undefined,
        isServerReady: false
      });
    }
  }, [isAuthenticated, token, queryClient]);

  const reconnect = useCallback(() => {
    if (isAuthenticated && token && Config.enableWebSocket) {
      setStatus(prev => ({ ...prev, status: 'connecting', reconnectAttempts: 0, isServerReady: false }));
      chatWebSocket.connect();
    }
  }, [isAuthenticated, token]);

  return {
    status: status.status,
    reconnectAttempts: status.reconnectAttempts,
    error: status.error,
    isServerReady: status.isServerReady,
    reconnect,
    isConnected: status.status === 'connected',
    isReadyToSend: status.status === 'connected' && status.isServerReady,
    isEnabled: Config.enableWebSocket
  };
}

// Hook for joining/leaving chat rooms
export function useChatRoom(chatId: string | null) {
  const { isConnected } = useWebSocketConnection();
  const previousChatId = useRef<string | null>(null);

  useEffect(() => {
    if (isConnected && chatId && chatId !== previousChatId.current) {
      // Leave previous chat if any
      if (previousChatId.current) {
        chatWebSocket.leaveChat();
      }
      
      // Join new chat
      chatWebSocket.joinChat(chatId);
      previousChatId.current = chatId;
      
      log('Joined chat room', { chatId });
    }

    return () => {
      if (isConnected && previousChatId.current) {
        chatWebSocket.leaveChat();
        previousChatId.current = null;
      }
    };
  }, [isConnected, chatId]);

  return {
    currentChatId: previousChatId.current,
    isInChat: !!previousChatId.current && isConnected
  };
}

// Hook for typing indicators
export function useTypingIndicator(chatId: string | null) {
  const { isConnected } = useWebSocketConnection();
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const handleTypingUpdate = (status: TypingStatus) => {
      if (status.chatId === chatId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== status.userId);
          if (status.isTyping) {
            return [...filtered, status];
          }
          return filtered;
        });
      }
    };

    chatWebSocket.addEventListener('typing_update', handleTypingUpdate);

    return () => {
      chatWebSocket.removeEventListener('typing_update', handleTypingUpdate);
    };
  }, [chatId]);

  const startTyping = useCallback(() => {
    if (isConnected && chatId && !isTypingRef.current) {
      chatWebSocket.sendTyping(chatId, true);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isConnected, chatId]);

  const stopTyping = useCallback(() => {
    if (isConnected && chatId && isTypingRef.current) {
      chatWebSocket.sendTyping(chatId, false);
      isTypingRef.current = false;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isConnected, chatId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return {
    typingUsers: typingUsers.filter(u => u.chatId === chatId),
    startTyping,
    stopTyping,
    isTyping: isTypingRef.current
  };
}

// Hook for real-time messages
export function useRealtimeMessages(chatId: string | null) {
  const [newMessages, setNewMessages] = useState<any[]>([]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.chatId === chatId) {
        setNewMessages(prev => [...prev, message]);
        
        // Clear the message after a short delay to avoid accumulation
        setTimeout(() => {
          setNewMessages(prev => prev.filter(m => m.id !== message.id));
        }, 100);
      }
    };

    chatWebSocket.addEventListener('message', handleMessage);

    return () => {
      chatWebSocket.removeEventListener('message', handleMessage);
      setNewMessages([]);
    };
  }, [chatId]);

  return { newMessages };
}

// Hook for user presence
export function useUserPresence(chatId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const handlePresenceUpdate = (data: any) => {
      if (data.chatId === chatId) {
        if (data.type === 'user_joined') {
          setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
        } else if (data.type === 'user_left') {
          setOnlineUsers(prev => prev.filter(id => id !== data.userId));
        }
      }
    };

    chatWebSocket.addEventListener('presence_update', handlePresenceUpdate);

    return () => {
      chatWebSocket.removeEventListener('presence_update', handlePresenceUpdate);
    };
  }, [chatId]);

  return { onlineUsers };
} 
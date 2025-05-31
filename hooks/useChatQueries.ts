import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { log, logError } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';
import { Chat, chatApi, Message } from '../services/chatApi';
import { chatWebSocket } from '../services/websocket';
import { useChatRoom, useTypingIndicator, useUserPresence, useWebSocketConnection } from './useWebSocket';

// Query keys
export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (filters: string) => [...chatKeys.lists(), { filters }] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

// Get all chats
export function useChatHistory() {
  const { isAuthenticated } = useAuth();
  const { isConnected } = useWebSocketConnection();
  
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => chatApi.getChats(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: isConnected ? false : 1000 * 30, // Only poll when WebSocket disconnected
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// Get a specific chat
export function useChat(chatId: string) {
  const { isAuthenticated } = useAuth();
  const { isConnected } = useWebSocketConnection();
  const { currentChatId } = useChatRoom(chatId);
  
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatApi.getChat(chatId),
    enabled: isAuthenticated && !!chatId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: isConnected ? false : 1000 * 15, // Only poll when WebSocket disconnected
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Create a new chat
export function useCreateChat() {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();
  
  return useMutation({
    mutationFn: async (message: string) => {
      if (!isConnected) {
        throw new Error('WebSocket not connected. Please wait for connection.');
      }
      
      // Create a chat using only WebSocket
      const newChatId = `chat_${Date.now()}`;
      log('Creating new chat with WebSocket', { 
        chatId: newChatId, 
        messagePreview: message.substring(0, 50),
        timestamp: Date.now()
      });
      
      const newChat: Chat = {
        id: newChatId,
        title: message.length > 50 ? message.substring(0, 50) + '...' : message,
        lastMessage: message,
        lastMessageTime: new Date(),
        messages: [{
          id: `msg_${Date.now()}`,
          content: message,
          role: 'user',
          timestamp: new Date(),
          chatId: newChatId,
        }],
        createdAt: new Date(),
      };
      
      // Join the chat room via WebSocket
      log('Joining chat room', { chatId: newChatId });
      chatWebSocket.joinChat(newChatId);
      
      // Wait a moment to ensure the chat room is joined before sending the message
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send the first message via WebSocket
      log('Sending first message via WebSocket', { chatId: newChatId, message: message.substring(0, 50) });
      chatWebSocket.sendSimpleMessage(message);
      
      log('Chat created via WebSocket', { chatId: newChatId });
      return newChat;
    },
    onSuccess: (newChat) => {
      // Add new chat to cache with optimistic update
      queryClient.setQueryData(['chats'], (oldData: Chat[] | undefined) => {
        return oldData ? [newChat, ...oldData] : [newChat];
      });

      // Set the chat data in cache
      queryClient.setQueryData(['chat', newChat.id], newChat);

      // Navigate to the new chat
      router.push(`/?chatId=${newChat.id}`);
    },
    onError: (error) => {
      logError('Failed to create chat', error);
    }
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();
  
  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!isConnected) {
        throw new Error('WebSocket not connected. Please wait for connection.');
      }

      // Create optimistic message using the correct interface
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        chatId,
        content,
        role: 'user',
        timestamp: new Date(),
      };

      // Add optimistic message to cache
      queryClient.setQueryData(['chat', chatId], (oldData: Chat | null) => {
        if (!oldData) return oldData;
        
        const newMessages = [...oldData.messages, tempMessage];
        return { ...oldData, messages: newMessages };
      });

      try {
        // Join the chat room if not already joined
        chatWebSocket.joinChat(chatId);
        
        // Send via WebSocket only
        chatWebSocket.sendSimpleMessage(content);

        // Return the message (will be replaced when WebSocket response comes back)
        return {
          id: `msg_${Date.now()}`,
          content,
          role: 'user' as const,
          timestamp: new Date(),
          chatId,
        };
      } catch (error) {
        // Remove optimistic message on error
        queryClient.setQueryData(['chat', chatId], (oldData: Chat | null) => {
          if (!oldData) return oldData;
          
          const filteredMessages = oldData.messages.filter(msg => msg.id !== tempMessage.id);
          return { ...oldData, messages: filteredMessages };
        });
        throw error;
      }
    },
    onSuccess: (newMessage, { chatId }) => {
      // Replace optimistic message with real message
      queryClient.setQueryData(['chat', chatId], (oldData: Chat | null) => {
        if (!oldData) return oldData;
        
        const messages = oldData.messages;
        // Remove temp message and add real message
        const filteredMessages = messages.filter(msg => !msg.id.startsWith('temp-'));
        
        // Avoid duplicates
        if (filteredMessages.some(msg => msg.id === newMessage.id)) {
          return { ...oldData, messages: filteredMessages };
        }
        
        return { 
          ...oldData, 
          messages: [...filteredMessages, newMessage],
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp
        };
      });

      // Update chat list
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      
      log('Message sent via WebSocket successfully', { messageId: newMessage.id, chatId });
    },
    onError: (error, { chatId }) => {
      logError('Failed to send message via WebSocket', error);
      
      // Ensure cache is cleaned up
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
    },
  });
}

// Get AI response - simplified to just wait for WebSocket response
export function useGetAIResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ chatId, userMessage }: { chatId: string; userMessage: string }) => {
      // Since we're using WebSocket, the AI response will come automatically
      // This function now just returns a placeholder that will be replaced by WebSocket response
      return {
        id: `ai_${Date.now()}`,
        content: 'Waiting for AI response...',
        role: 'assistant' as const,
        timestamp: new Date(),
        chatId,
      };
    },
    onSuccess: (newMessage, { chatId }) => {
      // The real AI response will come via WebSocket, so we don't add this placeholder to cache
      log('AI response request sent', { chatId });
    },
    onError: (error) => {
      logError('Failed to request AI response', error);
    }
  });
}

// Delete a chat
export function useDeleteChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (chatId: string) => chatApi.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// Update chat title
export function useUpdateChatTitle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      chatApi.updateChatTitle(chatId, title),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// NEW: Typing functionality with WebSocket integration
export function useTyping(chatId: string | null) {
  const { typingUsers, startTyping, stopTyping, isTyping } = useTypingIndicator(chatId);
  
  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping,
    // Helper to format typing display
    getTypingDisplay: () => {
      if (typingUsers.length === 0) return '';
      if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
      if (typingUsers.length === 2) return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
    }
  };
}

// NEW: Connection status for UI display
export function useConnectionStatus() {
  const { status, reconnectAttempts, error, reconnect, isConnected } = useWebSocketConnection();
  
  return {
    status,
    reconnectAttempts,
    error,
    reconnect,
    isConnected,
    // Helper to get user-friendly status message
    getStatusMessage: () => {
      switch (status) {
        case 'connecting':
          return reconnectAttempts > 0 
            ? `Reconnecting... (${reconnectAttempts}/5)` 
            : 'Connecting...';
        case 'connected':
          return 'Connected';
        case 'disconnected':
          return 'Offline';
        case 'error':
          return error || 'Connection error';
        default:
          return 'Unknown';
      }
    },
    // Helper to determine if we should show status indicator
    shouldShowStatus: () => status !== 'connected',
    // Helper to check if actively trying to reconnect
    isReconnecting: () => status === 'connecting' && reconnectAttempts > 0,
    // Helper to check if max attempts reached
    hasMaxedRetries: () => status === 'error' && reconnectAttempts >= 5
  };
}

// NEW: User presence in chat rooms
export function useChatPresence(chatId: string | null) {
  const { onlineUsers } = useUserPresence(chatId);
  
  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isUserOnline: (userId: string) => onlineUsers.includes(userId)
  };
}

// NEW: Offline message queue status
export function useOfflineStatus() {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();
  
  // Get pending mutations (offline messages)
  const mutationCache = queryClient.getMutationCache();
  const pendingMutations = mutationCache.getAll().filter(
    mutation => mutation.state.status === 'pending' || mutation.state.status === 'error'
  );

  return {
    isOffline: !isConnected,
    pendingMessages: pendingMutations.length,
    // Helper to retry all failed mutations
    retryPendingMessages: () => {
      pendingMutations.forEach(mutation => {
        if (mutation.state.status === 'error') {
          mutation.continue();
        }
      });
    }
  };
} 
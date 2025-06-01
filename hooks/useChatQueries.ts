import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { log, logError } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';
import { Chat, Message } from '../services/chatApi';

// Query keys
export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (filters: string) => [...chatKeys.lists(), { filters }] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

// Mock data for local development
const mockChats: Chat[] = [];

// Get all chats (simplified - local only)
export function useChatHistory() {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      // Return local mock data
      return mockChats;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get a specific chat (simplified - local only)
export function useChat(chatId: string) {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      // Find chat in local mock data
      return mockChats.find(chat => chat.id === chatId) || null;
    },
    enabled: isAuthenticated && !!chatId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Create a new chat (simplified - local only)
export function useCreateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: string) => {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }
      
      // Create a chat locally
      const newChatId = `chat_${Date.now()}`;
      log('Creating new chat locally', { 
        chatId: newChatId, 
        messagePreview: message.substring(0, 50),
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
      
      // Add to local storage
      mockChats.unshift(newChat);
      
      // Simulate AI response after a delay
      setTimeout(() => {
        const aiResponse: Message = {
          id: `ai_${Date.now()}`,
          content: `This is a mock AI response to: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`,
          role: 'assistant',
          timestamp: new Date(),
          chatId: newChatId,
        };
        
        // Add AI response to the chat
        const chatIndex = mockChats.findIndex(chat => chat.id === newChatId);
        if (chatIndex !== -1) {
          mockChats[chatIndex].messages.push(aiResponse);
          mockChats[chatIndex].lastMessage = aiResponse.content;
          mockChats[chatIndex].lastMessageTime = aiResponse.timestamp;
          
          // Update cache
          queryClient.setQueryData(['chat', newChatId], mockChats[chatIndex]);
          queryClient.setQueryData(['chats'], [...mockChats]);
        }
      }, 1000 + Math.random() * 2000); // 1-3 second delay
      
      log('Chat created locally', { chatId: newChatId });
      return newChat;
    },
    onSuccess: (newChat) => {
      // Add new chat to cache
      queryClient.setQueryData(['chats'], (oldData: Chat[] | undefined) => {
        return [newChat, ...(oldData || [])];
      });

      // Set the chat data in cache
      queryClient.setQueryData(['chat', newChat.id], newChat);

      // Navigate to the new chat
      router.push(`/?chatId=${newChat.id}` as any);
    },
    onError: (error) => {
      logError('Failed to create chat', error);
    }
  });
}

// Send a message (simplified - local only)
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!content.trim()) {
        throw new Error('Message cannot be empty');
      }

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        chatId,
        content,
        role: 'user',
        timestamp: new Date(),
      };

      // Add message to local chat
      const chatIndex = mockChats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        mockChats[chatIndex].messages.push(userMessage);
        mockChats[chatIndex].lastMessage = content;
        mockChats[chatIndex].lastMessageTime = new Date();
      }

      // Simulate AI response after a delay
      setTimeout(() => {
        const aiResponse: Message = {
          id: `ai_${Date.now()}`,
          content: `This is a mock AI response to: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
          role: 'assistant',
          timestamp: new Date(),
          chatId,
        };
        
        // Add AI response to the chat
        if (chatIndex !== -1) {
          mockChats[chatIndex].messages.push(aiResponse);
          mockChats[chatIndex].lastMessage = aiResponse.content;
          mockChats[chatIndex].lastMessageTime = aiResponse.timestamp;
          
          // Update cache
          queryClient.setQueryData(['chat', chatId], mockChats[chatIndex]);
          queryClient.setQueryData(['chats'], [...mockChats]);
        }
      }, 1000 + Math.random() * 2000); // 1-3 second delay

      return userMessage;
    },
    onSuccess: (newMessage, { chatId }) => {
      // Update chat cache with new message
      queryClient.setQueryData(['chat', chatId], (oldData: Chat | null) => {
        if (!oldData) return oldData;
        
        return { 
          ...oldData, 
          messages: [...oldData.messages, newMessage],
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp
        };
      });

      // Update chat list
      queryClient.setQueryData(['chats'], (oldData: Chat[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: newMessage.content,
              lastMessageTime: newMessage.timestamp
            };
          }
          return chat;
        });
      });
      
      log('Message sent locally', { messageId: newMessage.id, chatId });
    },
    onError: (error, { chatId }) => {
      logError('Failed to send message', error);
    },
  });
}

// Delete a chat (simplified - local only)
export function useDeleteChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (chatId: string) => {
      // Remove from local storage
      const chatIndex = mockChats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        mockChats.splice(chatIndex, 1);
      }
      return chatId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// Update chat title (simplified - local only)
export function useUpdateChatTitle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      // Update in local storage
      const chatIndex = mockChats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        mockChats[chatIndex].title = title;
      }
      return { chatId, title };
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// Simplified connection status (always ready)
export function useConnectionStatus() {
  return {
    status: 'connected' as const,
    reconnectAttempts: 0,
    error: null,
    reconnect: () => {},
    isConnected: true,
    isReadyToSend: true,
    isServerReady: true,
    getStatusMessage: () => 'Connected (Local Mode)',
    shouldShowStatus: () => false,
    isReconnecting: () => false,
    hasMaxedRetries: () => false,
    canSendMessages: () => true
  };
}

// Simplified typing (no-op)
export function useTyping(chatId: string | null) {
  return {
    typingUsers: [],
    startTyping: () => {},
    stopTyping: () => {},
    isTyping: false,
    getTypingDisplay: () => ''
  };
} 
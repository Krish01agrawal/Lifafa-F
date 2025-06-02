import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { log, logError } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';

// Enhanced Message interface with better typing
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  localId?: string; // For optimistic updates
}

export interface ChatMetadata {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatData {
  metadata: ChatMetadata;
  messages: ChatMessage[];
}

// Query keys factory for better cache management
export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  chat: (id: string) => [...chatKeys.all, 'chat', id] as const,
  messages: (chatId: string) => [...chatKeys.all, 'messages', chatId] as const,
  metadata: (chatId: string) => [...chatKeys.all, 'metadata', chatId] as const,
};

// Storage keys for persistent cache
const STORAGE_KEYS = {
  CHATS_LIST: 'chats_list',
  CHAT_MESSAGES: (chatId: string) => `chat_messages_${chatId}`,
  CHAT_METADATA: (chatId: string) => `chat_metadata_${chatId}`,
} as const;

// Local storage utilities with error handling
const ChatStorage = {
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logError('Failed to save to chat storage:', error);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = await storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logError('Failed to read from chat storage:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (error) {
      logError('Failed to remove from chat storage:', error);
    }
  },
};

// Hook for managing chat list
export function useChatList() {
  const queryClient = useQueryClient();

  const { data: chats = [], isLoading, error } = useQuery({
    queryKey: chatKeys.lists(),
    queryFn: async (): Promise<ChatMetadata[]> => {
      // Try to load from cache first
      const cached = await ChatStorage.getItem<ChatMetadata[]>(STORAGE_KEYS.CHATS_LIST);
      if (cached) {
        log('Loaded chat list from cache:', cached.length, 'chats');
        return cached;
      }
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const updateChatsList = useCallback(async (chats: ChatMetadata[]) => {
    // Update cache
    queryClient.setQueryData(chatKeys.lists(), chats);
    // Persist to storage
    await ChatStorage.setItem(STORAGE_KEYS.CHATS_LIST, chats);
  }, [queryClient]);

  const addChat = useCallback(async (metadata: ChatMetadata) => {
    const currentChats = queryClient.getQueryData<ChatMetadata[]>(chatKeys.lists()) || [];
    const updatedChats = [metadata, ...currentChats];
    await updateChatsList(updatedChats);
    log('Added new chat to list:', metadata.id);
  }, [updateChatsList, queryClient]);

  const updateChatMetadata = useCallback(async (chatId: string, updates: Partial<ChatMetadata>) => {
    const currentChats = queryClient.getQueryData<ChatMetadata[]>(chatKeys.lists()) || [];
    const updatedChats = currentChats.map(chat => 
      chat.id === chatId ? { ...chat, ...updates, updatedAt: new Date() } : chat
    );
    await updateChatsList(updatedChats);
  }, [updateChatsList, queryClient]);

  const deleteChat = useCallback(async (chatId: string) => {
    const currentChats = queryClient.getQueryData<ChatMetadata[]>(chatKeys.lists()) || [];
    const updatedChats = currentChats.filter(chat => chat.id !== chatId);
    await updateChatsList(updatedChats);
    
    // Clean up related caches
    queryClient.removeQueries({ queryKey: chatKeys.chat(chatId) });
    queryClient.removeQueries({ queryKey: chatKeys.messages(chatId) });
    
    // Clean up storage
    await ChatStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES(chatId));
    await ChatStorage.removeItem(STORAGE_KEYS.CHAT_METADATA(chatId));
    
    log('Deleted chat and cleaned up cache:', chatId);
  }, [updateChatsList, queryClient]);

  return {
    chats,
    isLoading,
    error,
    addChat,
    updateChatMetadata,
    deleteChat,
  };
}

// Hook for managing individual chat messages
export function useChatMessages(chatId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const optimisticCounterRef = useRef(0);

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: chatKeys.messages(chatId),
    queryFn: async (): Promise<ChatMessage[]> => {
      // Load from local storage first
      const cached = await ChatStorage.getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES(chatId));
      if (cached) {
        // Parse dates back from JSON
        const parsedMessages = cached.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        log('Loaded messages from cache for chat:', chatId, parsedMessages.length, 'messages');
        return parsedMessages;
      }
      return [];
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Optimistic message addition
  const addMessageOptimistic = useMutation({
    mutationFn: async (newMessage: Omit<ChatMessage, 'id'>) => {
      const optimisticId = `optimistic-${chatId}-${Date.now()}-${++optimisticCounterRef.current}`;
      const messageWithId: ChatMessage = {
        ...newMessage,
        id: optimisticId,
        status: 'sending',
        localId: optimisticId,
      };

      return messageWithId;
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(chatId)) || [];
      const optimisticId = `optimistic-${chatId}-${Date.now()}-${++optimisticCounterRef.current}`;
      const messageWithId: ChatMessage = {
        ...newMessage,
        id: optimisticId,
        status: 'sending',
        localId: optimisticId,
      };

      // Optimistically update the cache
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(chatId), [...previousMessages, messageWithId]);
      
      return { previousMessages, optimisticMessage: messageWithId };
    },
    onSuccess: async (optimisticMessage, _, context) => {
      // Update storage after optimistic update
      const currentMessages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(chatId)) || [];
      await ChatStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES(chatId), currentMessages);
      
      log('Optimistically added message:', optimisticMessage.id);
      return optimisticMessage;
    },
    onError: (error, _, context) => {
      logError('Failed to add message optimistically:', error);
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(chatId), context.previousMessages);
      }
    },
  });

  // Update message status (e.g., from sending to sent)
  const updateMessageStatus = useCallback(async (messageId: string, status: ChatMessage['status'], serverId?: string) => {
    const currentMessages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(chatId)) || [];
    const updatedMessages = currentMessages.map(msg => {
      if (msg.id === messageId || msg.localId === messageId) {
        return {
          ...msg,
          status,
          ...(serverId && { id: serverId }), // Update to server ID if provided
        };
      }
      return msg;
    });

    queryClient.setQueryData(chatKeys.messages(chatId), updatedMessages);
    await ChatStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES(chatId), updatedMessages);
    
    log('Updated message status:', messageId, 'to', status);
  }, [queryClient, chatId]);

  // Add AI response
  const addAIResponse = useCallback(async (response: string) => {
    const aiMessage: ChatMessage = {
      id: `ai-${chatId}-${Date.now()}`,
      text: response,
      isUser: false,
      timestamp: new Date(),
      status: 'delivered',
    };

    const currentMessages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(chatId)) || [];
    const updatedMessages = [...currentMessages, aiMessage];
    
    queryClient.setQueryData(chatKeys.messages(chatId), updatedMessages);
    await ChatStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES(chatId), updatedMessages);
    
    log('Added AI response:', aiMessage.id);
    return aiMessage;
  }, [queryClient, chatId]);

  // Clear all messages for a chat
  const clearMessages = useCallback(async () => {
    queryClient.setQueryData(chatKeys.messages(chatId), []);
    await ChatStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES(chatId));
    log('Cleared messages for chat:', chatId);
  }, [queryClient, chatId]);

  // Get last message for chat list updates
  const lastMessage = useMemo(() => {
    if (messages.length === 0) return null;
    return messages[messages.length - 1];
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    addMessage: addMessageOptimistic.mutateAsync,
    addAIResponse,
    updateMessageStatus,
    clearMessages,
    lastMessage,
    isAddingMessage: addMessageOptimistic.isPending,
  };
}

// Hook for managing complete chat data (metadata + messages)
export function useChat(chatId: string) {
  const { chats, addChat, updateChatMetadata } = useChatList();
  const chatMessages = useChatMessages(chatId);
  
  const chatMetadata = useMemo(() => 
    chats.find(chat => chat.id === chatId), 
    [chats, chatId]
  );

  // Auto-update chat metadata when messages change
  useEffect(() => {
    if (chatMessages.lastMessage && chatMetadata) {
      updateChatMetadata(chatId, {
        lastMessage: chatMessages.lastMessage.text,
        lastMessageTime: chatMessages.lastMessage.timestamp,
        updatedAt: new Date(),
      });
    }
  }, [chatMessages.lastMessage, chatMetadata, chatId, updateChatMetadata]);

  // Initialize chat if it doesn't exist
  const initializeChat = useCallback(async (title: string = 'New Chat') => {
    if (!chatMetadata) {
      const newMetadata: ChatMetadata = {
        id: chatId,
        title,
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await addChat(newMetadata);
      log('Initialized new chat:', chatId);
    }
  }, [chatMetadata, chatId, addChat]);

  return {
    metadata: chatMetadata,
    ...chatMessages,
    initializeChat,
    updateMetadata: (updates: Partial<ChatMetadata>) => updateChatMetadata(chatId, updates),
  };
}

// Hook for offline message queue
export function useOfflineMessageQueue() {
  const queryClient = useQueryClient();
  
  // This would handle queuing messages when offline
  // and syncing them when back online
  const queueMessage = useCallback(async (chatId: string, message: ChatMessage) => {
    // Implementation for offline queue
    log('Queued message for offline sync:', message.id);
  }, []);

  const syncOfflineMessages = useCallback(async () => {
    // Implementation for syncing queued messages
    log('Syncing offline messages...');
  }, []);

  return {
    queueMessage,
    syncOfflineMessages,
  };
} 
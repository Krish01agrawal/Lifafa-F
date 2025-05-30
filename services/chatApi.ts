import { getApiUrl, log, logError } from '../constants/Config';
import { AUTH_KEYS, storage } from '../utils/storage';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  chatId: string;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime: Date;
  messages: Message[];
  createdAt: Date;
}

// Helper function to get auth token
const getAuthToken = async (): Promise<string> => {
  const token = await storage.getItem(AUTH_KEYS.TOKEN);
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  
  log('Making authenticated request', { endpoint, method: options.method || 'GET' });
  
  const response = await fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      logError('Authentication failed - token may be expired', { status: response.status });
      throw new Error('Authentication failed. Please login again.');
    }
    logError('Request failed', { status: response.status, statusText: response.statusText });
    throw new Error(`Request failed: ${response.statusText}`);
  }

  return response;
};

// Simulate network delay for smooth UX (matching original behavior)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const chatApi = {
  // Get all chats with pagination support
  getChats: async (page: number = 1, limit: number = 50): Promise<Chat[]> => {
    await delay(300);
    
    try {
      const response = await makeAuthenticatedRequest(
        `/chat/history?page=${page}&limit=${limit}`
      );
      
      const data = await response.json();
      
      // Transform API response to match our Chat interface
      return data.chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        lastMessage: chat.lastMessage,
        lastMessageTime: new Date(chat.lastMessageTime),
        messages: chat.messages?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
          chatId: chat.id,
        })) || [],
        createdAt: new Date(chat.createdAt),
      }));
    } catch (error) {
      logError('Error fetching chats', error);
      throw error;
    }
  },

  // Get a specific chat with messages
  getChat: async (chatId: string): Promise<Chat | null> => {
    await delay(200);
    
    try {
      log('Fetching chat', { chatId });
      const response = await makeAuthenticatedRequest(
        `/chat/${chatId}`
      );
      
      const chat = await response.json();
      
      return {
        id: chat.id,
        title: chat.title,
        lastMessage: chat.lastMessage,
        lastMessageTime: new Date(chat.lastMessageTime),
        messages: chat.messages?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.timestamp),
          chatId: chat.id,
        })) || [],
        createdAt: new Date(chat.createdAt),
      };
    } catch (error) {
      logError('Error fetching chat', { chatId, error });
      return null;
    }
  },

  // Create a new chat
  createChat: async (firstMessage: string): Promise<Chat> => {
    await delay(400);
    
    try {
      log('Creating new chat', { messagePreview: firstMessage.substring(0, 50) });
      const response = await makeAuthenticatedRequest(
        `/chat`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage,
            firstMessage: firstMessage,
          }),
        }
      );
      
      const chat = await response.json();
      
      return {
        id: chat.id,
        title: chat.title,
        lastMessage: firstMessage,
        lastMessageTime: new Date(chat.lastMessageTime || Date.now()),
        messages: [{
          id: chat.firstMessageId || Date.now().toString(),
          content: firstMessage,
          role: 'user',
          timestamp: new Date(),
          chatId: chat.id,
        }],
        createdAt: new Date(chat.createdAt),
      };
    } catch (error) {
      logError('Error creating chat', error);
      throw error;
    }
  },

  // Send a message to a chat (this will be handled by WebSocket in the future)
  sendMessage: async (chatId: string, content: string): Promise<Message> => {
    await delay(300);
    
    try {
      log('Sending message', { chatId, messagePreview: content.substring(0, 50) });
      const response = await makeAuthenticatedRequest(
        `/chat/${chatId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: content,
            role: 'user',
          }),
        }
      );
      
      const result = await response.json();
      
      return {
        id: result.messageId || Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date(),
        chatId,
      };
    } catch (error) {
      logError('Error sending message', { chatId, error });
      throw error;
    }
  },

  // Get AI response (this will be handled by WebSocket in the future)
  getAIResponse: async (chatId: string, userMessage: string): Promise<Message> => {
    await delay(1000 + Math.random() * 2000); // 1-3 seconds delay
    
    try {
      log('Getting AI response', { chatId, userMessagePreview: userMessage.substring(0, 50) });
      // For now, we'll use the update endpoint to get AI response
      // In the future, this will be handled via WebSocket
      const response = await makeAuthenticatedRequest(
        `/chat/${chatId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: userMessage,
            role: 'user',
            requestAIResponse: true,
          }),
        }
      );
      
      const result = await response.json();
      
      return {
        id: result.aiMessageId || Date.now().toString(),
        content: result.aiResponse || 'Sorry, I could not generate a response.',
        role: 'assistant',
        timestamp: new Date(),
        chatId,
      };
    } catch (error) {
      logError('Error getting AI response', { chatId, error });
      throw error;
    }
  },

  // Delete a chat
  deleteChat: async (chatId: string): Promise<void> => {
    await delay(200);
    
    try {
      log('Deleting chat', { chatId });
      await makeAuthenticatedRequest(
        `/chat/${chatId}`,
        {
          method: 'DELETE',
        }
      );
    } catch (error) {
      logError('Error deleting chat', { chatId, error });
      throw error;
    }
  },

  // Update chat title
  updateChatTitle: async (chatId: string, title: string): Promise<void> => {
    await delay(200);
    
    try {
      log('Updating chat title', { chatId, title });
      const response = await makeAuthenticatedRequest(
        `/chat/${chatId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: title,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to update chat title: ${response.statusText}`);
      }
    } catch (error) {
      logError('Error updating chat title', { chatId, title, error });
      throw error;
    }
  },
}; 
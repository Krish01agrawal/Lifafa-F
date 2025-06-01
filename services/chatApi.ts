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
  lastMessage: string;
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

class ChatApi {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Get all chats for the current user (DISABLED)
  async getChats(): Promise<Chat[]> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Get a specific chat by ID (DISABLED)
  async getChat(chatId: string): Promise<Chat | null> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Create a new chat (DISABLED)
  async createChat(title: string): Promise<Chat> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Send a message to a chat (DISABLED)
  async sendMessage(chatId: string, content: string): Promise<Message> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Get AI response (DISABLED)
  async getAIResponse(chatId: string, userMessage: string): Promise<Message> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Delete a chat (DISABLED)
  async deleteChat(chatId: string): Promise<void> {
    throw new Error('REST API disabled - using local mode only');
  }

  // Update chat title (DISABLED)
  async updateChatTitle(chatId: string, title: string): Promise<Chat> {
    throw new Error('REST API disabled - using local mode only');
  }
}

// Export a singleton instance (though it's not used in local mode)
export const chatApi = new ChatApi(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'); 
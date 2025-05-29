import { v4 as uuidv4 } from 'uuid';

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

// Mock data storage
let chats: Chat[] = [
  {
    id: '1',
    title: 'Getting Started with AI',
    lastMessage: 'Hello! How can I help you today?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    messages: [
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        chatId: '1',
      },
    ],
  },
  {
    id: '2',
    title: 'React Native Development',
    lastMessage: 'What are the best practices for React Native?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    messages: [
      {
        id: '2',
        content: 'What are the best practices for React Native?',
        role: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        chatId: '2',
      },
      {
        id: '3',
        content: 'Here are some key React Native best practices:\n\n1. Use TypeScript for better type safety\n2. Implement proper state management\n3. Optimize performance with FlatList for large datasets\n4. Use proper navigation patterns\n5. Handle platform differences appropriately',
        role: 'assistant',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 30),
        chatId: '2',
      },
    ],
  },
];

// Mock AI responses
const mockResponses = [
  "That's a great question! Let me help you with that.",
  "I understand what you're looking for. Here's my take on it:",
  "Based on my knowledge, I can provide you with the following information:",
  "That's an interesting topic. Let me break it down for you:",
  "I'd be happy to help you understand this better.",
  "Here's what I think about your question:",
  "Let me provide you with a comprehensive answer:",
  "That's a common question, and here's what I recommend:",
];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const chatApi = {
  // Get all chats
  getChats: async (): Promise<Chat[]> => {
    await delay(300);
    return [...chats].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  },

  // Get a specific chat with messages
  getChat: async (chatId: string): Promise<Chat | null> => {
    await delay(200);
    const chat = chats.find(c => c.id === chatId);
    return chat || null;
  },

  // Create a new chat
  createChat: async (firstMessage: string): Promise<Chat> => {
    await delay(400);
    
    const chatId = uuidv4();
    const messageId = uuidv4();
    const now = new Date();
    
    const userMessage: Message = {
      id: messageId,
      content: firstMessage,
      role: 'user',
      timestamp: now,
      chatId,
    };

    const chat: Chat = {
      id: chatId,
      title: firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage,
      lastMessage: firstMessage,
      lastMessageTime: now,
      createdAt: now,
      messages: [userMessage],
    };

    chats.unshift(chat);
    return chat;
  },

  // Send a message to a chat
  sendMessage: async (chatId: string, content: string): Promise<Message> => {
    await delay(300);
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    const messageId = uuidv4();
    const now = new Date();
    
    const userMessage: Message = {
      id: messageId,
      content,
      role: 'user',
      timestamp: now,
      chatId,
    };

    chat.messages.push(userMessage);
    chat.lastMessage = content;
    chat.lastMessageTime = now;

    return userMessage;
  },

  // Get AI response (simulated)
  getAIResponse: async (chatId: string, userMessage: string): Promise<Message> => {
    await delay(1000 + Math.random() * 2000); // 1-3 seconds delay
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Generate a mock response
    const responsePrefix = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    let response = responsePrefix;

    // Add some context-aware responses
    if (userMessage.toLowerCase().includes('code') || userMessage.toLowerCase().includes('programming')) {
      response += "\n\n```javascript\n// Here's a simple example:\nconst example = () => {\n  console.log('Hello, World!');\n};\n```";
    } else if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('how')) {
      response += "\n\nI'm here to assist you step by step. Feel free to ask any follow-up questions!";
    } else {
      response += "\n\nIs there anything specific you'd like me to elaborate on?";
    }

    const messageId = uuidv4();
    const now = new Date();
    
    const aiMessage: Message = {
      id: messageId,
      content: response,
      role: 'assistant',
      timestamp: now,
      chatId,
    };

    chat.messages.push(aiMessage);
    chat.lastMessage = response;
    chat.lastMessageTime = now;

    return aiMessage;
  },

  // Delete a chat
  deleteChat: async (chatId: string): Promise<void> => {
    await delay(200);
    chats = chats.filter(c => c.id !== chatId);
  },

  // Update chat title
  updateChatTitle: async (chatId: string, title: string): Promise<Chat> => {
    await delay(200);
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    chat.title = title;
    return chat;
  },
}; 
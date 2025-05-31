import { QueryClient } from '@tanstack/react-query';
import { Config, log, logError } from '../constants/Config';

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: string;
  type: 'user' | 'assistant';
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_joined' | 'user_left' | 'error' | 'connected' | 'join_chat' | 'leave_chat';
  payload: any;
  chatId?: string;
  userId?: string;
}

export interface TypingStatus {
  userId: string;
  userName: string;
  chatId: string;
  isTyping: boolean;
}

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private queryClient: QueryClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private token: string | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private currentChatId: string | null = null;
  private isServerReady = false; // Track if server sent welcome message

  constructor() {
    this.setupNetworkListeners();
  }

  // Initialize with QueryClient and auth token
  initialize(queryClient: QueryClient, token: string) {
    this.queryClient = queryClient;
    this.token = token;
    log('WebSocket service initialized', { 
      tokenPresent: !!token, 
      queryClientPresent: !!queryClient,
      apiUrl: Config.apiUrl,
      enableWebSocket: Config.enableWebSocket
    });
  }

  // Connect to WebSocket
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!this.token) {
      logError('Cannot connect to WebSocket: No auth token available');
      return;
    }

    this.isConnecting = true;

    try {
      // Convert HTTP API URL to WebSocket URL using the same host and port from config
      const apiUrl = Config.apiUrl; // e.g., 'http://localhost:8001'
      const wsUrl = apiUrl.replace(/^https?:\/\//, 'ws://') + '/ws/chat';
      log('Connecting to WebSocket', { url: wsUrl, attempt: this.reconnectAttempts + 1 });

      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketListeners();
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          log('WebSocket connection timeout');
          this.ws.close();
          this.isConnecting = false;
          this.scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      // Clear timeout if connection succeeds or fails
      this.ws.addEventListener('open', () => clearTimeout(connectionTimeout));
      this.ws.addEventListener('error', () => clearTimeout(connectionTimeout));
      
    } catch (error) {
      logError('Failed to create WebSocket connection', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    log('Disconnecting WebSocket');
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.isServerReady = false; // Reset server ready state on disconnect
    
    if (this.ws) {
      // Set a flag to prevent reconnection on normal disconnect
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.currentChatId = null;
  }

  // Join a specific chat room
  joinChat(chatId: string): void {
    this.currentChatId = chatId;
    
    // If WebSocket is connected and server is ready, send auth with chatId
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isServerReady) {
      const authMessage = {
        jwt_token: this.token,
        chatId: chatId
      };
      this.ws.send(JSON.stringify(authMessage));
      log('Sent auth with chatId for chat join', { chatId });
    } else {
      // If not ready, connect with this chatId
      log('WebSocket not ready, connecting with chatId', { chatId, isServerReady: this.isServerReady });
      this.connect();
    }
  }

  // Leave current chat room
  leaveChat(): void {
    if (this.currentChatId) {
      log('Left chat', { chatId: this.currentChatId });
      this.currentChatId = null;
      this.isServerReady = false; // Reset server ready state when leaving chat
    }
  }

  // Send a simple message (matching vanilla JS format)
  sendSimpleMessage(message: string): void {
    if (!this.isServerReady) {
      logError('Cannot send message: Server not ready (no welcome message received)');
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Include chat ID in the message so backend can associate responses correctly
      const payload = {
        message: message,
        chatId: this.currentChatId || 'default'
      };
      
      this.ws.send(JSON.stringify(payload));
      log('Simple message sent via WebSocket', { 
        messagePreview: message.substring(0, 50),
        chatId: this.currentChatId,
        payload: payload
      });
    } else {
      logError('Cannot send message: WebSocket not connected');
    }
  }

  // Send a message through WebSocket (legacy complex format, keeping for compatibility)
  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      log('Message sent via WebSocket', { type: message.type, chatId: message.chatId });
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      log('Message queued (WebSocket not connected)', { type: message.type });
    }
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      payload: { isTyping },
      chatId
    });
  }

  // Add event listener
  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // Remove event listener
  removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // Get connection status
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.ws) {
      switch (this.ws.readyState) {
        case WebSocket.OPEN:
          return this.isServerReady ? 'connected' : 'connecting'; // Only "connected" when server is ready
        case WebSocket.CONNECTING:
          return 'connecting';
        case WebSocket.CLOSED:
        case WebSocket.CLOSING:
          return 'disconnected';
        default:
          return 'error';
      }
    }
    return 'disconnected';
  }

  // Check if ready to send messages
  isReadyToSend(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isServerReady;
  }

  private setupWebSocketListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      log('WebSocket connected, waiting for server welcome message');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.isServerReady = false; // Reset ready state on new connection
      
      // Send authentication token with chatId after connection
      if (this.token) {
        const authMessage = {
          jwt_token: this.token,
          chatId: this.currentChatId || 'default'
        };
        this.ws!.send(JSON.stringify(authMessage));
        log('Authentication token and chatId sent', { chatId: this.currentChatId });
      }
      
      // Don't emit 'connected' yet - wait for welcome message
    };

    this.ws.onmessage = (event) => {
      try {
        log('WebSocket raw message received', { 
          data: event.data, 
          dataType: typeof event.data,
          currentChatId: this.currentChatId,
          isServerReady: this.isServerReady
        });
        
        const data = JSON.parse(event.data);
        
        // Check for welcome message first - it comes in the reply array
        const messageText = data?.reply?.[0] || '';
        const isWelcomeMessage = messageText && (
          messageText.includes('Connected to chat') || 
          messageText.includes('connected') || 
          messageText.includes('welcome') ||
          messageText.includes('ready')
        );
        
        if (isWelcomeMessage) {
          log('Server welcome message detected', { 
            message: messageText,
            chatId: data.chatId,
            fullData: data
          });
          this.isServerReady = true;
          
          // Update chatId from server response
          if (data.chatId) {
            log('Server provided chatId', { 
              oldChatId: this.currentChatId, 
              newChatId: data.chatId 
            });
            this.currentChatId = data.chatId;
          }
          
          // Now emit connected event with server ready status
          this.emit('connected', { 
            timestamp: new Date().toISOString(),
            isServerReady: true,
            chatId: this.currentChatId
          });
          
          // Send queued messages now that server is ready
          this.flushMessageQueue();
          return;
        }
        
        // Handle regular AI responses: { reply: ["response"], error?: boolean }
        if (data && (data.reply || data.error)) {
          let messageContent = "";
          
          if (data.error && data.reply && Array.isArray(data.reply) && data.reply.length > 0) {
            messageContent = `Error: ${data.reply[0]}`;
            this.emit('error', { message: messageContent });
          } else if (data.reply && Array.isArray(data.reply) && data.reply.length > 0) {
            messageContent = data.reply[0];
            
            // Get the chat ID from the response first, then fall back to URL/current chat ID
            let activeChatId = data.chatId || this.currentChatId;
            
            // If still no chat ID, try to get it from the current URL
            if (!activeChatId && typeof window !== 'undefined' && window.location.search) {
              const urlParams = new URLSearchParams(window.location.search);
              const urlChatId = urlParams.get('chatId');
              if (urlChatId) {
                activeChatId = urlChatId;
              }
            }
            
            // Final fallback to default
            if (!activeChatId) {
              activeChatId = 'default';
            }
            
            // Create a message object that matches our chat structure
            const message: ChatMessage = {
              id: Date.now().toString(),
              chatId: activeChatId,
              content: messageContent,
              sender: {
                id: 'assistant',
                name: 'AI Assistant',
                email: 'assistant@ai.com'
              },
              timestamp: new Date().toISOString(),
              type: 'assistant' as const
            };
            
            log('Processing AI response message', { 
              messageId: message.id,
              chatId: message.chatId,
              currentChatId: this.currentChatId,
              responseChatId: data.chatId,
              urlChatId: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('chatId') : null,
              contentPreview: messageContent.substring(0, 100)
            });
            
            this.handleIncomingMessage(message);
          } else {
            logError('Unrecognized response format', data);
          }
        } else {
          // Try to handle as our complex WebSocket message format (fallback)
          const message: WebSocketMessage = data;
          this.handleWebSocketMessage(message);
        }
      } catch (error) {
        logError('Failed to parse WebSocket message', error);
      }
    };

    this.ws.onclose = (event) => {
      log('WebSocket connection closed', { code: event.code, reason: event.reason });
      this.isConnecting = false;
      this.isServerReady = false; // Reset server ready state on close
      
      if (event.code !== 1000) { // Not a normal closure
        this.scheduleReconnect();
      }
      
      this.emit('disconnected', { code: event.code, reason: event.reason });
    };

    this.ws.onerror = (error) => {
      logError('WebSocket error occurred', { 
        error, 
        readyState: this.ws?.readyState,
        url: this.ws?.url,
        attempt: this.reconnectAttempts + 1,
        isConnecting: this.isConnecting
      });
      this.isConnecting = false;
      this.isServerReady = false; // Reset server ready state on error
      this.emit('error', { 
        message: 'WebSocket connection failed',
        originalError: error,
        attempt: this.reconnectAttempts + 1,
        url: this.ws?.url
      });
    };
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    log('WebSocket message received', { type: message.type, chatId: message.chatId });

    switch (message.type) {
      case 'message':
        this.handleIncomingMessage(message.payload as ChatMessage);
        break;
      
      case 'typing':
        this.handleTypingStatus(message.payload as TypingStatus);
        break;
      
      case 'user_joined':
      case 'user_left':
        this.handleUserPresence(message);
        break;
      
      case 'error':
        logError('WebSocket server error', message.payload);
        this.emit('error', message.payload);
        break;
      
      default:
        log('Unknown WebSocket message type', { type: message.type });
    }

    // Emit the raw message for custom handlers
    this.emit(message.type, message.payload);
  }

  private handleIncomingMessage(message: ChatMessage): void {
    if (!this.queryClient) return;

    log('Processing incoming WebSocket message', { messageId: message.id, chatId: message.chatId });

    // Update the specific chat cache with new message
    this.queryClient.setQueryData(['chat', message.chatId], (oldData: any) => {
      if (!oldData) {
        // If no chat data exists, create a basic chat structure
        return {
          id: message.chatId,
          title: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
          lastMessage: message.content,
          lastMessageTime: new Date(message.timestamp),
          messages: [{
            id: message.id,
            content: message.content,
            role: message.type, // Convert 'assistant' or 'user' type to role
            timestamp: new Date(message.timestamp),
            chatId: message.chatId,
          }],
          createdAt: new Date(),
        };
      }
      
      const messages = oldData.messages || [];
      
      // Avoid duplicates
      if (messages.some((msg: any) => msg.id === message.id)) {
        return oldData;
      }
      
      // Convert WebSocket message format to our Message interface
      const newMessage = {
        id: message.id,
        content: message.content,
        role: message.type, // 'assistant' or 'user'
        timestamp: new Date(message.timestamp),
        chatId: message.chatId,
      };
      
      return { 
        ...oldData, 
        messages: [...messages, newMessage],
        lastMessage: message.content,
        lastMessageTime: new Date(message.timestamp)
      };
    });

    // Update chat list to show latest message
    this.queryClient.setQueryData(['chats'], (oldData: any[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(chat => {
        if (chat.id === message.chatId) {
          return {
            ...chat,
            lastMessage: message.content,
            lastMessageTime: new Date(message.timestamp)
          };
        }
        return chat;
      });
    });
    
    log('Message added to cache', { messageId: message.id, chatId: message.chatId });
  }

  private handleTypingStatus(status: TypingStatus): void {
    // Update typing status in cache or emit event for UI
    this.emit('typing_update', status);
  }

  private handleUserPresence(message: WebSocketMessage): void {
    // Handle user join/leave events
    this.emit('presence_update', {
      type: message.type,
      ...message.payload
    });
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logError(`Error in WebSocket event listener for ${event}`, error);
        }
      });
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      log('Flushing message queue', { count: this.messageQueue.length });
      
      this.messageQueue.forEach(message => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
        }
      });
      
      this.messageQueue = [];
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logError('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached', { attempts: this.reconnectAttempts });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    log('Scheduling WebSocket reconnection', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    // Emit reconnect attempt event for UI tracking
    this.emit('reconnect_attempt', { attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }, delay);
  }

  private setupNetworkListeners(): void {
    // Listen for network changes (React Native specific)
    if (typeof window !== 'undefined' && 'addEventListener' in window) {
      window.addEventListener('online', () => {
        log('Network came online, attempting to reconnect WebSocket');
        this.connect();
      });

      window.addEventListener('offline', () => {
        log('Network went offline');
        this.emit('network_offline', {});
      });
    }
  }
}

// Create singleton instance
export const chatWebSocket = new ChatWebSocketService();

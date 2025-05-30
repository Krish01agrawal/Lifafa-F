import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Chat, chatApi } from '../services/chatApi';

// Query keys
export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (filters: string) => [...chatKeys.lists(), { filters }] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
};

// Get all chats
export const useChats = (): { data: Chat[], isLoading: boolean, error: any } => {
  return useQuery({
    queryKey: chatKeys.lists(),
    queryFn: () => chatApi.getChats(),
  }) as { data: Chat[], isLoading: boolean, error: any };
};

// Get a specific chat
export const useChat = (chatId: string) => {
  return useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => chatApi.getChat(chatId),
    enabled: !!chatId,
  });
};

// Create a new chat
export const useCreateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApi.createChat,
    onSuccess: (newChat) => {
      // Update the chats list
      queryClient.setQueryData(chatKeys.lists(), (oldChats: Chat[] = []) => {
        return [newChat, ...oldChats];
      });
      
      // Set the new chat data
      queryClient.setQueryData(chatKeys.detail(newChat.id), newChat);
    },
  });
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      chatApi.sendMessage(chatId, content),
    onSuccess: (message, { chatId }) => {
      // Update the chat with the new message
      queryClient.setQueryData(chatKeys.detail(chatId), (oldChat: Chat | null) => {
        if (!oldChat) return null;
        return {
          ...oldChat,
          messages: [...oldChat.messages, message],
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
        };
      });

      // Update the chats list
      queryClient.setQueryData(chatKeys.lists(), (oldChats: Chat[] = []) => {
        return oldChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, lastMessage: message.content, lastMessageTime: message.timestamp }
            : chat
        ).sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      });
    },
  });
};

// Get AI response
export const useGetAIResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, userMessage }: { chatId: string; userMessage: string }) =>
      chatApi.getAIResponse(chatId, userMessage),
    onSuccess: (aiMessage, { chatId }) => {
      // Update the chat with the AI response
      queryClient.setQueryData(chatKeys.detail(chatId), (oldChat: Chat | null) => {
        if (!oldChat) return null;
        return {
          ...oldChat,
          messages: [...oldChat.messages, aiMessage],
          lastMessage: aiMessage.content,
          lastMessageTime: aiMessage.timestamp,
        };
      });

      // Update the chats list
      queryClient.setQueryData(chatKeys.lists(), (oldChats: Chat[] = []) => {
        return oldChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, lastMessage: aiMessage.content, lastMessageTime: aiMessage.timestamp }
            : chat
        ).sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      });
    },
  });
};

// Delete a chat
export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApi.deleteChat,
    onSuccess: (_, chatId) => {
      // Remove from chats list
      queryClient.setQueryData(chatKeys.lists(), (oldChats: Chat[] = []) => {
        return oldChats.filter(chat => chat.id !== chatId);
      });
      
      // Remove the chat detail
      queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
};

// Update chat title
export const useUpdateChatTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      chatApi.updateChatTitle(chatId, title),
    onSuccess: (updatedChat) => {
      // Update the chat detail
      queryClient.setQueryData(chatKeys.detail(updatedChat.id), updatedChat);
      
      // Update the chats list
      queryClient.setQueryData(chatKeys.lists(), (oldChats: Chat[] = []) => {
        return oldChats.map(chat => 
          chat.id === updatedChat.id ? updatedChat : chat
        );
      });
    },
  });
}; 
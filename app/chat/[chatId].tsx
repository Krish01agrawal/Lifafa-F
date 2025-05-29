import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ChatRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  useEffect(() => {
    // Redirect to main chat interface with chatId parameter
    if (chatId) {
      router.replace(`/?chatId=${chatId}`);
    } else {
      router.replace('/');
    }
  }, [chatId]);

  return null;
} 
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, Slot, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { ToastProvider, useToast } from '../components/ui/ToastContainer';
import { UserProfileProvider } from '../components/UserProfileProvider';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, authError, clearAuthError } = useAuth();
  const { showError } = useToast();
  const pathname = usePathname();

  // Handle auth errors with toast notifications
  useEffect(() => {
    if (authError) {
      let errorMessage = 'Authentication failed';
      
      // Parse common OAuth errors
      if (authError.includes('access_denied')) {
        errorMessage = 'Access denied. Please try again.';
      } else if (authError.includes('invalid_request')) {
        errorMessage = 'Invalid request. Please try again.';
      } else if (authError.includes('unauthorized_client')) {
        errorMessage = 'Unauthorized client. Please contact support.';
      } else if (authError.includes('unsupported_response_type')) {
        errorMessage = 'Unsupported response type. Please contact support.';
      } else if (authError.includes('invalid_scope')) {
        errorMessage = 'Invalid scope. Please contact support.';
      } else if (authError.includes('server_error')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (authError.includes('temporarily_unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else {
        errorMessage = `Authentication error: ${authError}`;
      }
      
      showError('Login Failed', errorMessage);
      clearAuthError();
    }
  }, [authError, showError, clearAuthError]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Only redirect to auth if user is not authenticated
        router.replace('/(auth)' as any);
      }
      // If authenticated, let the user stay on their current route
      // No need to redirect to home - let them access whatever route they're on
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Only render children if authenticated, otherwise let the redirect happen
  if (!isAuthenticated) {
    return null;
  }

  return (
    <UserProfileProvider>
      {children}
    </UserProfileProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={DarkTheme}>
            <AuthGuard>
              <Slot />
            </AuthGuard>
            <StatusBar style="light" />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

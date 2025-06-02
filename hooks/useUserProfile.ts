import { useQuery, useQueryClient } from '@tanstack/react-query';
import { log, logError } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';

// Extended user profile interface to match the API response
export interface FullUserProfile {
  _id: string;
  user_id: string;
  email: string;
  name: string;
  picture: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  initial_gmailData_sync: boolean;
}

// Query key factory for user-related queries
export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

// Get the correct API URL for the /me endpoint
const getApiUrl = (endpoint: string = '') => {
  // Use port 8001 as shown in the curl example
  const baseUrl = 'http://localhost:8001';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Fetch user profile from /me endpoint
const fetchUserProfile = async (token: string): Promise<FullUserProfile> => {
  try {
    log('Fetching user profile from /me endpoint...');
    
    const response = await fetch(getApiUrl('/me'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    log('User profile fetched successfully:', { 
      email: data.email, 
      name: data.name,
      userId: data.user_id 
    });
    
    return data;
  } catch (error) {
    logError('Error fetching user profile:', error);
    throw error;
  }
};

// Hook to fetch and cache user profile
export const useUserProfile = () => {
  const { token, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => fetchUserProfile(token!),
    enabled: isAuthenticated && !!token, // Only run if user is authenticated and has token
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true, // Refetch when user returns to the app
    refetchOnMount: true, // Always refetch on component mount
  });
};

// Hook to prefetch user profile (useful for preloading)
export const usePrefetchUserProfile = () => {
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();

  const prefetchUserProfile = () => {
    if (isAuthenticated && token) {
      queryClient.prefetchQuery({
        queryKey: userKeys.profile(),
        queryFn: () => fetchUserProfile(token),
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    }
  };

  return { prefetchUserProfile };
};

// Hook to invalidate user profile cache (useful after updates)
export const useInvalidateUserProfile = () => {
  const queryClient = useQueryClient();

  const invalidateUserProfile = () => {
    queryClient.invalidateQueries({
      queryKey: userKeys.profile(),
    });
  };

  return { invalidateUserProfile };
}; 
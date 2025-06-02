import React, { useEffect } from 'react';
import { log, logError } from '../constants/Config';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const { 
    data: userProfile, 
    error, 
    isLoading, 
    isError,
    refetch 
  } = useUserProfile();

  // Log user profile data when it's fetched
  useEffect(() => {
    if (userProfile) {
      log('User profile loaded from TanStack Query:', {
        email: userProfile.email,
        name: userProfile.name,
        userId: userProfile.user_id,
        hasGmailToken: !!userProfile.access_token,
        initialSync: userProfile.initial_gmailData_sync
      });
    }
  }, [userProfile]);

  // Handle errors
  useEffect(() => {
    if (isError && error) {
      logError('Failed to fetch user profile:', error);
    }
  }, [isError, error]);

  // Refetch on authentication state changes - remove aggressive refetching
  // useEffect(() => {
  //   if (isAuthenticated && token) {
  //     log('Authentication detected, ensuring user profile is fresh...');
  //     refetch();
  //   }
  // }, [isAuthenticated, token, refetch]);

  // This component doesn't render anything, it just manages user profile fetching
  return <>{children}</>;
}; 
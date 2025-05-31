import { getApiUrl, log, logError } from '../constants/Config';
import { UserProfile } from '../contexts/AuthContext';

export interface GoogleLoginResponse {
  token: string;
  user: UserProfile;
}

export interface GmailAuthData {
  gmail_token: string;
}

class AuthApiService {
  // Initiate Google login by redirecting to the backend auth endpoint
  initiateGoogleLogin(): void {
    try {
      log('Initiating Google login redirect...');
      const loginUrl = getApiUrl('/auth/login');
      
      // For web, redirect directly
      if (typeof window !== 'undefined') {
        window.location.href = loginUrl;
      } else {
        // For mobile, you'd typically use expo-auth-session or similar
        logError('Mobile OAuth redirect not implemented yet');
        throw new Error('Mobile OAuth not implemented yet');
      }
    } catch (error) {
      logError('Error initiating Google login', error);
      throw error;
    }
  }

  // Parse OAuth callback parameters from URL
  parseOAuthCallback(): GoogleLoginResponse | { error: string } | null {
    try {
      if (typeof window === 'undefined') {
        log('parseOAuthCallback: Not in browser environment');
        return null;
      }

      log('parseOAuthCallback: Checking URL parameters...', {
        currentUrl: window.location.href,
        search: window.location.search
      });

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      const error = urlParams.get('error');

      log('parseOAuthCallback: Extracted parameters', {
        tokenPresent: !!token,
        tokenValue: token ? 'PRESENT' : 'NULL',
        userPresent: !!userParam,
        userValue: userParam ? userParam : 'NULL',
        errorPresent: !!error,
        errorValue: error ? error : 'NULL'
      });

      // Check for error first
      if (error) {
        log('parseOAuthCallback: Error detected in URL parameters', { error });
        
        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, document.title, url.toString());
        
        return { error };
      }

      if (!token || !userParam) {
        log('parseOAuthCallback: Missing required parameters, not an OAuth callback');
        return null;
      }

      // Try to parse user data - handle different formats
      let user: UserProfile;
      try {
        // Try parsing as JSON first
        user = JSON.parse(decodeURIComponent(userParam)) as UserProfile;
        log('parseOAuthCallback: Successfully parsed user as JSON', { 
          email: user.email,
          name: user.name 
        });
      } catch (jsonError) {
        // If JSON parsing fails, try to construct user object from simple string
        log('parseOAuthCallback: JSON parsing failed, attempting fallback user construction');
        
        // Check if it's a simple email or name
        const userString = decodeURIComponent(userParam);
        if (userString.includes('@')) {
          // Looks like an email
          user = {
            id: userString,
            email: userString,
            name: userString.split('@')[0],
            avatar: undefined
          };
          log('parseOAuthCallback: Created user from email string', { email: user.email });
        } else {
          // Treat as name
          user = {
            id: userString,
            email: `${userString}@example.com`, // Fallback email
            name: userString,
            avatar: undefined
          };
          log('parseOAuthCallback: Created user from name string', { name: user.name });
        }
      }
      
      log('parseOAuthCallback: Successfully parsed OAuth callback', { 
        userId: user.email,
        tokenPresent: !!token 
      });

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('user');
      window.history.replaceState({}, document.title, url.toString());
      
      log('parseOAuthCallback: Cleaned up URL parameters', {
        newUrl: url.toString()
      });

      return { token, user };
    } catch (error) {
      logError('parseOAuthCallback: Error parsing OAuth callback', error);
      return null;
    }
  }

  // Legacy method for direct API calls (keeping for backward compatibility)
  async googleLogin(): Promise<GoogleLoginResponse> {
    try {
      log('Attempting direct Google login API call...');
      
      const response = await fetch(getApiUrl('/auth/google-login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Google login failed: ${response.statusText}`);
      }

      const data = await response.json();
      log('Google login successful', { userId: data.user?.email });
      return data;
    } catch (error) {
      logError('Google login error', error);
      throw error;
    }
  }

  async fetchGmailData(gmailToken: string): Promise<void> {
    try {
      log('Fetching Gmail data...');
      
      const response = await fetch(getApiUrl('/gmail/fetch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gmail_token: gmailToken }),
      });

      if (!response.ok) {
        throw new Error(`Gmail fetch failed: ${response.statusText}`);
      }

      log('Gmail data fetch completed successfully');
    } catch (error) {
      logError('Gmail fetch error', error);
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      log('Logging out user...');
      
      const response = await fetch(getApiUrl('/logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.statusText}`);
      }

      log('Logout successful');
    } catch (error) {
      logError('Logout error', error);
      throw error;
    }
  }
}

export const authApi = new AuthApiService(); 
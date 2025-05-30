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
  parseOAuthCallback(): GoogleLoginResponse | null {
    try {
      if (typeof window === 'undefined') {
        log('Not in web environment, skipping URL param parsing');
        return null;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userJson = urlParams.get('user');

      if (!token || !userJson) {
        log('No token or user found in URL parameters');
        return null;
      }

      const user = JSON.parse(decodeURIComponent(userJson)) as UserProfile;
      
      log('Successfully parsed OAuth callback', { 
        userId: user.email,
        tokenLength: token.length 
      });

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('user');
      window.history.replaceState({}, document.title, url.toString());

      return { token, user };
    } catch (error) {
      logError('Error parsing OAuth callback', error);
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
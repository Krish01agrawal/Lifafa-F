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
  async googleLogin(): Promise<GoogleLoginResponse> {
    try {
      log('Attempting Google login...');
      
      const response = await fetch(getApiUrl('/auth/google-login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // No params needed according to the API spec
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
      // This endpoint stores data in MongoDB and mem0, no return data needed
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
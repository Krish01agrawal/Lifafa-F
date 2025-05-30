import { UserProfile } from '../contexts/AuthContext';

// You'll need to replace this with your actual backend URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
      const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
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
      return data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async fetchGmailData(gmailToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/gmail/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gmail_token: gmailToken }),
      });

      if (!response.ok) {
        throw new Error(`Gmail fetch failed: ${response.statusText}`);
      }

      // This endpoint stores data in MongoDB and mem0, no return data needed
    } catch (error) {
      console.error('Gmail fetch error:', error);
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

export const authApi = new AuthApiService(); 
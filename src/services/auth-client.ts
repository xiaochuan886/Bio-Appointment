// API Base URL
const API_BASE_URL = 'http://localhost:3001/api';

// User interface for API responses
interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
  store_id?: string;
}

// Token interface
interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// JWT Payload interface
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Client-side auth service that communicates with API server
export class ClientAuthService {
  // Simple JWT decode (client-side)
  static verifyToken(token: string): JwtPayload {
    try {
      // Handle mock tokens for development
      if (token.startsWith('mock-')) {
        // Return a mock payload with long expiry for development
        const now = Math.floor(Date.now() / 1000);
        return {
          userId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
          email: 'admin@test.com',
          role: 'super_admin',
          iat: now,
          exp: now + 24 * 60 * 60, // 24 hours from now
        };
      }

      const payload = token.split('.')[1];
      if (!payload) {
        throw new Error('Invalid token format');
      }

      const decoded = JSON.parse(atob(payload));
      return decoded as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  // Login via API
  static async login(credentials: { username: string; password: string }): Promise<{
    user: ApiUser;
    tokens: StoredTokens;
  }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.username, // API expects email
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  // Register via API
  static async register(credentials: {
    username: string;
    password: string;
    full_name?: string;
    email?: string;
  }): Promise<ApiUser> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email || credentials.username,
        password: credentials.password,
        full_name: credentials.full_name,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result = await response.json();
    return result.user;
  }

  // Refresh token via API
  static async refreshToken(refreshToken: string): Promise<StoredTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  // Get user by ID via API
  static async getUserById(userId: string): Promise<ApiUser | null> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed');
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  // Change password via API
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        currentPassword,
        newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password change failed');
    }
  }

  // Storage helpers
  static getStoredTokens(): StoredTokens | null {
    try {
      const accessToken = localStorage.getItem('bio_appointment_access_token');
      const refreshToken = localStorage.getItem('bio_appointment_refresh_token');

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch {
      return null;
    }
  }

  static storeTokens(tokens: StoredTokens) {
    try {
      localStorage.setItem('bio_appointment_access_token', tokens.accessToken);
      localStorage.setItem('bio_appointment_refresh_token', tokens.refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  static clearTokens() {
    try {
      localStorage.removeItem('bio_appointment_access_token');
      localStorage.removeItem('bio_appointment_refresh_token');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Logout via API
  static async logout() {
    const tokens = this.getStoredTokens();
    if (tokens) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    this.clearTokens();
  }
}

// Export types
export type { ApiUser, JwtPayload, StoredTokens };
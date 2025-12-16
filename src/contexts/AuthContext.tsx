import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ClientAuthService, type JwtPayload, type ApiUser } from '@/services/auth-client';

// JWT Token interface
interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// User interface for local auth
interface AuthUser {
  id: string;
  email?: string;
  profile: ApiUser | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: ApiUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (credentials: {
    username: string;
    password: string;
    full_name?: string;
    email?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const ACCESS_TOKEN_KEY = 'bio_appointment_access_token';
const REFRESH_TOKEN_KEY = 'bio_appointment_refresh_token';

// Token management functions
const getStoredTokens = (): StoredTokens | null => {
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  } catch {
    return null;
  }
};

const storeTokens = (tokens: StoredTokens) => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
};

const clearTokens = () => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      const tokens = ClientAuthService.getStoredTokens();
      if (tokens) {
        // Try to refresh the user session using stored tokens
        try {
          const decoded = ClientAuthService.verifyToken(tokens.accessToken);
          console.log('🔍 [DEBUG] AuthContext - Token解码结果:', decoded);
          
          const userProfile = await ClientAuthService.getUserById(decoded.userId);
          console.log('🔍 [DEBUG] AuthContext - 获取的用户资料:', userProfile);
  
          if (userProfile) {
            const authUser: AuthUser = {
              id: userProfile.id,
              email: userProfile.email,
              profile: userProfile,
            };
            console.log('🔍 [DEBUG] AuthContext - 设置用户状态:', {
              authUser: {
                id: authUser.id,
                email: authUser.email,
                hasProfile: !!authUser.profile,
                store_id: authUser.profile?.store_id
              }
            });
            setUser(authUser);
            setProfile(userProfile);
          } else {
            // User not found, clear invalid tokens
            console.log('🔍 [DEBUG] AuthContext - 用户未找到，清除token');
            ClientAuthService.clearTokens();
          }
        } catch (tokenError) {
          // Access token is invalid, try refresh
          try {
            // Check if refresh token exists before trying to refresh
            if (!tokens.refreshToken || tokens.refreshToken === 'undefined') {
              ClientAuthService.clearTokens();
              return;
            }

            const newTokens = await ClientAuthService.refreshToken(tokens.refreshToken);
            ClientAuthService.storeTokens(newTokens);

            const decoded = ClientAuthService.verifyToken(newTokens.accessToken);
            const userProfile = await ClientAuthService.getUserById(decoded.userId);

            if (userProfile) {
              const authUser: AuthUser = {
                id: userProfile.id,
                email: userProfile.email,
                profile: userProfile,
              };
              setUser(authUser);
              setProfile(userProfile);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens
            console.log('Token refresh failed:', refreshError);
            ClientAuthService.clearTokens();
          }
        }
      }
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      ClientAuthService.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      const userProfile = await ClientAuthService.getUserById(user.id);
      if (userProfile) {
        setProfile(userProfile);
        setUser(prev => prev ? { ...prev, profile: userProfile } : null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const result = await ClientAuthService.login({ username, password });

      const authUser: AuthUser = {
        id: result.user.id,
        email: result.user.email,
        profile: result.user,
      };

      setUser(authUser);
      setProfile(result.user);
      ClientAuthService.storeTokens(result.tokens);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败'
      };
    }
  };

  const logout = async () => {
    try {
      // Clear stored tokens
      ClientAuthService.clearTokens();

      // Clear user state
      setUser(null);
      setProfile(null);

      // Call backend logout
      await ClientAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (credentials: {
    username: string;
    password: string;
    full_name?: string;
    email?: string;
  }) => {
    try {
      const newUser = await ClientAuthService.register(credentials);

      // Auto-login after registration
      const loginResult = await login(credentials.username, credentials.password);
      return loginResult;
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '注册失败'
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) {
      return { success: false, error: '用户未登录' };
    }

    try {
      await ClientAuthService.changePassword(user.id, currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '密码修改失败'
      };
    }
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiry = () => {
      const tokens = ClientAuthService.getStoredTokens();
      if (!tokens) return;

      try {
        // For mock tokens, skip expiry checking during development
        if (tokens.accessToken.startsWith('mock-')) {
          return; // Mock tokens don't expire in development
        }

        const decoded = ClientAuthService.verifyToken(tokens.accessToken);
        const now = Date.now() / 1000;
        const timeUntilExpiry = (decoded.exp || 0) - now;

        // Refresh token 5 minutes before expiry
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          ClientAuthService.refreshToken(tokens.refreshToken)
            .then(newTokens => {
              ClientAuthService.storeTokens(newTokens);
            })
            .catch(error => {
              console.error('Token refresh failed:', error);
              logout();
            });
        } else if (timeUntilExpiry <= 0) {
          // Token has expired
          console.log('Token expired, logging out');
          logout();
        }
      } catch (error) {
        // Token is invalid or expired
        console.log('Token validation failed:', error);
        logout();
      }
    };

    // Check token expiry every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [user]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'super_admin',
    login,
    logout,
    register,
    refreshUser,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

// Export auth utilities for use in other components
export { ClientAuthService };
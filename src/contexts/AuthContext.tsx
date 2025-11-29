import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types/types';
import { getCurrentUser, onAuthStateChange } from '@/db/api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser.user);
        setProfile(currentUser.profile);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // 添加超时保护，防止无限加载
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('认证初始化超时，停止加载');
        setLoading(false);
      }
    }, 5000); // 5秒超时

    // 初始化时获取当前用户
    refreshUser()
      .catch((error) => {
        console.error('初始化用户失败:', error);
      })
      .finally(() => {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    // 监听认证状态变化
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'super_admin',
    refreshUser,
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

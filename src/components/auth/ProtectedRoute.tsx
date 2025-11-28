import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, profile, loading } = useAuth();

  // 加载中显示加载动画
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 检查角色权限
  if (requiredRole && profile) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // 超级管理员拥有所有权限
    if (profile.role === 'super_admin') {
      return <>{children}</>;
    }
    
    // 检查用户角色是否在允许的角色列表中
    if (!roles.includes(profile.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

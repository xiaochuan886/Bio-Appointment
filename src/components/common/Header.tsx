import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, User, LogOut, Shield } from 'lucide-react';
import routes from '@/routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { logout } from '@/db/api';
import { toast } from 'sonner';
import { UserRole } from '@/types/types';

const roleLabels: Record<UserRole, string> = {
  super_admin: '超级管理员',
  sales: '销售',
  head_nurse: '护士长',
  nurse: '护士',
  doctor: '医生',
};

const roleColors: Record<UserRole, string> = {
  super_admin: 'bg-red-500',
  sales: 'bg-blue-500',
  head_nurse: 'bg-purple-500',
  nurse: 'bg-green-500',
  doctor: 'bg-orange-500',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  // 根据用户角色过滤可见的路由
  const getVisibleRoutes = () => {
    return routes.filter((route) => {
      if (!route.visible) return false;
      
      // 如果路由需要特定角色
      if (route.requiredRole && profile) {
        // 超级管理员可以访问所有路由
        if (profile.role === 'super_admin') return true;
        
        // 检查用户角色是否匹配
        const requiredRoles = Array.isArray(route.requiredRole) 
          ? route.requiredRole 
          : [route.requiredRole];
        
        return requiredRoles.includes(profile.role);
      }
      
      return true;
    });
  };

  const navigation = getVisibleRoutes();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('已退出登录');
      navigate('/login');
    } catch (error: any) {
      console.error('退出登录失败:', error);
      toast.error('退出登录失败');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">Bio-Appointment</span>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-6 ml-8">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {isAuthenticated && profile && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{profile.full_name || profile.username}</span>
                  <Badge className={`${roleColors[profile.role]} hidden md:inline-flex`}>
                    {roleLabels[profile.role]}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {profile.full_name || profile.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge className={roleColors[profile.role]}>
                        {roleLabels[profile.role]}
                      </Badge>
                    </div>
                    {profile.department && (
                      <p className="text-xs text-muted-foreground">
                        部门：{profile.department}
                      </p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Sheet>
            <SheetTrigger asChild className="xl:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-base font-medium transition-colors hover:text-primary ${
                      location.pathname === item.path
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {isAuthenticated && (
                  <>
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="justify-start text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

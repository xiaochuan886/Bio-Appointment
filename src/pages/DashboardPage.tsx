import { useEffect, useState } from 'react';
import { AlertCircle, Store as StoreIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import clientApi from '@/services/api-client';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ResourceBoard from '@/components/dashboard/ResourceBoard';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingSchedules: 0,
    urgentAppointments: 0,
    activeTasks: 0,
    totalStores: 0,
    activeStores: 0,
  });
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadStats();
    loadUserRole();
  }, []);

  const loadUserRole = () => {
    // 从localStorage或其他地方获取用户角色
    const profile = localStorage.getItem('user_profile');
    if (profile) {
      try {
        const parsedProfile = JSON.parse(profile);
        setUserRole(parsedProfile.role || '');
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
  };

  const loadStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 使用dashboard stats API获取统计数据
      const dashboardData = await clientApi.getDashboardStats(today);

      // 获取任务执行数据
      const tasks = await clientApi.getTaskExecutions({ status: 'in_progress' });

      // 获取门店数据（如果是管理员）
      let storeStats = { totalStores: 0, activeStores: 0 };
      if (userRole === 'super_admin' || userRole === 'admin') {
        try {
          const stores = await clientApi.getStores();
          storeStats = {
            totalStores: stores.length,
            activeStores: stores.filter(store => store.status === 'active').length,
          };
        } catch (error) {
          console.error('加载门店数据失败:', error);
        }
      }

      setStats({
        todayAppointments: parseInt(dashboardData.appointments.total) || 0,
        pendingSchedules: parseInt(dashboardData.schedules.today_schedules) || 0,
        urgentAppointments: 0, // 可以从appointments中计算
        activeTasks: tasks.length,
        ...storeStats,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">工作台</h1>
        <p className="text-muted-foreground">Bio-Appointment智能预约调度系统</p>
      </div>

      {/* 保留部分统计卡片 */}
      <div className={`grid gap-6 mb-8 ${userRole === 'super_admin' || userRole === 'admin' ? 'xl:grid-cols-6' : 'xl:grid-cols-4'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日预约</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待排班</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pending">{stats.pendingSchedules}</div>
            <p className="text-xs text-muted-foreground mt-1">等待护士长排班</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">急单</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-urgent">{stats.urgentAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">需要优先处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中任务</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-confirmed">{stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">正在执行的服务</p>
          </CardContent>
        </Card>

        {/* 管理员专属统计卡片 */}
        {(userRole === 'super_admin' || userRole === 'admin') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总门店数</CardTitle>
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.totalStores}</div>
                <p className="text-xs text-muted-foreground mt-1">系统中的所有门店</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">营业中</CardTitle>
                <StoreIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeStores}</div>
                <p className="text-xs text-muted-foreground mt-1">正在营业的门店</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 资源看板 - 替代快捷入口 */}
      <ResourceBoard />
    </div>
  );
}

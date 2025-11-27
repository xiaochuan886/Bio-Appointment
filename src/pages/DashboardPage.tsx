import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ClipboardList, Stethoscope, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAppointments, getSchedules, getTaskExecutions } from '@/db/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingSchedules: 0,
    urgentAppointments: 0,
    activeTasks: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [appointments, schedules, tasks] = await Promise.all([
        getAppointments({ date: today }),
        getAppointments({ status: 'pending' }),
        getTaskExecutions({ status: 'in_progress' }),
      ]);

      const urgentCount = appointments.filter(a => a.is_urgent).length;

      setStats({
        todayAppointments: appointments.length,
        pendingSchedules: schedules.length,
        urgentAppointments: urgentCount,
        activeTasks: tasks.length,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const quickActions = [
    {
      title: '预约发起',
      description: '创建新的预约申请',
      icon: Calendar,
      link: '/sales/appointment',
      color: 'text-primary',
    },
    {
      title: '智能排班',
      description: '管理和调度预约资源',
      icon: ClipboardList,
      link: '/head-nurse/schedule',
      color: 'text-secondary',
    },
    {
      title: '我的任务',
      description: '查看和执行分配的任务',
      icon: Users,
      link: '/nurse/tasks',
      color: 'text-confirmed',
    },
    {
      title: '预约待办',
      description: '处理医生预约确认',
      icon: Stethoscope,
      link: '/doctor/appointments',
      color: 'text-scheduled',
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">工作台</h1>
        <p className="text-muted-foreground">Bio-Appointment智能预约调度系统</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日预约</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-confirmed">{stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">正在执行的服务</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">快捷入口</h2>
        <div className="grid gap-6 xl:grid-cols-2">
          {quickActions.map((action) => (
            <Card key={action.link} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link to={action.link}>
                  <Button className="w-full">进入</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

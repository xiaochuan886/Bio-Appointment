import { Navigate } from 'react-router';
import type { ReactNode } from 'react';

// 销售端页面
import SalesAppointmentPage from '@/pages/sales/AppointmentPage';

// 护士长端页面
import HeadNurseSchedulePage from '@/pages/head-nurse/SchedulePage';

// 护士端页面
import NurseTaskPage from '@/pages/nurse/TaskPage';

// 医生端页面
import DoctorAppointmentPage from '@/pages/doctor/AppointmentPage';

// 管理端页面
import SystemConfigPage from '@/pages/admin/SystemConfigPage';

// 公共页面
import DashboardPage from '@/pages/DashboardPage';
import ColorSystemDemo from '@/pages/ColorSystemDemo';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '工作台',
    path: '/',
    element: <DashboardPage />,
    visible: true,
  },
  {
    name: '预约发起',
    path: '/sales/appointment',
    element: <SalesAppointmentPage />,
    visible: true,
  },
  {
    name: '智能排班',
    path: '/head-nurse/schedule',
    element: <HeadNurseSchedulePage />,
    visible: true,
  },
  {
    name: '我的任务',
    path: '/nurse/tasks',
    element: <NurseTaskPage />,
    visible: true,
  },
  {
    name: '预约待办',
    path: '/doctor/appointments',
    element: <DoctorAppointmentPage />,
    visible: true,
  },
  {
    name: '系统配置',
    path: '/admin/config',
    element: <SystemConfigPage />,
    visible: true,
  },
  {
    name: '颜色系统',
    path: '/color-system',
    element: <ColorSystemDemo />,
    visible: true,
  },
  {
    name: 'Not Found',
    path: '*',
    element: <Navigate to="/" replace />,
    visible: false,
  },
];

export default routes;
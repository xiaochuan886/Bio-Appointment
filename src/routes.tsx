import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { UserRole } from '@/types/types';

// 认证页面
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';

// 销售端页面
import SalesAppointmentPage from '@/pages/sales/AppointmentPage';

// 护士长端页面
import HeadNurseSchedulePage from '@/pages/head-nurse/SchedulePage';
import NurseLeaveManagementPage from '@/pages/head-nurse/NurseLeaveManagementPage';

// 护士端页面
import NurseTaskPage from '@/pages/nurse/TaskPage';
import NurseSchedulePage from '@/pages/nurse/SchedulePage';
import NurseHistoryPage from '@/pages/nurse/HistoryPage';

// 医生端页面
import DoctorAppointmentPage from '@/pages/doctor/AppointmentPage';

// 管理端页面
import SystemConfigPage from '@/pages/admin/SystemConfigPage';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import StoreManagementPage from '@/pages/admin/StoreManagementPage';

// 公共页面
import DashboardPage from '@/pages/DashboardPage';
import ColorSystemDemo from '@/pages/ColorSystemDemo';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  requireAuth?: boolean;
  requiredRole?: UserRole | UserRole[];
}

const routes: RouteConfig[] = [
  // 认证路由（不需要登录）
  {
    name: '登录',
    path: '/login',
    element: <LoginPage />,
    visible: false,
    requireAuth: false,
  },
  {
    name: '注册',
    path: '/register',
    element: <RegisterPage />,
    visible: false,
    requireAuth: false,
  },
  {
    name: '未授权',
    path: '/unauthorized',
    element: <UnauthorizedPage />,
    visible: false,
    requireAuth: false,
  },

  // 需要登录的路由
  {
    name: '工作台',
    path: '/',
    element: <DashboardPage />,
    visible: true,
    requireAuth: true,
  },
  {
    name: '预约发起',
    path: '/sales/appointment',
    element: <SalesAppointmentPage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['sales', 'super_admin'],
  },
  {
    name: '智能排班',
    path: '/head-nurse/schedule',
    element: <HeadNurseSchedulePage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['head_nurse', 'super_admin'],
  },
  {
    name: '休假管理',
    path: '/head-nurse/leaves',
    element: <NurseLeaveManagementPage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['head_nurse', 'super_admin'],
  },
  {
    name: '我的任务',
    path: '/nurse/tasks',
    element: <NurseTaskPage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['nurse', 'head_nurse', 'super_admin'],
  },
  {
    name: '我的排班',
    path: '/nurse/schedule',
    element: <NurseSchedulePage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['nurse', 'head_nurse', 'super_admin'],
  },
  {
    name: '任务历史',
    path: '/nurse/history',
    element: <NurseHistoryPage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['nurse', 'head_nurse', 'super_admin'],
  },
  {
    name: '预约待办',
    path: '/doctor/appointments',
    element: <DoctorAppointmentPage />,
    visible: true,
    requireAuth: true,
    requiredRole: ['doctor', 'super_admin'],
  },
  {
    name: '用户管理',
    path: '/admin/users',
    element: <UserManagementPage />,
    visible: true,
    requireAuth: true,
    requiredRole: 'super_admin',
  },
  {
    name: '门店管理',
    path: '/admin/stores',
    element: <StoreManagementPage />,
    visible: true,
    requireAuth: true,
    requiredRole: 'super_admin',
  },
  {
    name: '系统配置',
    path: '/admin/config',
    element: <SystemConfigPage />,
    visible: true,
    requireAuth: true,
    requiredRole: 'super_admin',
  },
  {
    name: '颜色系统',
    path: '/color-system',
    element: <ColorSystemDemo />,
    visible: false,
    requireAuth: false,
  },
  {
    name: 'Not Found',
    path: '*',
    element: <Navigate to="/" replace />,
    visible: false,
    requireAuth: false,
  },
];

export default routes;
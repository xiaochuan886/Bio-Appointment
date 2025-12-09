import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Edit, Ban, CheckCircle, Trash2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, updateUserEmail } from '@/db/api';
import { Profile, UserRole, CreateUserInput, UpdateUserInput } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DingTalkSyncPanel from '@/components/dingtalk/DingTalkSyncPanel';
import clientApi from '@/services/api-client';

const roleLabels: Record<UserRole, string> = {
  super_admin: '超级管理员',
  sales: '销售/健康管理师',
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

// 创建用户表单验证
const createUserSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符'),
  full_name: z.string()
    .min(2, '姓名至少2个字符')
    .max(50, '姓名最多50个字符'),
  role: z.enum(['super_admin', 'sales', 'head_nurse', 'nurse', 'doctor']),
  department: z.string().optional(),
  store_id: z.string().optional(),
});

// 编辑用户表单验证
const editUserSchema = z.object({
  full_name: z.string()
    .min(2, '姓名至少2个字符')
    .max(50, '姓名最多50个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  role: z.enum(['super_admin', 'sales', 'head_nurse', 'nurse', 'doctor']),
  department: z.string().optional(),
  store_id: z.string().optional(),
});

// 重置密码表单验证
const resetPasswordSchema = z.object({
  new_password: z.string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: '两次输入的密码不一致',
  path: ['confirm_password'],
});

// 编辑邮箱表单验证
const editEmailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type EditEmailFormData = z.infer<typeof editEmailSchema>;

export default function UserManagementPage() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [editEmailDialogOpen, setEditEmailDialogOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<Profile | null>(null);
  const [editingEmailUser, setEditingEmailUser] = useState<Profile | null>(null);

  // 创建用户表单
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      full_name: '',
      role: 'sales',
      department: '',
      store_id: '',
    },
  });

  // 编辑用户表单
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: '',
      role: 'sales',
      department: '',
      store_id: '',
    },
  });

  // 重置密码表单
  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  // 编辑邮箱表单
  const editEmailForm = useForm<EditEmailFormData>({
    resolver: zodResolver(editEmailSchema),
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    loadUsers();
    loadStores();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据门店过滤用户
  const filteredUsers = users.filter(user => {
    // 超级管理员可以查看所有用户
    if (currentProfile?.role === 'super_admin') {
      if (storeFilter === 'all') return true;
      return user.store_id === storeFilter;
    }
    
    // 销售可以查看所有用户（为了创建预约）
    if (currentProfile?.role === 'sales') {
      if (storeFilter === 'all') return true;
      return user.store_id === storeFilter;
    }
    
    // 护士长只能查看自己门店的用户
    if (currentProfile?.role === 'head_nurse') {
      const currentUserStoreId = users.find(u => u.id === currentProfile?.id)?.store_id;
      if (storeFilter === 'all') {
        return user.store_id === currentUserStoreId || user.store_id === null;
      }
      return user.store_id === storeFilter && user.store_id === currentUserStoreId;
    }
    
    // 其他角色只能查看自己
    if (user.id === currentProfile?.id) return true;
    
    return false;
  });

  const loadStores = async () => {
    try {
      const data = await clientApi.getStores();
      setStores(data);
    } catch (error: any) {
      console.error('加载门店列表失败:', error);
      toast.error('加载门店列表失败');
    }
  };

  // 创建用户
  const handleCreateUser = async (data: CreateUserFormData) => {
    try {
      // 验证护士和医生必须选择门店
      if ((data.role === 'nurse' || data.role === 'doctor' || data.role === 'head_nurse') && !data.store_id) {
        toast.error('护士、医生和护士长必须选择门店');
        return;
      }
      
      const input: CreateUserInput = {
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        role: data.role,
        department: data.department || undefined,
        store_id: data.store_id || undefined,
      };
      
      await createUser(input);
      toast.success('用户创建成功');
      setCreateDialogOpen(false);
      createForm.reset();
      await loadUsers();
    } catch (error: any) {
      console.error('创建用户失败:', error);
      toast.error(error.message || '创建用户失败');
    }
  };

  // 打开重置密码对话框
  const handleOpenResetPasswordDialog = (user: Profile) => {
    setResettingUser(user);
    resetPasswordForm.reset({
      new_password: '',
      confirm_password: '',
    });
    setResetPasswordDialogOpen(true);
  };

  // 重置用户密码
  const handleResetPassword = async (data: ResetPasswordFormData) => {
    if (!resettingUser) return;

    try {
      await resetUserPassword(resettingUser.id, data.new_password);
      toast.success('密码重置成功');
      setResetPasswordDialogOpen(false);
      setResettingUser(null);
      resetPasswordForm.reset();
    } catch (error: any) {
      console.error('重置密码失败:', error);
      toast.error(error.message || '重置密码失败');
    }
  };

  // 打开编辑邮箱对话框
  const handleOpenEditEmailDialog = (user: Profile) => {
    setEditingEmailUser(user);
    editEmailForm.reset({
      email: user.email || '',
    });
    setEditEmailDialogOpen(true);
  };

  // 更新用户邮箱
  const handleUpdateEmail = async (data: EditEmailFormData) => {
    if (!editingEmailUser) return;

    try {
      await updateUserEmail(editingEmailUser.id, data.email);
      toast.success('邮箱更新成功');
      setEditEmailDialogOpen(false);
      setEditingEmailUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('更新邮箱失败:', error);
      toast.error(error.message || '更新邮箱失败');
    }
  };

  // 打开编辑对话框
  const handleOpenEditDialog = (user: Profile) => {
    setEditingUser(user);
    editForm.reset({
      full_name: user.full_name || '',
      role: user.role,
      department: user.department || '',
      store_id: user.store_id || undefined,
    });
    setEditDialogOpen(true);
  };

  // 更新用户
  const handleUpdateUser = async (data: EditUserFormData) => {
    if (!editingUser) return;

    try {
      // 验证护士和医生必须选择门店
      if ((data.role === 'nurse' || data.role === 'doctor' || data.role === 'head_nurse') && !data.store_id) {
        toast.error('护士、医生和护士长必须选择门店');
        return;
      }
      
      const input: UpdateUserInput = {
        user_id: editingUser.id,
        full_name: data.full_name,
        role: data.role,
        department: data.department || undefined,
        store_id: data.store_id || undefined,
      };
      
      await updateUser(input);
      toast.success('用户信息更新成功');
      setEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('更新用户失败:', error);
      toast.error(error.message || '更新用户失败');
    }
  };

  // 打开删除确认对话框
  const handleOpenDeleteDialog = (user: Profile) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await deleteUser({ user_id: deletingUser.id });
      toast.success('用户已删除');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('删除用户失败:', error);
      toast.error(error.message || '删除用户失败');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            用户管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理系统用户和权限分配
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              创建用户
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
              <DialogDescription>
                填写用户信息创建新账号
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input placeholder="输入用户名（字母、数字、下划线）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="输入密码（至少6位）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>真实姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="输入真实姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // 当角色变化时，如果是护士、医生或护士长，且没有选择门店，则清空门店选择
                        if ((value === 'nurse' || value === 'doctor' || value === 'head_nurse') && !createForm.getValues('store_id')) {
                          // 这里可以添加提示，让用户知道需要选择门店
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="super_admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-red-500" />
                              超级管理员
                            </div>
                          </SelectItem>
                          <SelectItem value="sales">
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4 text-blue-500" />
                              销售/健康管理师
                            </div>
                          </SelectItem>
                          <SelectItem value="head_nurse">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-500" />
                              护士长
                            </div>
                          </SelectItem>
                          <SelectItem value="nurse">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              护士
                            </div>
                          </SelectItem>
                          <SelectItem value="doctor">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-orange-500" />
                              医生
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="store_id"
                  render={({ field }) => {
                    const currentRole = createForm.watch('role');
                    const isStoreRequired = currentRole === 'nurse' || currentRole === 'doctor' || currentRole === 'head_nurse';
                    
                    return (
                      <FormItem>
                        <FormLabel>
                          门店 {isStoreRequired && <span className="text-red-500">*</span>}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isStoreRequired ? "请选择门店" : "选择门店（可选）"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4" />
                                  {store.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {isStoreRequired && !field.value && (
                          <p className="text-sm text-red-500 mt-1">
                            护士、医生和护士长必须选择门店
                          </p>
                        )}
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={createForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部门（可选）</FormLabel>
                      <FormControl>
                        <Input placeholder="输入部门名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">创建</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            用户列表
          </TabsTrigger>
          <TabsTrigger value="dingtalk">
            <Shield className="w-4 h-4 mr-2" />
            钉钉同步
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>用户列表</CardTitle>
                  <CardDescription>
                    共 {filteredUsers.length} 个用户
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="store-filter" className="text-sm">门店筛选:</Label>
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger id="store-filter" className="w-48">
                      <SelectValue placeholder="选择门店" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部门店</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            {store.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无用户
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>真实姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>门店</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      {user.store_id ? (
                        (() => {
                          const store = stores.find(s => s.id === user.store_id);
                          return store ? store.name : '未知门店';
                        })()
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status === 'active' ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <Ban className="h-3 w-3 mr-1" />
                          禁用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(user)}
                          disabled={user.id === currentProfile?.id}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResetPasswordDialog(user)}
                          disabled={user.id === currentProfile?.id}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          重置密码
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditEmailDialog(user)}
                          disabled={user.id === currentProfile?.id}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          编辑邮箱
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(user)}
                          disabled={user.id === currentProfile?.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">角色权限说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-red-500 mt-1">超级管理员</Badge>
            <p className="text-sm text-muted-foreground">
              拥有所有权限，可以管理用户、分配角色、访问所有功能模块
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-500 mt-1">销售/健康管理师</Badge>
            <p className="text-sm text-muted-foreground">
              发起预约、查看自己创建的预约、跟进客户
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-purple-500 mt-1">护士长</Badge>
            <p className="text-sm text-muted-foreground">
              智能排班、资源分配、查看所有预约和排班、管理护士任务
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-green-500 mt-1">护士</Badge>
            <p className="text-sm text-muted-foreground">
              查看分配给自己的任务、执行护理任务、更新任务状态
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-orange-500 mt-1">医生</Badge>
            <p className="text-sm text-muted-foreground">
              预约握手、接受/拒绝/改期预约、查看分配给自己的预约
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="dingtalk" className="mt-6">
          <DingTalkSyncPanel onSyncComplete={loadUsers} />
        </TabsContent>
      </Tabs>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              修改用户 {editingUser?.username} 的信息
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>真实姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="输入真实姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // 当角色变化时，如果是护士、医生或护士长，且没有选择门店，则清空门店选择
                      if ((value === 'nurse' || value === 'doctor' || value === 'head_nurse') && !editForm.getValues('store_id')) {
                        // 这里可以添加提示，让用户知道需要选择门店
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择角色" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="super_admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-red-500" />
                            超级管理员
                          </div>
                        </SelectItem>
                        <SelectItem value="sales">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-blue-500" />
                            销售/健康管理师
                          </div>
                        </SelectItem>
                        <SelectItem value="head_nurse">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            护士长
                          </div>
                        </SelectItem>
                        <SelectItem value="nurse">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-500" />
                            护士
                          </div>
                        </SelectItem>
                        <SelectItem value="doctor">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-orange-500" />
                            医生
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="store_id"
                render={({ field }) => {
                  const currentRole = editForm.watch('role');
                  const isStoreRequired = currentRole === 'nurse' || currentRole === 'doctor' || currentRole === 'head_nurse';
                  
                  return (
                    <FormItem>
                      <FormLabel>
                        门店 {isStoreRequired && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isStoreRequired ? "请选择门店" : "选择门店（可选）"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4" />
                                {store.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {isStoreRequired && !field.value && (
                        <p className="text-sm text-red-500 mt-1">
                          护士、医生和护士长必须选择门店
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={editForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>部门（可选）</FormLabel>
                    <FormControl>
                      <Input placeholder="输入部门名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
            <DialogDescription>
              您确定要删除用户 <span className="font-semibold">{deletingUser?.username}</span> 吗？
              <br />
              此操作将禁用该用户账号，用户将无法登录系统。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>
              为用户 {resettingUser?.username} 重置密码
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="输入新密码（至少6位）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={resetPasswordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="再次输入新密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">重置密码</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 编辑邮箱对话框 */}
      <Dialog open={editEmailDialogOpen} onOpenChange={setEditEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑用户邮箱</DialogTitle>
            <DialogDescription>
              修改用户 {editingEmailUser?.username} 的邮箱地址
            </DialogDescription>
          </DialogHeader>
          <Form {...editEmailForm}>
            <form onSubmit={editEmailForm.handleSubmit(handleUpdateEmail)} className="space-y-4">
              <FormField
                control={editEmailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱地址</FormLabel>
                    <FormControl>
                      <Input placeholder="输入邮箱地址" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditEmailDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

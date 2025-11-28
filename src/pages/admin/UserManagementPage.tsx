import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Edit, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getAllUsers, updateUserRole, updateUserStatus } from '@/db/api';
import { Profile, UserRole, UserStatus } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

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

export default function UserManagementPage() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales');

  useEffect(() => {
    loadUsers();
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

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole({ user_id: userId, role });
      toast.success('角色更新成功');
      await loadUsers();
      setEditingUser(null);
    } catch (error: any) {
      console.error('更新角色失败:', error);
      toast.error('更新角色失败');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    try {
      await updateUserStatus({ user_id: userId, status: newStatus });
      toast.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`);
      await loadUsers();
    } catch (error: any) {
      console.error('更新状态失败:', error);
      toast.error('更新状态失败');
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            共 {users.length} 个用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无用户
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>真实姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
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
                        <Dialog
                          open={editingUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingUser(user);
                              setSelectedRole(user.role);
                            } else {
                              setEditingUser(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={user.id === currentProfile?.id}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              编辑角色
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>编辑用户角色</DialogTitle>
                              <DialogDescription>
                                修改用户 {user.username} 的系统角色
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">选择角色</label>
                                <Select
                                  value={selectedRole}
                                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
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
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingUser(null)}
                                >
                                  取消
                                </Button>
                                <Button
                                  onClick={() => handleUpdateRole(user.id, selectedRole)}
                                >
                                  保存
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant={user.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={user.id === currentProfile?.id}
                        >
                          {user.status === 'active' ? (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              禁用
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              启用
                            </>
                          )}
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
    </div>
  );
}

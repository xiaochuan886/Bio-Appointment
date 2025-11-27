import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { getNurses, createNurse, updateNurse, deleteNurse, getDoctors, createDoctor, updateDoctor, deleteDoctor, getRooms, createRoom, updateRoom, deleteRoom } from '@/db/api';
import type { Nurse, Doctor, Room } from '@/types/types';

// 护士表单Schema
const nurseSchema = z.object({
  name: z.string().min(1, '请输入护士姓名'),
  skill_level: z.enum(['junior', 'intermediate', 'senior'], {
    required_error: '请选择技能等级',
  }),
  is_available: z.boolean().default(true),
});

// 医生表单Schema
const doctorSchema = z.object({
  name: z.string().min(1, '请输入医生姓名'),
  specialty: z.string().min(1, '请输入专业领域'),
  is_available: z.boolean().default(true),
});

// 房间表单Schema
const roomSchema = z.object({
  name: z.string().min(1, '请输入房间名称'),
  room_type: z.enum(['vip', 'treatment', 'consultation'], {
    required_error: '请选择房间类型',
  }),
  is_available: z.boolean().default(true),
});

type NurseFormValues = z.infer<typeof nurseSchema>;
type DoctorFormValues = z.infer<typeof doctorSchema>;
type RoomFormValues = z.infer<typeof roomSchema>;

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState('nurses');
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 对话框状态
  const [nurseDialogOpen, setNurseDialogOpen] = useState(false);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  // 编辑状态
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // 表单
  const nurseForm = useForm<NurseFormValues>({
    resolver: zodResolver(nurseSchema),
    defaultValues: {
      name: '',
      skill_level: 'intermediate',
      is_available: true,
    },
  });

  const doctorForm = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      specialty: '',
      is_available: true,
    },
  });

  const roomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: '',
      room_type: 'treatment',
      is_available: true,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [nursesData, doctorsData, roomsData] = await Promise.all([
        getNurses(),
        getDoctors(),
        getRooms(),
      ]);
      setNurses(nursesData);
      setDoctors(doctorsData);
      setRooms(roomsData);
    } catch (error) {
      toast.error('加载数据失败');
    }
  };

  // ==================== 护士管理 ====================

  const handleAddNurse = () => {
    setEditingNurse(null);
    nurseForm.reset({
      name: '',
      skill_level: 'intermediate',
      is_available: true,
    });
    setNurseDialogOpen(true);
  };

  const handleEditNurse = (nurse: Nurse) => {
    setEditingNurse(nurse);
    nurseForm.reset({
      name: nurse.name,
      skill_level: nurse.skill_level,
      is_available: nurse.is_available,
    });
    setNurseDialogOpen(true);
  };

  const handleDeleteNurse = async (id: string) => {
    if (!confirm('确定要删除这位护士吗？')) return;

    try {
      await deleteNurse(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const onSubmitNurse = async (values: NurseFormValues) => {
    setIsLoading(true);
    try {
      if (editingNurse) {
        await updateNurse(editingNurse.id, values);
        toast.success('更新成功');
      } else {
        await createNurse(values as { name: string; skill_level: 'junior' | 'intermediate' | 'senior'; is_available: boolean });
        toast.success('添加成功');
      }
      setNurseDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 医生管理 ====================

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    doctorForm.reset({
      name: '',
      specialty: '',
      is_available: true,
    });
    setDoctorDialogOpen(true);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    doctorForm.reset({
      name: doctor.name,
      specialty: doctor.specialty,
      is_available: doctor.is_available,
    });
    setDoctorDialogOpen(true);
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('确定要删除这位医生吗？')) return;

    try {
      await deleteDoctor(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const onSubmitDoctor = async (values: DoctorFormValues) => {
    setIsLoading(true);
    try {
      if (editingDoctor) {
        await updateDoctor(editingDoctor.id, values);
        toast.success('更新成功');
      } else {
        await createDoctor(values as { name: string; specialty: string; is_available: boolean });
        toast.success('添加成功');
      }
      setDoctorDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 房间管理 ====================

  const handleAddRoom = () => {
    setEditingRoom(null);
    roomForm.reset({
      name: '',
      room_type: 'treatment',
      is_available: true,
    });
    setRoomDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    roomForm.reset({
      name: room.name,
      room_type: room.room_type,
      is_available: room.is_available,
    });
    setRoomDialogOpen(true);
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('确定要删除这个房间吗？')) return;

    try {
      await deleteRoom(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const onSubmitRoom = async (values: RoomFormValues) => {
    setIsLoading(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, values);
        toast.success('更新成功');
      } else {
        await createRoom(values as { name: string; room_type: 'vip' | 'treatment' | 'consultation'; is_available: boolean });
        toast.success('添加成功');
      }
      setRoomDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 辅助函数 ====================

  const getSkillLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      junior: '初级',
      intermediate: '中级',
      senior: '高级',
    };
    return labels[level] || level;
  };

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vip: 'VIP室',
      treatment: '治疗区',
      consultation: '咨询室',
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">系统配置</h1>
        <p className="text-muted-foreground">管理系统资源：护士、医生、房间</p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          提示：修改资源状态为"不可用"后，该资源将不会出现在预约和排班的选择列表中。
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nurses">护士管理</TabsTrigger>
          <TabsTrigger value="doctors">医生管理</TabsTrigger>
          <TabsTrigger value="rooms">房间管理</TabsTrigger>
        </TabsList>

        {/* ==================== 护士管理 ==================== */}
        <TabsContent value="nurses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>护士列表</CardTitle>
                  <CardDescription>管理护士资源和技能等级</CardDescription>
                </div>
                <Dialog open={nurseDialogOpen} onOpenChange={setNurseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddNurse}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加护士
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingNurse ? '编辑护士' : '添加护士'}</DialogTitle>
                      <DialogDescription>
                        填写护士信息，设置技能等级和可用状态
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...nurseForm}>
                      <form onSubmit={nurseForm.handleSubmit(onSubmitNurse)} className="space-y-4">
                        <FormField
                          control={nurseForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>姓名 *</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入护士姓名" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={nurseForm.control}
                          name="skill_level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>技能等级 *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择技能等级" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="junior">初级</SelectItem>
                                  <SelectItem value="intermediate">中级</SelectItem>
                                  <SelectItem value="senior">高级</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                技能等级影响可承接的服务类型
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={nurseForm.control}
                          name="is_available"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">可用状态</FormLabel>
                                <FormDescription>
                                  关闭后该护士将不会出现在排班选择中
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setNurseDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? '保存中...' : '保存'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>技能等级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nurses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        暂无护士数据，请点击"添加护士"按钮添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    nurses.map((nurse) => (
                      <TableRow key={nurse.id}>
                        <TableCell className="font-medium">{nurse.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getSkillLevelLabel(nurse.skill_level)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={nurse.is_available ? 'default' : 'secondary'}>
                            {nurse.is_available ? '可用' : '不可用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditNurse(nurse)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNurse(nurse.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 医生管理 ==================== */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>医生列表</CardTitle>
                  <CardDescription>管理医生资源和专业领域</CardDescription>
                </div>
                <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddDoctor}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加医生
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingDoctor ? '编辑医生' : '添加医生'}</DialogTitle>
                      <DialogDescription>
                        填写医生信息，设置专业领域和可用状态
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...doctorForm}>
                      <form onSubmit={doctorForm.handleSubmit(onSubmitDoctor)} className="space-y-4">
                        <FormField
                          control={doctorForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>姓名 *</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入医生姓名" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={doctorForm.control}
                          name="specialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>专业领域 *</FormLabel>
                              <FormControl>
                                <Input placeholder="例如：肿瘤科、心血管科" {...field} />
                              </FormControl>
                              <FormDescription>
                                医生的专业领域或擅长方向
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={doctorForm.control}
                          name="is_available"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">可用状态</FormLabel>
                                <FormDescription>
                                  关闭后该医生将不会出现在预约选择中
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setDoctorDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? '保存中...' : '保存'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>专业领域</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        暂无医生数据，请点击"添加医生"按钮添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell className="font-medium">{doctor.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doctor.specialty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doctor.is_available ? 'default' : 'secondary'}>
                            {doctor.is_available ? '可用' : '不可用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDoctor(doctor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDoctor(doctor.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 房间管理 ==================== */}
        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>房间列表</CardTitle>
                  <CardDescription>管理房间资源和类型</CardDescription>
                </div>
                <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddRoom}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加房间
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRoom ? '编辑房间' : '添加房间'}</DialogTitle>
                      <DialogDescription>
                        填写房间信息，设置房间类型和可用状态
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...roomForm}>
                      <form onSubmit={roomForm.handleSubmit(onSubmitRoom)} className="space-y-4">
                        <FormField
                          control={roomForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>房间名称 *</FormLabel>
                              <FormControl>
                                <Input placeholder="例如：VIP室1、治疗区A" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={roomForm.control}
                          name="room_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>房间类型 *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择房间类型" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="vip">VIP室</SelectItem>
                                  <SelectItem value="treatment">治疗区</SelectItem>
                                  <SelectItem value="consultation">咨询室</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                不同类型的房间适用于不同的服务场景
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={roomForm.control}
                          name="is_available"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">可用状态</FormLabel>
                                <FormDescription>
                                  关闭后该房间将不会出现在排班选择中
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setRoomDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? '保存中...' : '保存'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>房间名称</TableHead>
                    <TableHead>房间类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        暂无房间数据，请点击"添加房间"按钮添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoomTypeLabel(room.room_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={room.is_available ? 'default' : 'secondary'}>
                            {room.is_available ? '可用' : '不可用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRoom(room)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRoom(room.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

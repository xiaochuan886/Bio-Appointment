import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, AlertCircle, Store as StoreIcon } from 'lucide-react';
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
import clientApi from '@/services/api-client';
import type { Nurse, Doctor, Room } from '@/types/types';
import type { Service, Store } from '@/services/api-client';
import StoreQuickActions from '@/components/admin/StoreQuickActions';
import { useAuth } from '@/contexts/AuthContext';

// 服务项目表单Schema
const serviceSchema = z.object({
  name: z.string().min(1, '请输入服务项目名称'),
  description: z.string().min(1, '请输入服务项目描述'),
  category: z.enum(['nursing', 'consultation', 'report']),
  base_duration: z.number().min(15, '基础时长至少15分钟').max(480, '基础时长不能超过8小时'),
  requires_doctor: z.boolean(),
  allow_companions: z.boolean(),
  max_companions: z.number().min(0, '最大同行人数不能为负数').max(10, '最大同行人数不能超过10人'),
  is_active: z.boolean(),
});

// 护士表单Schema
const nurseSchema = z.object({
  name: z.string().min(1, '请输入护士姓名'),
  skill_level: z.enum(['junior', 'intermediate', 'senior']),
  is_available: z.boolean(),
});

// 医生表单Schema
const doctorSchema = z.object({
  name: z.string().min(1, '请输入医生姓名'),
  specialty: z.string().min(1, '请输入专业领域'),
  is_available: z.boolean(),
});

// 房间表单Schema
const roomSchema = z.object({
  name: z.string().min(1, '请输入房间名称'),
  room_type: z.enum(['vip', 'treatment', 'consultation']),
  is_available: z.boolean(),
  store_id: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;
type NurseFormValues = z.infer<typeof nurseSchema>;
type DoctorFormValues = z.infer<typeof doctorSchema>;
type RoomFormValues = z.infer<typeof roomSchema>;

export default function SystemConfigPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState<Service[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 对话框状态
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [nurseDialogOpen, setNurseDialogOpen] = useState(false);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  // 编辑状态
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // 表单
  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'nursing',
      base_duration: 60,
      requires_doctor: false,
      allow_companions: true,
      max_companions: 5,
      is_active: true,
    },
  });

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
      store_id: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [selectedStoreId, profile]);

  const loadData = async () => {
    try {
      console.log('🔍 [DEBUG] loadData 开始执行:', {
        userRole: profile?.role,
        userStoreId: profile?.store_id,
        selectedStoreId,
        timestamp: new Date().toISOString()
      });
      
      // 加载门店数据（如果是管理员）
      if (profile?.role === 'super_admin' || profile?.role === 'admin') {
        try {
          const storesData = await clientApi.getStores();
          console.log('🔍 [DEBUG] 加载门店数据成功:', storesData.length, '个门店');
          setStores(storesData);
        } catch (error) {
          console.error('加载门店数据失败:', error);
        }
      }
      
      // 获取用户门店ID
      const userStoreId = profile?.store_id || '';
      
      // 确定要查询的门店ID
      const storeIdToQuery = selectedStoreId === 'all' ? undefined : (selectedStoreId || userStoreId);
      
      console.log('🔍 [DEBUG] 房间查询参数:', {
        selectedStoreId,
        userStoreId,
        storeIdToQuery
      });
      
      const [servicesData, nursesData, doctorsData, roomsData] = await Promise.all([
        clientApi.getServices(),
        getNurses(),
        getDoctors(),
        getRooms(storeIdToQuery),
      ]);
      
      console.log('🔍 [DEBUG] 房间数据加载成功:', roomsData.length, '个房间');
      console.log('🔍 [DEBUG] 房间数据样本:', roomsData[0]);
      
      setServices(servicesData);
      setNurses(nursesData);
      setDoctors(doctorsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('🔍 [DEBUG] loadData 失败:', error);
      toast.error('加载数据失败');
    }
  };

  // ==================== 服务项目管理 ====================

  const handleAddService = () => {
    setEditingService(null);
    serviceForm.reset({
      name: '',
      description: '',
      category: 'nursing',
      base_duration: 60,
      requires_doctor: false,
      allow_companions: true,
      max_companions: 5,
      is_active: true,
    });
    setServiceDialogOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    serviceForm.reset({
      name: service.name,
      description: service.description,
      category: service.category as 'nursing' | 'consultation' | 'report',
      base_duration: service.base_duration,
      requires_doctor: service.requires_doctor,
      allow_companions: service.allow_companions,
      max_companions: service.max_companions || 5,
      is_active: service.is_active,
    });
    setServiceDialogOpen(true);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('确定要删除这个服务项目吗？删除后无法恢复。')) return;

    try {
      await clientApi.deleteService(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const onSubmitService = async (values: ServiceFormValues) => {
    setIsLoading(true);
    try {
      if (editingService) {
        await clientApi.updateService(editingService.id, values);
        toast.success('更新成功');
      } else {
        await clientApi.createService(values);
        toast.success('添加成功');
      }
      setServiceDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsLoading(false);
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
    
    // 获取用户默认门店
    const defaultStoreId = profile?.store_id || '';
    
    roomForm.reset({
      name: '',
      room_type: 'treatment',
      is_available: true,
      store_id: defaultStoreId,
    });
    setRoomDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    console.log('🔍 [DEBUG] 编辑房间数据:', room);
    roomForm.reset({
      name: room.name,
      room_type: room.room_type,
      is_available: room.is_available,
      store_id: room.store_id || '',
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
      // 验证门店权限
      const userStoreId = profile?.store_id || '';
      const userRole = profile?.role || '';
      
      // 验证门店选择
      if (userRole === 'super_admin' || userRole === 'admin') {
        if (!values.store_id) {
          toast.error('请选择所属门店');
          return;
        }
        
        // 验证门店是否存在
        const storeExists = stores.some(store => store.id === values.store_id);
        if (!storeExists) {
          toast.error('选择的门店不存在');
          return;
        }
      } else {
        // 非管理员只能管理自己门店的房间
        if (values.store_id && values.store_id !== userStoreId) {
          toast.error('您只能管理自己门店的房间');
          return;
        }
      }
      
      // 验证房间名称是否重复（在同一门店内）
      const existingRoom = rooms.find(room =>
        room.name === values.name &&
        room.store_id === (values.store_id || userStoreId) &&
        room.id !== editingRoom?.id
      );
      
      if (existingRoom) {
        toast.error('同一门店内已存在相同名称的房间');
        return;
      }
      
      if (editingRoom) {
        await updateRoom(editingRoom.id, values);
        toast.success('更新成功');
      } else {
        await createRoom({
          name: values.name,
          type: values.room_type,
          is_available: values.is_available,
          store_id: values.store_id || userStoreId
        });
        toast.success('添加成功');
      }
      setRoomDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('房间操作失败:', error);
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        toast.error('房间名称已存在');
      } else if (error.message.includes('foreign key constraint')) {
        toast.error('选择的门店不存在');
      } else {
        toast.error(error.message || '操作失败');
      }
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

  const getServiceCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      nursing: '护理服务',
      consultation: '咨询服务',
      report: '报告解读',
    };
    return labels[category] || category;
  };

  const getServiceWorkflowDescription = (category: string, requiresDoctor: boolean) => {
    if (category === 'nursing') {
      return '预约创建后直接流转到护士长进行排班';
    }
    if (requiresDoctor) {
      return '预约创建后先由医生确认，医生确认后直接完成，无需护士长排班';
    }
    return '预约创建后直接流转到护士长进行排班';
  };

  // 检查用户是否有权限访问门店管理
  const canManageStores = profile?.role === 'super_admin' || profile?.role === 'admin';

  // 门店管理相关处理函数
  const handleNavigateToStores = () => {
    // 导航到门店管理页面
    window.location.href = '/admin/stores';
  };

  const handleAddStore = () => {
    // 导航到门店管理页面并触发添加门店
    window.location.href = '/admin/stores?action=add';
  };

  const handleViewStore = (store: Store) => {
    // 导航到门店管理页面并查看特定门店
    window.location.href = `/admin/stores?action=view&id=${store.id}`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">系统配置</h1>
        <p className="text-muted-foreground">管理系统资源：服务项目、护士、医生、房间{canManageStores ? '、门店' : ''}</p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          提示：修改资源状态为"不可用"后，该资源将不会出现在预约和排班的选择列表中。
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${canManageStores ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="services">服务项目</TabsTrigger>
          <TabsTrigger value="nurses">护士管理</TabsTrigger>
          <TabsTrigger value="doctors">医生管理</TabsTrigger>
          <TabsTrigger value="rooms">房间管理</TabsTrigger>
          {canManageStores && (
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4" />
              门店管理
            </TabsTrigger>
          )}
        </TabsList>

        {/* ==================== 服务项目管理 ==================== */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>服务项目列表</CardTitle>
                  <CardDescription>管理系统提供的各种服务项目</CardDescription>
                </div>
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddService}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加服务项目
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingService ? '编辑服务项目' : '添加服务项目'}</DialogTitle>
                      <DialogDescription>
                        配置服务项目的详细信息，包括时长、是否需要医生等参数
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...serviceForm}>
                      <form onSubmit={serviceForm.handleSubmit(onSubmitService)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={serviceForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>服务名称 *</FormLabel>
                                <FormControl>
                                  <Input placeholder="例如：基础回输" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={serviceForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>服务类别 *</FormLabel>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  // 根据服务类别自动设置是否需要医生
                                  const requiresDoctor = value === 'consultation' || value === 'report';
                                  serviceForm.setValue('requires_doctor', requiresDoctor);
                                }} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择服务类别" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="nursing">护理服务</SelectItem>
                                    <SelectItem value="consultation">咨询服务</SelectItem>
                                    <SelectItem value="report">报告解读</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {field.value === 'nursing' && (
                                    <span className="text-blue-600">
                                      护理服务：预约创建后直接流转到所选门店的护士长进行智能排班
                                    </span>
                                  )}
                                  {field.value === 'consultation' && (
                                    <span className="text-orange-600">
                                      咨询服务：预约创建后先由所选医生处理确认，医生确认后直接完成，无需护士长排班
                                    </span>
                                  )}
                                  {field.value === 'report' && (
                                    <span className="text-orange-600">
                                      报告解读：预约创建后先由所选医生处理确认，医生确认后直接完成，无需护士长排班
                                    </span>
                                  )}
                                  {!field.value && (
                                    <span>服务类别影响预约流程和资源分配</span>
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={serviceForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>服务描述 *</FormLabel>
                              <FormControl>
                                <Input placeholder="详细描述服务内容" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={serviceForm.control}
                            name="base_duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>基础时长 (分钟) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="60" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  单人服务的基础时长（分钟）
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={serviceForm.control}
                            name="max_companions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>最大同行人数</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="5" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  允许的最多同行客户数量
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={serviceForm.control}
                            name="requires_doctor"
                            render={({ field }) => {
                              const category = serviceForm.watch('category');
                              const isAutoSet = category === 'consultation' || category === 'report';
                              
                              return (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">需要医生</FormLabel>
                                    <FormDescription>
                                      {isAutoSet ? (
                                        <span className="text-orange-600">
                                          根据服务类别自动设置：{category === 'consultation' ? '咨询服务' : '报告解读'}需要医生参与
                                        </span>
                                      ) : category === 'nursing' ? (
                                        <span className="text-blue-600">
                                          根据服务类别自动设置：护理服务不需要医生参与
                                        </span>
                                      ) : (
                                        <span>该服务是否需要医生参与</span>
                                      )}
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={isAutoSet || category === 'nursing'}
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={serviceForm.control}
                            name="allow_companions"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">允许同行</FormLabel>
                                  <FormDescription>
                                    是否允许客户携带同行人员
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
                        </div>

                        <FormField
                          control={serviceForm.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">启用状态</FormLabel>
                                <FormDescription>
                                  关闭后该服务将不会出现在预约选择中
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
                          <Button type="button" variant="outline" onClick={() => setServiceDialogOpen(false)}>
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
                    <TableHead>服务名称</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>基础时长</TableHead>
                    <TableHead>处理流程</TableHead>
                    <TableHead>特殊要求</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        暂无服务项目数据，请点击"添加服务项目"按钮添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getServiceCategoryLabel(service.category)}</Badge>
                        </TableCell>
                        <TableCell>{service.base_duration} 分钟</TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs">
                            {service.category === 'consultation' || service.category === 'report'
                              ? '预约创建后先由医生确认，医生确认后直接完成'
                              : getServiceWorkflowDescription(service.category, service.requires_doctor)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {service.requires_doctor && <Badge variant="secondary">需要医生</Badge>}
                            {service.allow_companions && <Badge variant="secondary">允许同行</Badge>}
                            {service.max_companions && service.max_companions > 0 && (
                              <Badge variant="outline">最多{service.max_companions}人</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? 'default' : 'secondary'}>
                            {service.is_active ? '启用' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditService(service)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteService(service.id)}
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
                <div className="flex items-center gap-2">
                  {/* 门店过滤 - 只有管理员可以看到所有门店的房间 */}
                  {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                    <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择门店" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部门店</SelectItem>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                          {/* 门店选择 - 只有管理员可以选择不同门店 */}
                          {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                            <FormField
                              control={roomForm.control}
                              name="store_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>所属门店 *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="选择门店" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {stores.map((store) => (
                                        <SelectItem key={store.id} value={store.id}>
                                          {store.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    选择房间所属的门店
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

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
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>房间名称</TableHead>
                    <TableHead>房间类型</TableHead>
                    {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                      <TableHead>所属门店</TableHead>
                    )}
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(profile?.role === 'super_admin' || profile?.role === 'admin') ? 5 : 4} className="text-center text-muted-foreground py-8">
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
                        {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                          <TableCell>
                            {stores.find(s => s.id === room.store_id)?.name || room.store_id || '未分配'}
                          </TableCell>
                        )}
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

        {/* ==================== 门店管理 ==================== */}
        {canManageStores && (
          <TabsContent value="stores">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5" />
                  门店管理
                </CardTitle>
                <CardDescription>
                  管理系统门店信息、营业状态和资源分配
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StoreQuickActions
                  onNavigateToStores={handleNavigateToStores}
                  onAddStore={handleAddStore}
                  onViewStore={handleViewStore}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

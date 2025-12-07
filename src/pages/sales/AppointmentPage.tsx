import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import clientApi from '@/services/api-client';
import type { Service, Store } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';

// Helper functions for API calls
const getServices = () => clientApi.getServices();
const createAppointment = (data: any) => clientApi.createAppointment(data);
const checkResourceAvailability = async (date: string, timeStart: string, timeEnd: string, storeId?: string) => {
  try {
    const availability = await clientApi.getResourceAvailability({
      date,
      time_start: timeStart,
      time_end: timeEnd,
      store_id: storeId
    });
    return availability.available_resources.length > 0;
  } catch (error) {
    console.error('检查资源可用性失败:', error);
    return false;
  }
};

const formSchema = z.object({
  store_id: z.string().min(1, '请选择门店'),
  customer_name: z.string().min(1, '请输入客户姓名'),
  service_id: z.string().min(1, '请选择服务项目'),
  requested_date: z.date({
    required_error: '请选择预约日期',
  }),
  requested_time_start: z.string().min(1, '请选择服务开始时间'),
});

type FormValues = z.infer<typeof formSchema>;

export default function SalesAppointmentPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [companions, setCompanions] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      store_id: '',
      customer_name: '',
      service_id: '',
      requested_time_start: '',
    },
  });

  useEffect(() => {
    loadStores();
    loadServices();
  }, []);

  useEffect(() => {
    const storeId = form.watch('store_id');
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      setSelectedStore(store || null);
    }
  }, [form.watch('store_id'), stores]);

  useEffect(() => {
    const serviceId = form.watch('service_id');
    if (serviceId) {
      const service = services.find(s => s.id === serviceId);
      setSelectedService(service || null);
    }
  }, [form.watch('service_id'), services]);

  useEffect(() => {
    const date = form.watch('requested_date');
    if (date) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const selectedDate = format(date, 'yyyy-MM-dd');
      setIsUrgent(selectedDate === today);
      
      if (selectedService) {
        loadAvailableSlots(selectedDate);
      }
    }
  }, [form.watch('requested_date'), selectedService]);

  const loadStores = async () => {
    try {
      const data = await clientApi.getStores({ status: 'active' });
      setStores(data);
    } catch (error) {
      toast.error('加载门店列表失败');
    }
  };

  const loadServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (error) {
      toast.error('加载服务项目失败');
    }
  };

  const loadAvailableSlots = async (date: string) => {
    if (!selectedService) return;

    try {
      const totalPeople = 1 + companions.filter(c => c.trim() !== '').length;
      // 根据公式计算：T_est = T_base + (N_pax - 1) × 30min
      const estimatedDuration = selectedService.base_duration + (totalPeople - 1) * 30;
      
      const slots: string[] = [];
      const startHour = 8;
      const endHour = 18;

      // 生成所有可能的时间段（每30分钟一个）
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
          const endMinutes = hour * 60 + minute + estimatedDuration;
          const endHourCalc = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          
          // 确保结束时间不超过18:00
          if (endHourCalc > 18 || (endHourCalc === 18 && endMinute > 0)) break;
          
          const timeEnd = `${endHourCalc.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
          
          // 检查资源可用性：Available(t) = (Rooms_free(t) ≥ 1) ∧ (Nurses_free(t) ≥ 1)
          const storeId = form.watch('store_id');
          const isAvailable = await checkResourceAvailability(date, timeStart, timeEnd, storeId);
          
          if (isAvailable || isUrgent) {
            // 急单模式忽略资源校验
            slots.push(timeStart);
          }
        }
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('加载可用时间段失败:', error);
      toast.error('加载可用时间段失败');
    }
  };

  // 当同行客户变化时，重新加载可用时间段
  useEffect(() => {
    const date = form.watch('requested_date');
    if (date && selectedService) {
      const selectedDate = format(date, 'yyyy-MM-dd');
      loadAvailableSlots(selectedDate);
    }
  }, [companions.length]);

  const addCompanion = () => {
    setCompanions([...companions, '']);
  };

  const removeCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const updateCompanion = (index: number, value: string) => {
    const newCompanions = [...companions];
    newCompanions[index] = value;
    setCompanions(newCompanions);
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const validCompanions = companions.filter(c => c.trim() !== '');

      // 验证门店选择
      if (!values.store_id) {
        toast.error('请选择门店');
        setIsLoading(false);
        return;
      }

      // 验证门店是否可用
      const selectedStore = stores.find(s => s.id === values.store_id);
      if (selectedStore && selectedStore.status !== 'active') {
        toast.error('所选门店当前不可用，请选择其他门店');
        setIsLoading(false);
        return;
      }

      // 急单仅允许预约【静脉采血】服务
      // PRD要求：[HM-03] 急单预约...仅限抽血服务
      // 注意：虽然基础回输也是 nursing 类，但在急单模式下必须严格限制为采血
      const isBloodTest = selectedService?.name?.includes('采血');
      
      if (isUrgent && !isBloodTest) {
        toast.error('急单仅允许预约【静脉采血】服务，其他服务请选择明日');
        setIsLoading(false);
        return;
      }

      const requestedDate = format(values.requested_date, 'yyyy-MM-dd');
      const timeStart = values.requested_time_start;

      // 使用动态时长计算模型：T_est = T_base + (N_pax - 1) × 30min
      const totalPeople = 1 + validCompanions.length;
      const estimatedDuration = selectedService ? selectedService.base_duration + (totalPeople - 1) * 30 : 60;

      let timeEnd: string | undefined;
      if (timeStart && selectedService) {
        const [hour, minute] = timeStart.split(':').map(Number);
        const endMinutes = hour * 60 + minute + estimatedDuration;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        timeEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
      }

      await createAppointment({
        customer_name: values.customer_name,
        customer_phone: '', // 可以根据需要添加电话字段
        service_id: values.service_id,
        requested_date: requestedDate,
        requested_time_start: timeStart,
        requested_time_end: timeEnd,
        total_people: totalPeople,
        estimated_duration: estimatedDuration,
        is_urgent: isUrgent,
        companion_names: validCompanions.length > 0 ? validCompanions : null,
        notes: `同行客户: ${validCompanions.join(', ')}` || undefined,
        store_id: values.store_id,
      });

      toast.success(
        isUrgent
          ? '急单预约已提交！护士长将收到声光报警提示。'
          : '预约申请已提交，等待护士长确认排班。'
      );

      form.reset();
      setCompanions([]);
      setSelectedService(null);
      setSelectedStore(null);
    } catch (error: any) {
      console.error('预约提交失败:', error);
      
      // 处理不同类型的错误
      if (error.message) {
        toast.error(error.message);
      } else if (error.response?.status === 409) {
        toast.error('预约冲突：该时间段已被占用');
      } else if (error.response?.status === 403) {
        toast.error('权限不足：您没有权限在该门店创建预约');
      } else if (error.response?.status === 404) {
        toast.error('门店不存在或不可用');
      } else {
        toast.error('提交预约失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalPeople = 1 + companions.filter(c => c.trim() !== '').length;
  
  // 动态计算预估时长（根据人数）
  const estimatedDuration = selectedService
    ? selectedService.base_duration + (selectedService.allow_companions ? (totalPeople - 1) * 30 : 0)
    : 0;

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">预约发起</h1>
          <p className="text-muted-foreground">填写客户信息并选择服务项目</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>新建预约</CardTitle>
            <CardDescription>
              请填写完整的预约信息，系统将自动计算人数和预估时长
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择门店 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择门店" />
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
                      {selectedStore && (
                        <FormDescription>
                          门店地址：{selectedStore.address || '未设置'}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主客户姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入客户姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>同行客户</FormLabel>
                  <FormDescription className="mb-2">
                    可添加多位同行客户（可选）
                  </FormDescription>
                  {companions.map((companion, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder={`同行客户 ${index + 1}`}
                        value={companion}
                        onChange={(e) => updateCompanion(index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeCompanion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCompanion}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加同行客户
                  </Button>
                  {totalPeople > 1 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      总人数：{totalPeople} 人
                      {estimatedDuration > 0 && selectedService?.allow_companions && (
                        <span className="ml-2 text-primary font-medium">
                          · 预计总耗时：{estimatedDuration} 分钟
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="service_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>服务项目 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择服务项目" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} ({service.base_duration}分钟)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedService && (
                        <FormDescription>
                          <div className="space-y-1">
                            <div>
                              标准预估时长：{selectedService.base_duration} 分钟/人
                              {selectedService.allow_companions && totalPeople > 1 && (
                                <span className="text-primary font-medium">
                                  {' '}· 当前 {totalPeople} 人，预计总耗时：{estimatedDuration} 分钟
                                </span>
                              )}
                              {selectedService.allow_companions && ' · 支持同行客户'}
                            </div>
                            <div className="text-sm">
                              {selectedService.category === 'nursing' ? (
                                <span className="text-blue-600">
                                  处理流程：预约创建后直接流转到所选门店的护士长进行智能排班
                                </span>
                              ) : selectedService.requires_doctor ? (
                                <span className="text-orange-600">
                                  处理流程：预约创建后先由所选医生处理确认，医生确认后再流转到护士长进行排班
                                </span>
                              ) : (
                                <span className="text-green-600">
                                  处理流程：预约创建后直接流转到所选门店的护士长进行智能排班
                                </span>
                              )}
                            </div>
                          </div>
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requested_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>预约日期 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: zhCN })
                            ) : (
                              <span>选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isUrgent && (
                  <Alert className="bg-urgent/10 border-urgent">
                    <AlertCircle className="h-4 w-4 text-urgent" />
                    <AlertDescription className="text-urgent">
                      警告：当前所选日期为【今天】，仅允许预约【抽血】类服务。其他服务请选择明日。
                    </AlertDescription>
                  </Alert>
                )}

                {/* 服务开始时间选择 */}
                {form.watch('requested_date') && selectedService && (
                  <FormField
                    control={form.control}
                    name="requested_time_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>服务开始时间 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择开始时间" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableSlots.length > 0 ? (
                              availableSlots.map((slot) => (
                                <SelectItem key={slot} value={slot}>
                                  {slot.substring(0, 5)}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-slots" disabled>
                                暂无可用时间段
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isUrgent 
                            ? '急单模式：所有时段均可选择' 
                            : '根据填写的客户姓名与同行姓名自动计算人数，标准耗时预计 ' + 
                              (selectedService.base_duration + (companions.filter(c => c.trim() !== '').length) * 30) + 
                              ' 分钟。灰色区域为资源已满。'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? '提交中...' : '提交预约'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setCompanions([]);
                      setSelectedService(null);
                      setSelectedStore(null);
                    }}
                  >
                    重置
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

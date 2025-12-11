import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  PlayCircle, 
  UserCheck, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Timer,
  MessageSquare
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import type { Schedule } from '@/services/api-client';
import clientApi from '@/services/api-client';

// 表单验证模式
const customerArriveFormSchema = z.object({
  notes: z.string().optional(),
});

const startServiceFormSchema = z.object({
  notes: z.string().optional(),
});

const completeServiceFormSchema = z.object({
  notes: z.string().optional(),
  service_quality_rating: z.number().min(1).max(5).optional(),
  customer_feedback: z.string().optional(),
});

const cancelServiceFormSchema = z.object({
  cancel_reason: z.string().min(1, '请输入取消原因'),
  notes: z.string().optional(),
});

type CustomerArriveFormValues = z.infer<typeof customerArriveFormSchema>;
type StartServiceFormValues = z.infer<typeof startServiceFormSchema>;
type CompleteServiceFormValues = z.infer<typeof completeServiceFormSchema>;
type CancelServiceFormValues = z.infer<typeof cancelServiceFormSchema>;

interface EnhancedTaskActionsProps {
  task: Schedule;
  onStatusChange: (taskId: string, newStatus: string, data?: any) => void;
  disabled?: boolean;
}

// 定义任务状态类型
type TaskStatus = 'pending' | 'customer_arrived' | 'in_progress' | 'completed' | 'cancelled';

// 任务状态配置
const taskStatusConfig: Record<TaskStatus, {
  label: string;
  color: string;
  icon: React.ComponentType<any>;
  description: string;
}> = {
  pending: {
    label: '待执行',
    color: 'yellow',
    icon: Clock,
    description: '等待客户到达'
  },
  customer_arrived: {
    label: '客户已到达',
    color: 'blue',
    icon: UserCheck,
    description: '客户已到达，准备开始服务'
  },
  in_progress: {
    label: '进行中',
    color: 'green',
    icon: PlayCircle,
    description: '服务正在进行'
  },
  completed: {
    label: '已完成',
    color: 'gray',
    icon: CheckCircle,
    description: '服务已完成'
  },
  cancelled: {
    label: '已取消',
    color: 'red',
    icon: XCircle,
    description: '服务已取消'
  }
};

// 状态转换规则
const statusTransitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ['customer_arrived', 'cancelled'],
  customer_arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export default function EnhancedTaskActions({ 
  task, 
  onStatusChange, 
  disabled = false 
}: EnhancedTaskActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'customer-arrive' | 'start-service' | 'complete-service' | 'cancel-service' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 表单实例
  const customerArriveForm = useForm<CustomerArriveFormValues>({
    resolver: zodResolver(customerArriveFormSchema),
  });
  
  const startServiceForm = useForm<StartServiceFormValues>({
    resolver: zodResolver(startServiceFormSchema),
  });
  
  const completeServiceForm = useForm<CompleteServiceFormValues>({
    resolver: zodResolver(completeServiceFormSchema),
  });
  
  const cancelServiceForm = useForm<CancelServiceFormValues>({
    resolver: zodResolver(cancelServiceFormSchema),
  });

  const currentStatus: TaskStatus = (task.status as TaskStatus) || 'pending';
  const statusConfig = taskStatusConfig[currentStatus];
  const availableTransitions = statusTransitions[currentStatus] || [];

  // 处理状态变更
  const handleStatusChange = async (newStatus: string, formData?: any) => {
    if (disabled) return;
    
    setIsLoading(true);
    try {
      let updateData: any = { status: newStatus };
      
      // 根据状态类型添加特定数据
      if (newStatus === 'customer_arrived' && formData) {
        updateData.customer_arrived_at = new Date().toISOString();
        updateData.notes = formData.notes;
      } else if (newStatus === 'in_progress' && formData) {
        updateData.service_started_at = new Date().toISOString();
        updateData.notes = formData.notes;
      } else if (newStatus === 'completed' && formData) {
        updateData.service_completed_at = new Date().toISOString();
        updateData.notes = formData.notes;
        updateData.service_quality_rating = formData.service_quality_rating;
        updateData.customer_feedback = formData.customer_feedback;
      } else if (newStatus === 'cancelled' && formData) {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancel_reason = formData.cancel_reason;
        updateData.notes = formData.notes;
      }
      
      // 调用API更新状态
      await clientApi.updateSchedule(task.id, updateData);
      
      // 通知父组件
      onStatusChange(task.id, newStatus, updateData);
      
      // 显示成功提示
      const statusConfig = taskStatusConfig[newStatus as TaskStatus];
      toast.success(`任务状态已更新为：${statusConfig.label}`);
      
      // 关闭对话框
      setIsDialogOpen(false);
      setDialogType(null);
    } catch (error) {
      console.error('状态更新失败:', error);
      toast.error('状态更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开对话框
  const openDialog = (type: typeof dialogType) => {
    setDialogType(type);
    setIsDialogOpen(true);
    
    // 重置对应表单
    if (type === 'customer-arrive') {
      customerArriveForm.reset();
    } else if (type === 'start-service') {
      startServiceForm.reset();
    } else if (type === 'complete-service') {
      completeServiceForm.reset();
    } else if (type === 'cancel-service') {
      cancelServiceForm.reset();
    }
  };

  // 获取可用操作按钮
  const getActionButtons = () => {
    const buttons = [];
    
    if (availableTransitions.includes('customer_arrived')) {
      buttons.push({
        key: 'customer-arrive',
        label: '客户到达',
        icon: UserCheck,
        color: 'blue',
        onClick: () => openDialog('customer-arrive')
      });
    }
    
    if (availableTransitions.includes('in_progress')) {
      buttons.push({
        key: 'start-service',
        label: '开始服务',
        icon: PlayCircle,
        color: 'green',
        onClick: () => openDialog('start-service')
      });
    }
    
    if (availableTransitions.includes('completed')) {
      buttons.push({
        key: 'complete-service',
        label: '完成服务',
        icon: CheckCircle,
        color: 'emerald',
        onClick: () => openDialog('complete-service')
      });
    }
    
    if (availableTransitions.includes('cancelled')) {
      buttons.push({
        key: 'cancel-service',
        label: '取消服务',
        icon: XCircle,
        color: 'red',
        onClick: () => openDialog('cancel-service')
      });
    }
    
    return buttons;
  };

  const actionButtons = getActionButtons();

  // 渲染对话框内容
  const renderDialogContent = () => {
    if (!dialogType) return null;
    
    switch (dialogType) {
      case 'customer-arrive':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">确认客户到达</span>
            </div>
            
            <p className="text-sm text-gray-600">
              请确认客户已到达，准备开始服务。
            </p>
            
            <Form {...customerArriveForm}>
              <FormField
                control={customerArriveForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="记录客户到达时的特殊情况..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => customerArriveForm.handleSubmit((data) => handleStatusChange('customer_arrived', data))()}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '处理中...' : '确认到达'}
              </Button>
            </div>
          </div>
        );
        
      case 'start-service':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <PlayCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">开始服务</span>
            </div>
            
            <p className="text-sm text-gray-600">
              确认开始为 {task.appointment?.customer_name} 提供服务。
            </p>
            
            <Form {...startServiceForm}>
              <FormField
                control={startServiceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="记录服务开始时的特殊情况..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => startServiceForm.handleSubmit((data) => handleStatusChange('in_progress', data))()}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '处理中...' : '开始服务'}
              </Button>
            </div>
          </div>
        );
        
      case 'complete-service':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-900">完成服务</span>
            </div>
            
            <p className="text-sm text-gray-600">
              确认完成为 {task.appointment?.customer_name} 提供的服务。
            </p>
            
            <Form {...completeServiceForm}>
              <FormField
                control={completeServiceForm.control}
                name="service_quality_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务质量评分</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => field.onChange(rating)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                              field.value === rating
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-gray-300 hover:border-emerald-300'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={completeServiceForm.control}
                name="customer_feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户反馈</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="记录客户的反馈..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={completeServiceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="记录服务过程中的特殊情况..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => completeServiceForm.handleSubmit((data) => handleStatusChange('completed', data))()}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '处理中...' : '完成服务'}
              </Button>
            </div>
          </div>
        );
        
      case 'cancel-service':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">取消服务</span>
            </div>
            
            <p className="text-sm text-gray-600">
              确认取消为 {task.appointment?.customer_name} 提供的服务。
            </p>
            
            <Form {...cancelServiceForm}>
              <FormField
                control={cancelServiceForm.control}
                name="cancel_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>取消原因 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入取消服务的原因..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={cancelServiceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>补充说明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="其他需要说明的情况..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => cancelServiceForm.handleSubmit((data) => handleStatusChange('cancelled', data))()}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '处理中...' : '确认取消'}
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* 当前状态指示器 */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <statusConfig.icon className={`h-4 w-4 text-${statusConfig.color}-600`} />
        <span className="text-sm font-medium text-gray-700">
          {statusConfig.label}
        </span>
        <Badge variant="outline" className="text-xs">
          {statusConfig.description}
        </Badge>
      </div>
      
      {/* 操作按钮 */}
      {actionButtons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actionButtons.map((button) => (
            <Button
              key={button.key}
              size="sm"
              variant={button.color === 'red' ? 'destructive' : 'default'}
              onClick={button.onClick}
              disabled={disabled || isLoading}
              className={`flex items-center gap-1 ${
                button.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                button.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                button.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
                ''
              }`}
            >
              <button.icon className="h-4 w-4" />
              {button.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic">
          当前状态无可执行操作
        </div>
      )}
      
      {/* 状态变更对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'customer-arrive' && '客户到达确认'}
              {dialogType === 'start-service' && '开始服务确认'}
              {dialogType === 'complete-service' && '完成服务确认'}
              {dialogType === 'cancel-service' && '取消服务确认'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'customer-arrive' && `确认 ${task.appointment?.customer_name} 已到达`}
              {dialogType === 'start-service' && `确认开始为 ${task.appointment?.customer_name} 提供服务`}
              {dialogType === 'complete-service' && `确认完成为 ${task.appointment?.customer_name} 提供的服务`}
              {dialogType === 'cancel-service' && `确认取消为 ${task.appointment?.customer_name} 提供的服务`}
            </DialogDescription>
          </DialogHeader>
          
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
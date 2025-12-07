import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus } from 'lucide-react';
import type { Store, StoreCreateRequest, StoreUpdateRequest } from '@/services/api-client';

// 门店表单Schema
const storeSchema = z.object({
  name: z.string().min(1, '请输入门店名称'),
  address: z.string().min(1, '请输入门店地址'),
  phone: z.string().min(1, '请输入联系电话'),
  contact_person: z.string().min(1, '请输入联系人'),
  status: z.enum(['active', 'inactive']),
  description: z.string().optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

interface StoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store | null;
  onSubmit: (values: StoreCreateRequest | StoreUpdateRequest) => Promise<void>;
}

export default function StoreFormDialog({ open, onOpenChange, store, onSubmit }: StoreFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      contact_person: '',
      status: 'active',
      description: '',
    },
  });

  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        address: store.address || '',
        phone: store.phone || '',
        contact_person: store.contact_person || '',
        status: store.status,
        description: store.description || '',
      });
    } else {
      form.reset({
        name: '',
        address: '',
        phone: '',
        contact_person: '',
        status: 'active',
        description: '',
      });
    }
  }, [store, form]);

  const handleSubmit = async (values: StoreFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{store ? '编辑门店' : '添加门店'}</DialogTitle>
          <DialogDescription>
            填写门店基本信息
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">基本信息</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>门店名称 *</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：北京朝阳店" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话 *</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：010-12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>门店地址 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：北京市朝阳区xxx街道xxx号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人 *</FormLabel>
                    <FormControl>
                      <Input placeholder="门店负责人姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>门店描述</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="门店特色、服务范围等描述信息" 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">营业状态</FormLabel>
                      <FormDescription>
                        关闭后该门店将不会出现在预约选择中
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <Badge className="bg-green-500">营业中</Badge>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <Badge variant="secondary">已停业</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
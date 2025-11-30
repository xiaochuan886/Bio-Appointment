import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { upsertDingTalkSyncConfig } from '@/db/api';

const configSchema = z.object({
  app_key: z.string().min(1, '请输入 AppKey'),
  app_secret: z.string().min(1, '请输入 AppSecret'),
  agent_id: z.string().min(1, '请输入 AgentId'),
  corp_id: z.string().min(1, '请输入 CorpId'),
  sync_enabled: z.boolean(),
  auto_sync_enabled: z.boolean(),
  sync_schedule: z.string(),
  sync_time: z.string(),
  conflict_strategy: z.enum(['dingtalk_first', 'local_first', 'manual']),
});

type ConfigFormValues = z.infer<typeof configSchema>;

interface DingTalkConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: any;
  onConfigSaved: () => void;
}

export default function DingTalkConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigSaved,
}: DingTalkConfigDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      app_key: '',
      app_secret: '',
      agent_id: '',
      corp_id: '',
      sync_enabled: true,
      auto_sync_enabled: false,
      sync_schedule: 'daily',
      sync_time: '02:00',
      conflict_strategy: 'dingtalk_first',
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        app_key: config.app_key || '',
        app_secret: config.app_secret || '',
        agent_id: config.agent_id || '',
        corp_id: config.corp_id || '',
        sync_enabled: config.sync_enabled ?? true,
        auto_sync_enabled: config.auto_sync_enabled ?? false,
        sync_schedule: config.sync_schedule || 'daily',
        sync_time: config.sync_time?.substring(0, 5) || '02:00',
        conflict_strategy: config.conflict_strategy || 'dingtalk_first',
      });
    }
  }, [config, form]);

  const onSubmit = async (values: ConfigFormValues) => {
    setIsSaving(true);
    try {
      await upsertDingTalkSyncConfig({
        app_key: values.app_key,
        app_secret: values.app_secret,
        agent_id: values.agent_id,
        corp_id: values.corp_id,
        sync_enabled: values.sync_enabled,
        auto_sync_enabled: values.auto_sync_enabled,
        sync_schedule: values.sync_schedule,
        sync_time: `${values.sync_time}:00`,
        conflict_strategy: values.conflict_strategy,
      });
      toast.success('配置保存成功');
      onConfigSaved();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      toast.error(error.message || '保存配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>钉钉同步配置</DialogTitle>
          <DialogDescription>
            配置钉钉应用信息以启用组织架构同步功能
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="app_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AppKey</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入钉钉应用的 AppKey" {...field} />
                  </FormControl>
                  <FormDescription>
                    在钉钉开发者后台获取
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="app_secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AppSecret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="请输入钉钉应用的 AppSecret" {...field} />
                  </FormControl>
                  <FormDescription>
                    应用密钥，请妥善保管
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="agent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AgentId</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入 AgentId" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="corp_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CorpId</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入企业 CorpId" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sync_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">启用同步</FormLabel>
                    <FormDescription>
                      开启后可以手动或自动同步钉钉组织架构
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

            <FormField
              control={form.control}
              name="auto_sync_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">启用自动同步</FormLabel>
                    <FormDescription>
                      按照设定的计划自动执行同步
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

            {form.watch('auto_sync_enabled') && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sync_schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>同步频率</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择同步频率" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">每小时</SelectItem>
                          <SelectItem value="daily">每天</SelectItem>
                          <SelectItem value="weekly">每周</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sync_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>同步时间</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="conflict_strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>冲突解决策略</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择冲突解决策略" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dingtalk_first">以钉钉数据为准</SelectItem>
                      <SelectItem value="local_first">保留本地数据</SelectItem>
                      <SelectItem value="manual">手动处理</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    当本地用户与钉钉用户信息冲突时的处理方式
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

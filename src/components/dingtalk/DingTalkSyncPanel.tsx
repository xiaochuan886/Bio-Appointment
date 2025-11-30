import { useState, useEffect } from 'react';
import { RefreshCw, Settings, History, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  getDingTalkSyncConfig,
  triggerDingTalkSync,
  getDingTalkSyncLogs,
  getSyncStatistics,
} from '@/db/api';
import DingTalkConfigDialog from './DingTalkConfigDialog';
import DingTalkSyncLogsTable from './DingTalkSyncLogsTable';

export default function DingTalkSyncPanel() {
  const [config, setConfig] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    loadConfig();
    loadStatistics();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getDingTalkSyncConfig();
      setConfig(data);
    } catch (error: any) {
      console.error('加载钉钉配置失败:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await getSyncStatistics();
      setStatistics(data);
    } catch (error: any) {
      console.error('加载统计信息失败:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const result = await getDingTalkSyncLogs({ limit: 10 });
      setLogs(result.data);
    } catch (error: any) {
      console.error('加载同步日志失败:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSync = async () => {
    if (!config) {
      toast.error('请先配置钉钉应用信息');
      setShowConfigDialog(true);
      return;
    }

    if (!config.sync_enabled) {
      toast.error('钉钉同步功能未启用');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await triggerDingTalkSync({
        sync_type: 'manual',
        selected_departments: config.selected_departments || [],
        conflict_strategy: config.conflict_strategy,
      });

      if (result.success) {
        toast.success(`同步完成！成功: ${result.data.success_count}, 失败: ${result.data.failed_count}, 跳过: ${result.data.skipped_count}`);
        loadStatistics();
        loadLogs();
      } else {
        toast.error(result.error || '同步失败');
      }
    } catch (error: any) {
      console.error('同步失败:', error);
      toast.error(error.message || '同步失败，请检查配置');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />成功</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case 'running':
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />进行中</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />部分成功</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />待处理</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总同步次数</CardDescription>
            <CardTitle className="text-3xl">{statistics?.total_syncs || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>成功次数</CardDescription>
            <CardTitle className="text-3xl text-green-600">{statistics?.success_count || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>失败次数</CardDescription>
            <CardTitle className="text-3xl text-red-600">{statistics?.failed_count || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已同步用户</CardDescription>
            <CardTitle className="text-3xl">{statistics?.total_users_synced || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 主面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>钉钉组织架构同步</CardTitle>
              <CardDescription>
                {config ? (
                  <>
                    配置状态: {config.sync_enabled ? (
                      <Badge variant="outline" className="ml-2">已启用</Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">未启用</Badge>
                    )}
                    {config.last_sync_at && (
                      <span className="ml-4 text-xs">
                        最后同步: {new Date(config.last_sync_at).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </>
                ) : (
                  '未配置'
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigDialog(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                配置
              </Button>
              <Button
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !config?.sync_enabled}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    立即同步
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logs" className="w-full">
            <TabsList>
              <TabsTrigger value="logs">
                <History className="w-4 h-4 mr-2" />
                同步日志
              </TabsTrigger>
            </TabsList>
            <TabsContent value="logs" className="mt-4">
              <DingTalkSyncLogsTable
                logs={logs}
                isLoading={isLoadingLogs}
                onRefresh={loadLogs}
                getStatusBadge={getStatusBadge}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 配置对话框 */}
      <DingTalkConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={config}
        onConfigSaved={() => {
          loadConfig();
          setShowConfigDialog(false);
        }}
      />
    </div>
  );
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DingTalkSyncLogsTableProps {
  logs: any[];
  isLoading: boolean;
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function DingTalkSyncLogsTable({
  logs,
  isLoading,
  onRefresh,
  getStatusBadge,
}: DingTalkSyncLogsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-muted" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>暂无同步日志</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>同步时间</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">总数</TableHead>
              <TableHead className="text-right">成功</TableHead>
              <TableHead className="text-right">失败</TableHead>
              <TableHead className="text-right">跳过</TableHead>
              <TableHead>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {new Date(log.started_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  {log.sync_type === 'manual' && '手动同步'}
                  {log.sync_type === 'auto' && '自动同步'}
                  {log.sync_type === 'incremental' && '增量同步'}
                </TableCell>
                <TableCell>{getStatusBadge(log.status)}</TableCell>
                <TableCell className="text-right">{log.total_users}</TableCell>
                <TableCell className="text-right text-green-600">{log.success_count}</TableCell>
                <TableCell className="text-right text-red-600">{log.failed_count}</TableCell>
                <TableCell className="text-right text-yellow-600">{log.skipped_count}</TableCell>
                <TableCell>
                  {log.created_by_profile?.full_name || log.created_by_profile?.username || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

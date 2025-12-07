import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store as StoreIcon, 
  Plus, 
  Eye, 
  MapPin, 
  Users, 
  TrendingUp,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { Store } from '@/services/api-client';
import clientApi from '@/services/api-client';
import { toast } from 'sonner';

interface StoreQuickActionsProps {
  onNavigateToStores?: () => void;
  onAddStore?: () => void;
  onViewStore?: (store: Store) => void;
}

interface StoreStats {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  recentlyAdded: Store[];
}

export default function StoreQuickActions({ 
  onNavigateToStores, 
  onAddStore, 
  onViewStore 
}: StoreQuickActionsProps) {
  const [stats, setStats] = useState<StoreStats>({
    totalStores: 0,
    activeStores: 0,
    inactiveStores: 0,
    recentlyAdded: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoreStats();
  }, []);

  const loadStoreStats = async () => {
    try {
      setIsLoading(true);
      const stores = await clientApi.getStores();
      
      // 计算统计数据
      const activeStores = stores.filter(store => store.status === 'active').length;
      const inactiveStores = stores.filter(store => store.status === 'inactive').length;
      
      // 获取最近添加的门店（最多3个）
      const recentlyAdded = stores
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      
      setStats({
        totalStores: stores.length,
        activeStores,
        inactiveStores,
        recentlyAdded
      });
    } catch (error) {
      console.error('加载门店统计失败:', error);
      toast.error('加载门店统计失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500">营业中</Badge>
    ) : (
      <Badge variant="secondary">已停业</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 门店统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总门店数</CardTitle>
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalStores}</div>
            <p className="text-xs text-muted-foreground">
              系统中的所有门店
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">营业中</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{isLoading ? '...' : stats.activeStores}</div>
            <p className="text-xs text-muted-foreground">
              正在营业的门店
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已停业</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{isLoading ? '...' : stats.inactiveStores}</div>
            <p className="text-xs text-muted-foreground">
              暂停营业的门店
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            门店管理快捷操作
          </CardTitle>
          <CardDescription>
            快速访问门店管理功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={onAddStore}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              添加门店
            </Button>
            <Button 
              variant="outline"
              onClick={onNavigateToStores}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              查看所有门店
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 最近添加的门店 */}
      {stats.recentlyAdded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近添加的门店
            </CardTitle>
            <CardDescription>
              最新创建的门店信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentlyAdded.map((store) => (
                <div 
                  key={store.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StoreIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {store.address}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(store.status)}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewStore?.(store)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {stats.totalStores === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有门店</h3>
            <p className="text-muted-foreground text-center mb-4">
              添加第一个门店开始管理您的业务
            </p>
            <Button onClick={onAddStore} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加门店
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
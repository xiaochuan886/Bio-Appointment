import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  Edit, 
  Trash2,
  Users,
  Stethoscope,
  DoorOpen
} from 'lucide-react';
import type { Store } from '@/services/api-client';
import clientApi from '@/services/api-client';

interface StoreDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store | null;
  onEdit?: (store: Store) => void;
  onDelete?: (store: Store) => void;
}

interface StoreStats {
  nursesCount: number;
  doctorsCount: number;
  roomsCount: number;
}

export default function StoreDetailDialog({ 
  open, 
  onOpenChange, 
  store, 
  onEdit, 
  onDelete 
}: StoreDetailDialogProps) {
  const [stats, setStats] = useState<StoreStats>({
    nursesCount: 0,
    doctorsCount: 0,
    roomsCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (store && open) {
      loadStoreStats();
    }
  }, [store, open]);

  const loadStoreStats = async () => {
    if (!store) return;
    
    setLoading(true);
    try {
      const [nurses, doctors, rooms] = await Promise.all([
        clientApi.getStoreStaff(store.id, 'nurse'),
        clientApi.getStoreStaff(store.id, 'doctor'),
        clientApi.getStoreResources(store.id, 'room'),
      ]);
      
      setStats({
        nursesCount: nurses.length,
        doctorsCount: doctors.length,
        roomsCount: rooms.length,
      });
    } catch (error) {
      console.error('加载门店统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500">营业中</Badge>
    ) : (
      <Badge variant="secondary">已停业</Badge>
    );
  };

  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            门店详情
          </DialogTitle>
          <DialogDescription>
            查看门店详细信息和资源统计
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{store.name}</span>
                <div className="flex gap-2">
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(store)}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="destructive" size="sm" onClick={() => onDelete(store)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                门店基本信息和营业状态
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">地址</span>
                  </div>
                  <p className="ml-6 text-sm">{store.address || '未设置'}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">联系电话</span>
                  </div>
                  <p className="ml-6 text-sm">{store.phone || '未设置'}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">联系人</span>
                  </div>
                  <p className="ml-6 text-sm">{store.contact_person || '未设置'}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">营业状态</span>
                  </div>
                  <div className="ml-6">
                    {getStatusBadge(store.status)}
                  </div>
                </div>
              </div>
              
              {store.description && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-sm font-medium">门店描述</span>
                    <p className="text-sm text-muted-foreground">{store.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 资源统计 */}
          <Card>
            <CardHeader>
              <CardTitle>资源统计</CardTitle>
              <CardDescription>
                门店关联的护士、医生和房间数量
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{stats.nursesCount}</div>
                    <div className="text-sm text-muted-foreground">护士</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <Stethoscope className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{stats.doctorsCount}</div>
                    <div className="text-sm text-muted-foreground">医生</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <DoorOpen className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">{stats.roomsCount}</div>
                    <div className="text-sm text-muted-foreground">房间</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 营业时间 */}
          {store.business_hours && (
            <Card>
              <CardHeader>
                <CardTitle>营业时间</CardTitle>
                <CardDescription>
                  门店每周营业时间安排
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(store.business_hours).map(([day, hours]: [string, any]) => {
                    const dayNames: Record<string, string> = {
                      monday: '周一',
                      tuesday: '周二',
                      wednesday: '周三',
                      thursday: '周四',
                      friday: '周五',
                      saturday: '周六',
                      sunday: '周日',
                    };
                    
                    const dayName = dayNames[day] || day;
                    
                    if (hours?.closed) {
                      return (
                        <div key={day} className="flex justify-between items-center p-2 border rounded">
                          <span className="font-medium">{dayName}</span>
                          <Badge variant="secondary">休息</Badge>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={day} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-medium">{dayName}</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {hours?.open || '09:00'} - {hours?.close || '18:00'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 创建和更新时间 */}
          <Card>
            <CardHeader>
              <CardTitle>时间信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">创建时间</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(store.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">更新时间</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(store.updated_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
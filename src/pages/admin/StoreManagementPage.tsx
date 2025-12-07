import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Eye, Search, Filter, Store as StoreIcon, MapPin, Phone, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import clientApi, { type Store, type StoreCreateRequest, type StoreUpdateRequest, type StoreFilters } from '@/services/api-client';
import StoreFormDialog from '@/components/admin/StoreFormDialog';
import StoreDetailDialog from '@/components/admin/StoreDetailDialog';

// 门店表单Schema
const storeSchema = z.object({
  name: z.string().min(1, '请输入门店名称'),
  address: z.string().min(1, '请输入门店地址'),
  phone: z.string().min(1, '请输入联系电话'),
  contact_person: z.string().min(1, '请输入联系人'),
  status: z.enum(['active', 'inactive']).default('active'),
  description: z.string().optional(),
  business_hours: z.record(z.any()).optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function StoreManagementPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // 对话框状态
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // 编辑/查看状态
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [viewingStore, setViewingStore] = useState<Store | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    filterStores();
  }, [stores, searchTerm, statusFilter]);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      const data = await clientApi.getStores();
      setStores(data);
      setFilteredStores(data); // 初始化filteredStores
    } catch (error: any) {
      console.error('加载门店列表失败:', error);
      toast.error('加载门店列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStores = () => {
    let filtered = stores;
    
    // 按名称搜索
    if (searchTerm) {
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 按状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(store => store.status === statusFilter);
    }
    
    setFilteredStores(filtered);
  };

  const handleAddStore = () => {
    setEditingStore(null);
    setFormDialogOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setFormDialogOpen(true);
  };

  const handleViewStore = (store: Store) => {
    setViewingStore(store);
    setDetailDialogOpen(true);
  };

  const handleDeleteStore = async (store: Store) => {
    if (!confirm(`确定要删除门店"${store.name}"吗？删除后无法恢复。`)) return;

    try {
      await clientApi.deleteStore(store.id);
      toast.success('删除成功');
      loadStores();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const handleStoreSubmit = async (values: StoreCreateRequest | StoreUpdateRequest) => {
    try {
      if (editingStore) {
        await clientApi.updateStore(editingStore.id, values as StoreUpdateRequest);
        toast.success('更新成功');
      } else {
        await clientApi.createStore(values as StoreCreateRequest);
        toast.success('添加成功');
      }
      setFormDialogOpen(false);
      loadStores();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <StoreIcon className="h-8 w-8 text-primary" />
          门店管理
        </h1>
        <p className="text-muted-foreground">管理系统门店信息、营业状态和资源分配</p>
      </div>

      <Alert className="mb-6">
        <StoreIcon className="h-4 w-4" />
        <AlertDescription>
          提示：门店停业后，该门店将不会出现在预约创建的门店选择列表中，但已关联的资源和预约不受影响。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>门店列表</CardTitle>
              <CardDescription>共 {filteredStores.length} 家门店</CardDescription>
            </div>
            <Button onClick={handleAddStore}>
              <Plus className="mr-2 h-4 w-4" />
              添加门店
            </Button>
          </div>
          
          {/* 搜索和过滤 */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索门店名称或地址..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">营业中</SelectItem>
                <SelectItem value="inactive">已停业</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {stores.length === 0 ? '暂无门店数据，请点击"添加门店"按钮添加' : '没有符合筛选条件的门店'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>门店名称</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {store.address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {store.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {store.contact_person}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(store.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(store.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStore(store)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStore(store)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 门店表单对话框 */}
      <StoreFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        store={editingStore}
        onSubmit={handleStoreSubmit}
      />

      {/* 门店详情对话框 */}
      <StoreDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        store={viewingStore}
        onEdit={(store: Store) => {
          setDetailDialogOpen(false);
          handleEditStore(store);
        }}
        onDelete={handleDeleteStore}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, UserPlus, QrCode, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱或用户名'),
  password: z.string().min(6, '密码至少6个字符'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 模拟获取钉钉登录二维码
  useEffect(() => {
    if (activeTab === 'dingtalk') {
      // 实际项目中应调用 /api/dingtalk/qrcode 获取
      const mockDingTalkAuthUrl = `https://oapi.dingtalk.com/connect/qrconnect?appid=dingoa_mock_id&response_type=code&scope=snsapi_login&state=STATE&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/dingtalk/callback')}`;
      setQrCodeUrl(mockDingTalkAuthUrl);

      // 模拟轮询检测扫码状态
      const timer = setInterval(() => {
        // 这里应该调用后端接口检查扫码状态
        // checkScanStatus();
      }, 3000);

      return () => clearInterval(timer);
    }
  }, [activeTab]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin',
      password: 'admin123',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    console.log('=== 开始登录流程 ===');
    console.log('表单值:', { email: values.email, password: '***' });

    setIsLoading(true);
    try {
      console.log('1. 调用认证登录...');
      const result = await authLogin(values.email, values.password);

      console.log('2. 认证登录结果:', {
        success: result.success,
        hasSession: !!result.session,
        hasProfile: !!result.profile,
      });

      if (result.success) {
        console.log('3. 显示成功提示...');
        toast.success('登录成功');

        console.log('4. 跳转到首页...');
        navigate('/');

        console.log('=== 登录流程完成 ===');
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (error: any) {
      console.error('=== 登录失败 ===');
      console.error('错误详情:', error);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);

      toast.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Bio-Appointment</CardTitle>
          <CardDescription>智能预约调度系统</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="account">
                <Smartphone className="h-4 w-4 mr-2" />
                账号登录
              </TabsTrigger>
              <TabsTrigger value="dingtalk">
                <QrCode className="h-4 w-4 mr-2" />
                钉钉扫码
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱/用户名</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入邮箱或用户名"
                            type="text"
                            autoComplete="username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="请输入密码"
                              autoComplete="current-password"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="sr-only">
                                {showPassword ? '隐藏密码' : '显示密码'}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? '登录中...' : '登录'}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  还没有账号？{' '}
                  <Link
                    to="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    <UserPlus className="inline h-4 w-4 mr-1" />
                    立即注册
                  </Link>
                </p>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  💡 测试账号：<br />
                  用户名: admin / nurse1 / sales1 / head_nurse1<br />
                  密码: 123456 (所有账号统一密码)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="dingtalk">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                  {qrCodeUrl && (
                    <QRCodeDataUrl
                      text={qrCodeUrl}
                      width={200}
                      color="#000000"
                    />
                  )}
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">打开钉钉 App 扫一扫</p>
                  <p className="text-sm text-muted-foreground">
                    扫码后无需输入密码，直接登录
                  </p>
                </div>

                <div className="mt-4 w-full p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 text-center">
                    提示：首次登录需绑定系统账号，绑定后即可实现免密登录。
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

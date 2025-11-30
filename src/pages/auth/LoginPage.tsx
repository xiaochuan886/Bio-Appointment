import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@test.com',
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入邮箱"
                        type="email"
                        autoComplete="email"
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
                      <Input
                        type="password"
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        {...field}
                      />
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
              💡 测试账号：<br/>
              邮箱: admin@test.com<br/>
              密码: admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

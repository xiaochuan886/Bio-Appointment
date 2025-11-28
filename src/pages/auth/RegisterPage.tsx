import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { register } from '@/db/api';

const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  full_name: z.string().min(2, '姓名至少2个字符').optional(),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      full_name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await register({
        username: values.username,
        password: values.password,
        full_name: values.full_name,
      });
      
      toast.success('注册成功！请登录');
      navigate('/login');
    } catch (error: any) {
      console.error('注册失败:', error);
      
      // 处理常见错误
      let errorMessage = '注册失败，请稍后重试';
      if (error.message?.includes('already registered')) {
        errorMessage = '该用户名已被注册';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">创建账号</CardTitle>
          <CardDescription>注册 Bio-Appointment 系统账号</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入用户名"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      只能包含字母、数字和下划线，3-20个字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>真实姓名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入真实姓名（可选）"
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
                    <FormLabel>密码 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请输入密码"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      至少6个字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码 *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请再次输入密码"
                        autoComplete="new-password"
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
                {isLoading ? '注册中...' : '注册'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              已有账号？{' '}
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                <LogIn className="inline h-4 w-4 mr-1" />
                立即登录
              </Link>
            </p>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              💡 提示：第一个注册的用户将自动成为超级管理员
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

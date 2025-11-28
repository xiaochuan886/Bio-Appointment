import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 via-background to-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">访问受限</CardTitle>
          <CardDescription>
            抱歉，您没有权限访问此页面
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            此页面需要特定的角色权限才能访问。如果您认为这是一个错误，请联系系统管理员。
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/common/Header';
import routes from './routes';

function AppContent() {
  const location = useLocation();
  
  // 不显示 Header 的路由
  const noHeaderRoutes = ['/login', '/register', '/unauthorized'];
  const showHeader = !noHeaderRoutes.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {showHeader && <Header />}
      <main className="flex-grow">
        <Routes>
          {routes.map((route, index) => {
            // 不需要认证的路由
            if (route.requireAuth === false) {
              return (
                <Route
                  key={index}
                  path={route.path}
                  element={route.element}
                />
              );
            }
            
            // 需要认证的路由
            return (
              <Route
                key={index}
                path={route.path}
                element={
                  <ProtectedRoute requiredRole={route.requiredRole}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            );
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

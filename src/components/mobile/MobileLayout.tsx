import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTouchOptimizations, useMobilePerformance, useViewportOptimization } from '@/hooks/use-mobile-data';
import '@/styles/mobile.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  bottomPadding?: boolean;
  className?: string;
}

export default function MobileLayout({
  children,
  title,
  showBackButton = false,
  rightAction,
  bottomPadding = true,
  className = ''
}: MobileLayoutProps) {
  const { isMobile } = useIsMobile();
  
  // 应用移动端性能优化
  useTouchOptimizations();
  useMobilePerformance();
  useViewportOptimization();
  
  // 如果不是移动端，直接返回子组件
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }
  
  const handleBack = () => {
    // 简单的返回功能，实际使用时可能需要更复杂的路由处理
    window.history.back();
  };
  
  return (
    <div className={`min-h-screen flex flex-col bg-background ${className}`}>
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex h-14 items-center px-4">
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="flex-1 text-lg font-semibold truncate">
            {title || 'Bio-Appointment'}
          </h1>
          {rightAction}
        </div>
      </header>
      
      {/* 主内容区域 */}
      <main className={`flex-1 overflow-auto ${bottomPadding ? 'pb-16' : ''}`}>
        {children}
      </main>
    </div>
  );
}
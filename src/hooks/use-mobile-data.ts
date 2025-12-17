import { useState, useEffect, useCallback } from 'react';

// 移动端数据分页钩子
export function useMobileData<T>(data: T[], pageSize = 10) {
  const [visibleData, setVisibleData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadMoreData = () => {
      if (isLoading) return;
      
      setIsLoading(true);
      const startIndex = currentPage * pageSize;
      const endIndex = startIndex + pageSize;
      const newData = data.slice(0, endIndex);
      
      setVisibleData(newData);
      setCurrentPage(prev => prev + 1);
      setIsLoading(false);
    };
    
    loadMoreData();
  }, [data, currentPage]);
  
  const loadMore = useCallback(() => {
    if (visibleData.length >= data.length) return;
    setIsLoading(true);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const newData = data.slice(0, endIndex);
    
    setVisibleData(newData);
    setCurrentPage(prev => prev + 1);
    setIsLoading(false);
  }, [visibleData.length, data.length, currentPage, pageSize]);
  
  const reset = useCallback(() => {
    setVisibleData([]);
    setCurrentPage(0);
    setIsLoading(false);
  }, []);
  
  return {
    data: visibleData,
    loadMore,
    hasMore: visibleData.length < data.length,
    isLoading,
    reset
  };
}

// 移动端触摸优化钩子
export function useTouchOptimizations() {
  useEffect(() => {
    // 防止移动端双击缩放
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
}

// 移动端性能优化钩子
export function useMobilePerformance() {
  useEffect(() => {
    // 优化移动端滚动性能
    const style = document.createElement('style');
    style.textContent = `
      /* 移动端滚动优化 */
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      /* 移动端点击优化 */
      button, .clickable {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* 移动端动画优化 */
      .mobile-optimized {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
      
      /* 移动端输入优化 */
      input, textarea, select {
        font-size: 16px; /* 防止iOS缩放 */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

// 移动端网络状态监控
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    
    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateConnectionType();
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  
  return { isOnline, connectionType };
}

// 移动端视口优化
export function useViewportOptimization() {
  useEffect(() => {
    // 设置移动端视口
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
    
    // 防止移动端橡皮筋效果
    const preventRubberBand = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollable = target.closest('.scrollable');
      
      if (!scrollable) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventRubberBand, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventRubberBand);
    };
  }, []);
}
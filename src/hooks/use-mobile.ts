import * as React from "react";

// 移动端断点定义
const MOBILE_BREAKPOINT = 768;
const BREAKPOINTS = {
  xs: 475,    // 超小屏手机
  sm: 640,    // 小屏手机
  md: 768,    // 平板
  lg: 1024,   // 小屏桌面
  xl: 1280,   // 桌面
  '2xl': 1536, // 大屏桌面
} as const;

type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  const [screenSize, setScreenSize] = React.useState<ScreenSize>('lg');
  const [isTablet, setIsTablet] = React.useState<boolean>(false);

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      
      // 检测屏幕尺寸
      if (width < BREAKPOINTS.xs) setScreenSize('xs');
      else if (width < BREAKPOINTS.sm) setScreenSize('sm');
      else if (width < BREAKPOINTS.md) setScreenSize('md');
      else if (width < BREAKPOINTS.lg) setScreenSize('lg');
      else if (width < BREAKPOINTS.xl) setScreenSize('xl');
      else setScreenSize('2xl');
      
      // 检测是否为平板（介于手机和桌面之间）
      setIsTablet(width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg);
    };

    // 监听窗口大小变化
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", updateScreenSize);
    
    // 初始化
    updateScreenSize();
    
    return () => mql.removeEventListener("change", updateScreenSize);
  }, []);

  return {
    isMobile: !!isMobile,
    isTablet,
    screenSize,
    isSmallMobile: screenSize === 'xs' || screenSize === 'sm',
    isLargeMobile: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl',
  };
}

// 导出断点常量供其他组件使用
export { BREAKPOINTS };
export type { ScreenSize };

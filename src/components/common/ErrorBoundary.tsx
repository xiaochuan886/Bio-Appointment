/**
 * 错误边界组件
 * 创建时间: 2025-12-09
 * 描述: 捕获React组件树中的错误，提供友好的错误UI展示和重试机制
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
  customErrorMessage?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在开发环境中输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary捕获到错误:', error);
      console.error('错误组件堆栈:', errorInfo.componentStack);
    }

    // 在生产环境中可以发送错误报告到监控服务
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private static generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return ErrorBoundary.generateErrorId();
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 这里可以集成错误监控服务，如Sentry、LogRocket等
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };

      // 发送错误报告到服务器（可选）
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(err => console.error('错误报告发送失败:', err));

      // 在开发环境中输出错误报告
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 错误报告');
        console.table(errorReport);
        console.groupEnd();
      }
    } catch (reportError) {
      console.error('生成错误报告失败:', reportError);
    }
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });

      // 延迟重试，避免立即重新渲染导致相同错误
      this.retryTimeoutId = setTimeout(() => {
        // 强制重新渲染
        this.forceUpdate();
      }, 1000);
    } else {
      // 达到最大重试次数，显示重试限制消息
      this.setState({
        error: new Error(`已达到最大重试次数 (${maxRetries})，请刷新页面或联系技术支持`)
      });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleShowDetails = () => {
    // 在开发环境中显示详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 详细错误信息');
      console.log('错误:', this.state.error);
      console.log('错误信息:', this.state.errorInfo);
      console.log('错误ID:', this.state.errorId);
      console.log('重试次数:', this.state.retryCount);
      console.groupEnd();
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount, errorId } = this.state;
    const { 
      children, 
      fallback, 
      maxRetries = 3, 
      showErrorDetails = process.env.NODE_ENV === 'development',
      customErrorMessage 
    } = this.props;

    if (!hasError) {
      return children;
    }

    // 如果提供了自定义fallback，使用它
    if (fallback) {
      return fallback;
    }

    // 默认错误UI
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          {/* 错误图标 */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* 错误标题 */}
          <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
            出现了意外错误
          </h1>

          {/* 错误消息 */}
          <p className="text-gray-600 text-center mb-6">
            {customErrorMessage || error?.message || '应用程序遇到了意外错误，请尝试重新加载页面。'}
          </p>

          {/* 错误信息 */}
          {error && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-6">
              <div className="flex items-center mb-2">
                <Bug className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">错误信息</span>
              </div>
              <p className="text-sm text-gray-600 font-mono break-all">
                {error.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                错误ID: {errorId}
              </p>
            </div>
          )}

          {/* 重试次数信息 */}
          {retryCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800">
                已重试 {retryCount} 次，剩余 {maxRetries - retryCount} 次重试机会
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            {/* 重试按钮 */}
            {retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试 ({retryCount + 1}/{maxRetries})
              </button>
            )}

            {/* 重新加载页面按钮 */}
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新加载页面
            </button>

            {/* 返回首页按钮 */}
            <button
              onClick={this.handleGoHome}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </button>
          </div>

          {/* 详细错误信息按钮（仅开发环境） */}
          {showErrorDetails && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={this.handleShowDetails}
                className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                查看详细错误信息 (控制台)
              </button>
            </div>
          )}

          {/* 联系支持信息 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              如果问题持续存在，请联系技术支持
            </p>
            <p className="text-sm text-gray-500 text-center mt-1">
              请提供错误ID: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{errorId}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }
}

// 错误边界包装器组件
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
  customErrorMessage?: string;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  ...props
}) => (
  <ErrorBoundary {...props}>
    {children}
  </ErrorBoundary>
);

// 高阶组件：为组件添加错误边界
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// 错误边界Hook（用于函数组件）
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    setErrorInfo(errorInfo || null);
  }, []);

  React.useEffect(() => {
    if (error) {
      console.error('useErrorBoundary捕获到错误:', error);
      if (errorInfo) {
        console.error('错误信息:', errorInfo);
      }
    }
  }, [error, errorInfo]);

  return {
    error,
    errorInfo,
    resetError,
    captureError
  };
}

// 默认导出
export default ErrorBoundary;
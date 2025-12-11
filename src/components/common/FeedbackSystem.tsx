/**
 * 反馈系统组件
 * 创建时间: 2025-12-09
 * 描述: 收集用户反馈和建议，支持反馈类型分类、优先级设置、截图上传等功能
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Bug,
  Lightbulb,
  ThumbsUp,
  Camera,
  FileText,
  Star,
  Loader2
} from 'lucide-react';

// 反馈类型枚举
export enum FeedbackType {
  BUG = 'bug',
  SUGGESTION = 'suggestion',
  IMPROVEMENT = 'improvement',
  QUESTION = 'question',
  PRAISE = 'praise'
}

// 反馈优先级枚举
export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 反馈数据接口
interface FeedbackData {
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  description: string;
  email?: string;
  attachments: File[];
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

// 反馈配置接口
interface FeedbackConfig {
  apiEndpoint?: string;
  enableScreenshots?: boolean;
  enableFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  showEmailField?: boolean;
  customFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select';
    options?: string[];
    required?: boolean;
  }>;
}

interface FeedbackSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (feedback: FeedbackData) => Promise<void>;
  config?: FeedbackConfig;
  className?: string;
}

// 默认配置
const defaultConfig: FeedbackConfig = {
  apiEndpoint: '/api/feedback',
  enableScreenshots: true,
  enableFileUpload: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  showEmailField: true,
  customFields: []
};

// 反馈类型配置
const feedbackTypeConfig = {
  [FeedbackType.BUG]: {
    icon: Bug,
    label: '问题报告',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    placeholder: '请详细描述您遇到的问题，包括重现步骤、预期行为和实际行为...'
  },
  [FeedbackType.SUGGESTION]: {
    icon: Lightbulb,
    label: '功能建议',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    placeholder: '请描述您的功能建议，包括使用场景和预期效果...'
  },
  [FeedbackType.IMPROVEMENT]: {
    icon: ThumbsUp,
    label: '改进意见',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    placeholder: '请描述您认为可以改进的地方...'
  },
  [FeedbackType.QUESTION]: {
    icon: MessageCircle,
    label: '使用问题',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    placeholder: '请描述您在使用过程中遇到的疑问...'
  },
  [FeedbackType.PRAISE]: {
    icon: Star,
    label: '表扬鼓励',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    placeholder: '请分享您的使用体验和满意之处...'
  }
};

// 优先级配置
const priorityConfig = {
  [FeedbackPriority.LOW]: {
    label: '低',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  [FeedbackPriority.MEDIUM]: {
    label: '中',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [FeedbackPriority.HIGH]: {
    label: '高',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  [FeedbackPriority.URGENT]: {
    label: '紧急',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
};

const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  isOpen,
  onClose,
  onSubmit,
  config = {},
  className = ''
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedType, setSelectedType] = useState<FeedbackType>(FeedbackType.BUG);
  const [selectedPriority, setSelectedPriority] = useState<FeedbackPriority>(FeedbackPriority.MEDIUM);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 重置表单
  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setEmail('');
    setAttachments([]);
    setCustomFieldValues({});
    setErrors({});
    setSubmitStatus('idle');
    setSelectedType(FeedbackType.BUG);
    setSelectedPriority(FeedbackPriority.MEDIUM);
  }, []);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入标题';
    }

    if (!description.trim()) {
      newErrors.description = '请输入描述';
    }

    if (finalConfig.showEmailField && !email.trim()) {
      newErrors.email = '请输入邮箱地址';
    } else if (finalConfig.showEmailField && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    // 验证自定义字段
    finalConfig.customFields?.forEach(field => {
      if (field.required && !customFieldValues[field.name]?.trim()) {
        newErrors[field.name] = `请输入${field.label}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, email, customFieldValues, finalConfig]);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // 验证文件
    const validFiles = files.filter(file => {
      if (file.size > (finalConfig.maxFileSize || 5 * 1024 * 1024)) {
        setErrors(prev => ({
          ...prev,
          file: `文件 ${file.name} 超过大小限制 (${Math.round((finalConfig.maxFileSize || 5 * 1024 * 1024) / 1024 / 1024)}MB)`
        }));
        return false;
      }

      if (finalConfig.allowedFileTypes && !finalConfig.allowedFileTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          file: `文件 ${file.name} 类型不支持`
        }));
        return false;
      }

      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    setErrors(prev => ({ ...prev, file: '' }));
  }, [finalConfig]);

  // 移除附件
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 截图功能
  const takeScreenshot = useCallback(async () => {
    try {
      // 检查是否支持截图API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setErrors(prev => ({
          ...prev,
          screenshot: '您的浏览器不支持截图功能'
        }));
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      } as MediaStreamConstraints);

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
              setAttachments(prev => [...prev, file]);
            }
            stream.getTracks().forEach(track => track.stop());
          }, 'image/png');
        }
      };
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        screenshot: '截图失败，请检查浏览器权限设置'
      }));
    }
  }, []);

  // 提交反馈
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const feedback: FeedbackData = {
        type: selectedType,
        priority: selectedPriority,
        title: title.trim(),
        description: description.trim(),
        email: finalConfig.showEmailField ? email.trim() : undefined,
        attachments,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: 'current-user-id', // 这里应该从用户上下文获取
        userName: 'current-user-name' // 这里应该从用户上下文获取
      };

      // 添加自定义字段数据
      finalConfig.customFields?.forEach(field => {
        (feedback as any)[field.name] = customFieldValues[field.name];
      });

      if (onSubmit) {
        await onSubmit(feedback);
      } else {
        // 默认提交逻辑
        const formData = new FormData();
        
        // 添加基本字段
        Object.entries(feedback).forEach(([key, value]) => {
          if (key !== 'attachments') {
            formData.append(key, String(value));
          }
        });

        // 添加文件
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });

        // 发送到服务器
        const response = await fetch(finalConfig.apiEndpoint || '/api/feedback', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('提交失败');
        }
      }

      setSubmitStatus('success');
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('反馈提交失败:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedType,
    selectedPriority,
    title,
    description,
    email,
    attachments,
    customFieldValues,
    finalConfig,
    onSubmit,
    validateForm,
    resetForm,
    onClose
  ]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, resetForm, onClose]);

  if (!isOpen) return null;

  const typeConfig = feedbackTypeConfig[selectedType];
  const priorityConfigItem = priorityConfig[selectedPriority];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">用户反馈</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 反馈类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                反馈类型
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(feedbackTypeConfig).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type as FeedbackType)}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      selectedType === type
                        ? `${config.borderColor} ${config.bgColor} ${config.color}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <config.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 优先级选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级
              </label>
              <div className="flex space-x-3">
                {Object.entries(priorityConfig).map(([priority, config]) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setSelectedPriority(priority as FeedbackPriority)}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      selectedPriority === priority
                        ? `${config.bgColor} ${config.color} border-transparent`
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请简要描述问题或建议..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                详细描述 *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={typeConfig.placeholder}
                rows={5}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* 邮箱 */}
            {finalConfig.showEmailField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址 *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="用于接收处理结果通知"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            )}

            {/* 自定义字段 */}
            {finalConfig.customFields?.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => setCustomFieldValues(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      errors[field.name] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => setCustomFieldValues(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.name] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  >
                    <option value="">请选择...</option>
                    {field.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => setCustomFieldValues(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field.name] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                  />
                )}
                {errors[field.name] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                )}
              </div>
            ))}

            {/* 附件上传 */}
            {finalConfig.enableFileUpload && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  附件
                </label>
                
                {/* 上传按钮 */}
                <div className="flex space-x-3 mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={finalConfig.allowedFileTypes?.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>选择文件</span>
                  </button>
                  
                  {finalConfig.enableScreenshots && (
                    <button
                      type="button"
                      onClick={takeScreenshot}
                      disabled={isSubmitting}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                      <span>截图</span>
                    </button>
                  )}
                </div>

                {/* 文件列表 */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(file.size / 1024)}KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          disabled={isSubmitting}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 错误信息 */}
                {errors.file && (
                  <p className="mt-1 text-sm text-red-600">{errors.file}</p>
                )}
                {errors.screenshot && (
                  <p className="mt-1 text-sm text-red-600">{errors.screenshot}</p>
                )}
              </div>
            )}

            {/* 提交状态 */}
            {submitStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">反馈提交成功！感谢您的宝贵意见。</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800">提交失败，请稍后重试。</span>
              </div>
            )}
          </form>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>提交中...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>提交反馈</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 快速反馈按钮组件
interface QuickFeedbackButtonProps {
  onClick: () => void;
  className?: string;
  showLabel?: boolean;
}

export const QuickFeedbackButton: React.FC<QuickFeedbackButtonProps> = ({
  onClick,
  className = '',
  showLabel = true
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40 ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      {showLabel && <span>反馈</span>}
    </button>
  );
};

// 反馈统计组件
interface FeedbackStatsProps {
  feedbackCount?: number;
  responseRate?: number;
  avgResponseTime?: number;
}

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  feedbackCount = 0,
  responseRate = 0,
  avgResponseTime = 0
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-700">总反馈数</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-2">{feedbackCount}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-medium text-gray-700">响应率</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-2">{responseRate}%</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center space-x-2">
          <Info className="w-5 h-5 text-yellow-600" />
          <h3 className="text-sm font-medium text-gray-700">平均响应时间</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-2">{avgResponseTime}h</p>
      </div>
    </div>
  );
};

export default FeedbackSystem;
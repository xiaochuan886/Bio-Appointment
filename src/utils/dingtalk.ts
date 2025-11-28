/**
 * 钉钉 JSAPI SDK 工具类
 * 用于在钉钉客户端中调用钉钉提供的各种能力
 */

import * as dd from 'dingtalk-jsapi';
import type { DingTalkConfig } from '@/types/types';

class DingTalkSDK {
  private config: DingTalkConfig | null = null;
  private initialized = false;

  /**
   * 检测是否在钉钉环境中
   */
  isDingTalk(): boolean {
    return dd.env.platform !== 'notInDingTalk';
  }

  /**
   * 获取钉钉环境信息
   */
  getEnv() {
    return {
      platform: dd.env.platform, // ios, android, pc, notInDingTalk
      version: dd.version,
    };
  }

  /**
   * 初始化钉钉 JSAPI
   * @param config 钉钉配置
   */
  async init(config: DingTalkConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.config = config;

    return new Promise((resolve, reject) => {
      dd.ready(() => {
        this.initialized = true;
        console.log('钉钉 JSAPI 初始化成功');
        resolve();
      });

      dd.error((err: any) => {
        console.error('钉钉 JSAPI 初始化失败:', err);
        reject(err);
      });
    });
  }

  /**
   * 获取免登授权码
   * 用于后端换取用户信息
   */
  async getAuthCode(): Promise<string> {
    if (!this.isDingTalk()) {
      throw new Error('不在钉钉环境中');
    }

    if (!this.config?.corpId) {
      throw new Error('未配置 corpId');
    }

    return new Promise((resolve, reject) => {
      dd.runtime.permission.requestAuthCode({
        corpId: this.config!.corpId,
      } as any).then((result: { code: string }) => {
        resolve(result.code);
      }).catch((err: any) => {
        reject(new Error(`获取授权码失败: ${err.errorMessage || err}`));
      });
    });
  }

  /**
   * 设置导航栏标题
   */
  async setTitle(title: string): Promise<void> {
    if (!this.isDingTalk()) return;

    return new Promise((resolve, reject) => {
      dd.biz.navigation.setTitle({
        title,
      } as any).then(() => resolve()).catch((err: any) => reject(err));
    });
  }

  /**
   * 设置导航栏右侧按钮
   */
  async setRight(options: {
    show: boolean;
    text?: string;
    control?: boolean;
    onSuccess?: () => void;
  }): Promise<void> {
    if (!this.isDingTalk()) return;

    return new Promise((resolve, reject) => {
      dd.biz.navigation.setRight(options as any).then(() => {
        options.onSuccess?.();
        resolve();
      }).catch((err: any) => reject(err));
    });
  }

  /**
   * 关闭当前页面
   */
  async close(): Promise<void> {
    if (!this.isDingTalk()) {
      window.close();
      return;
    }

    return new Promise((resolve, reject) => {
      dd.biz.navigation.close({
        onSuccess: () => resolve(),
        onFail: (err: any) => reject(err),
      });
    });
  }

  /**
   * 调用钉钉扫码功能
   */
  async scan(): Promise<string> {
    if (!this.isDingTalk()) {
      throw new Error('不在钉钉环境中');
    }

    return new Promise((resolve, reject) => {
      dd.biz.util.scan({
        type: 'all', // 支持所有类型的码
        onSuccess: (result: { text: string }) => {
          resolve(result.text);
        },
        onFail: (err: any) => {
          reject(new Error(`扫码失败: ${err.errorMessage || err}`));
        },
      });
    });
  }

  /**
   * 显示 Toast 提示
   */
  async showToast(options: {
    text: string;
    duration?: number;
    icon?: 'success' | 'error' | 'none';
  }): Promise<void> {
    if (!this.isDingTalk()) {
      // 在非钉钉环境中，可以使用其他 toast 库
      console.log('Toast:', options.text);
      return;
    }

    return new Promise((resolve) => {
      dd.device.notification.toast({
        text: options.text,
        duration: options.duration || 2,
        icon: options.icon || 'none',
      } as any).then(() => resolve()).catch(() => resolve());
    });
  }

  /**
   * 显示 Alert 对话框
   */
  async showAlert(options: {
    title?: string;
    message: string;
    buttonName?: string;
  }): Promise<void> {
    if (!this.isDingTalk()) {
      alert(options.message);
      return;
    }

    return new Promise((resolve, reject) => {
      dd.device.notification.alert({
        title: options.title || '提示',
        message: options.message,
        buttonName: options.buttonName || '确定',
      } as any).then(() => resolve()).catch((err: any) => reject(err));
    });
  }

  /**
   * 显示 Confirm 确认框
   */
  async showConfirm(options: {
    title?: string;
    message: string;
    buttonLabels?: string[];
  }): Promise<number> {
    if (!this.isDingTalk()) {
      return confirm(options.message) ? 0 : 1;
    }

    return new Promise((resolve, reject) => {
      dd.device.notification.confirm({
        title: options.title || '确认',
        message: options.message,
        buttonLabels: options.buttonLabels || ['确定', '取消'],
      } as any).then((result: { buttonIndex: number }) => {
        resolve(result.buttonIndex);
      }).catch((err: any) => reject(err));
    });
  }

  /**
   * 分享内容
   */
  async share(options: {
    type: number; // 0:全部, 1:钉钉, 2:微信
    title: string;
    text?: string;
    url?: string;
    image?: string;
  }): Promise<void> {
    if (!this.isDingTalk()) {
      throw new Error('不在钉钉环境中');
    }

    return new Promise((resolve, reject) => {
      dd.biz.util.share(options as any).then(() => resolve()).catch((err: any) => {
        reject(new Error(`分享失败: ${err.errorMessage || err}`));
      });
    });
  }

  /**
   * 获取地理位置
   */
  async getLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }> {
    if (!this.isDingTalk()) {
      throw new Error('不在钉钉环境中');
    }

    return new Promise((resolve, reject) => {
      dd.device.geolocation.get({
        targetAccuracy: 200,
        coordinate: 1, // 0:火星坐标, 1:WGS84坐标
        withReGeocode: false,
        useCache: true,
      } as any).then((result: {
        latitude: number;
        longitude: number;
        accuracy: number;
      }) => {
        resolve(result);
      }).catch((err: any) => {
        reject(new Error(`获取位置失败: ${err.errorMessage || err}`));
      });
    });
  }

  /**
   * 预览图片
   */
  async previewImage(options: {
    urls: string[];
    current?: string;
  }): Promise<void> {
    if (!this.isDingTalk()) {
      // 在非钉钉环境中，可以使用其他图片预览库
      window.open(options.urls[0]);
      return;
    }

    return new Promise((resolve, reject) => {
      dd.biz.util.previewImage({
        urls: options.urls,
        current: options.current || options.urls[0],
      } as any).then(() => resolve()).catch((err: any) => reject(err));
    });
  }

  /**
   * 打开链接
   */
  async openLink(url: string): Promise<void> {
    if (!this.isDingTalk()) {
      window.open(url);
      return;
    }

    return new Promise((resolve, reject) => {
      dd.biz.util.openLink({
        url,
      } as any).then(() => resolve()).catch((err: any) => reject(err));
    });
  }

  /**
   * 获取网络状态
   */
  async getNetworkType(): Promise<string> {
    if (!this.isDingTalk()) {
      return 'unknown';
    }

    return new Promise((resolve, reject) => {
      dd.device.connection.getNetworkType({
        onSuccess: (result: { result: string }) => {
          resolve(result.result); // wifi, 3g, 4g, 5g, unknown, none
        },
        onFail: (err: any) => reject(err),
      });
    });
  }
}

// 导出单例
export const dingTalkSDK = new DingTalkSDK();

// 导出类型
export type { DingTalkConfig };

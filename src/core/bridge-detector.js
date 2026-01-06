/**
 * Native Bridge 检测器
 */
import Logger from '../utils/logger.js';

const logger = new Logger('[BridgeDetector]');

/**
 * Bridge 类型枚举
 */
export const BridgeType = {
  NATIVE_BRIDGE: 'native-bridge',
  CAPACITOR: 'capacitor',
  CUSTOM: 'custom',
  WEBKIT: 'webkit',
  PROMPT: 'prompt',
  NONE: 'none'
};

/**
 * 检测可用的 Native Bridge
 * @returns {Object|null} Bridge 实例
 */
export function detectNativeBridge() {
  // 1️⃣ 优先：通用 NativeBridge
  if (typeof window !== 'undefined' && window.NativeBridge?.isNative?.()) {
    logger.success('检测到通用 NativeBridge');
    return {
      type: BridgeType.NATIVE_BRIDGE,
      setRouteConfig: (config) => window.NativeBridge.call('setRouteConfig', config),
      on: (event, handler) => window.NativeBridge.on(event, handler),
      send: (method, data) => window.NativeBridge.send(method, data),
      isNative: () => true
    };
  }

  // 2️⃣ Capacitor Plugin
  if (typeof window !== 'undefined' && 
      window.Capacitor?.Plugins?.NativeConfig) {
    logger.success('检测到 Capacitor NativeConfig Plugin');
    return {
      type: BridgeType.CAPACITOR,
      setRouteConfig: (config) => window.Capacitor.Plugins.NativeConfig.setRouteConfig(config),
      isNative: () => true
    };
  }

  // 3️⃣ 自定义 Bridge
  if (typeof window !== 'undefined' && window.NativeConfig) {
    logger.success('检测到自定义 NativeConfig Bridge');
    return {
      type: BridgeType.CUSTOM,
      setRouteConfig: (config) => window.NativeConfig.setRouteConfig(config),
      isNative: () => true
    };
  }

  if (typeof window !== 'undefined' && 
      window.webkit?.messageHandlers?.NativeConfig) {
    logger.success('检测到 iOS WebKit Bridge');
    return createWebKitBridge();
  }

  if (typeof window !== 'undefined' && window.smartOrderingApp) {
    logger.success('检测到 smartOrderingApp (Prompt 模式)');
    return createPromptBridge();
  }

  logger.warn('未检测到 Native Bridge，将在 Web 模式运行');
  return null;
}

/**
 * 创建 iOS WebKit Bridge 适配器
 * @returns {Object}
 */
function createWebKitBridge() {
  if (typeof window === 'undefined') return null;

  // 初始化回调管理器
  if (!window.__callbacks) {
    window.__callbacks = {};
  }

  return {
    type: BridgeType.WEBKIT,
    
    setRouteConfig(config) {
      return new Promise((resolve, reject) => {
        const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 注册回调
        window.__callbacks[callbackId] = (response) => {
          resolve(response);
          delete window.__callbacks[callbackId];
        };

        // 发送消息
        try {
          window.webkit.messageHandlers.NativeConfig.postMessage({
            method: 'setRouteConfig',
            params: config,
            callbackId: callbackId
          });
        } catch (error) {
          delete window.__callbacks[callbackId];
          reject(error);
        }

        // 超时处理
        setTimeout(() => {
          if (window.__callbacks[callbackId]) {
            delete window.__callbacks[callbackId];
            reject(new Error('iOS Bridge 调用超时'));
          }
        }, 5000);
      });
    },

    isNative: () => true
  };
}

/**
 * 创建 Prompt Bridge 适配器（旧版 Android）
 * @returns {Object}
 */
function createPromptBridge() {
  if (typeof window === 'undefined') return null;

  return {
    type: BridgeType.PROMPT,

    setRouteConfig(config) {
      return new Promise((resolve, reject) => {
        try {
          const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const request = {
            method: 'setRouteConfig',
            params: config,
            callbackId: callbackId
          };

          // 注册回调
          if (!window.smartOrderingApp) {
            window.smartOrderingApp = {};
          }

          window.smartOrderingApp[`$${callbackId}`] = (response) => {
            resolve(response);
            delete window.smartOrderingApp[`$${callbackId}`];
          };

          // 发送请求
          window.prompt(JSON.stringify(request));

          // 超时处理
          setTimeout(() => {
            if (window.smartOrderingApp[`$${callbackId}`]) {
              delete window.smartOrderingApp[`$${callbackId}`];
              reject(new Error('Prompt Bridge 调用超时'));
            }
          }, 10000);

        } catch (error) {
          reject(error);
        }
      });
    },

    isNative: () => true
  };
}

/**
 * 检查是否在 Native 环境
 * @returns {boolean}
 */
export function isNativeEnvironment() {
  const bridge = detectNativeBridge();
  return bridge !== null && bridge.isNative();
}
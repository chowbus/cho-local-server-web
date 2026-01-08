/*!
 * @chowbus/edge-sdk v1.0.0
 * (c) 2026 Chowbus Engineering Team
 * Released under MIT License
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.EdgeSDK = factory());
})(this, (function () { 'use strict';

  /**
   * 日志工具类
   */
  class Logger {
    constructor(prefix = '[EdgeSDK]', enabled = true) {
      this.prefix = prefix;
      this.enabled = enabled;
    }

    setEnabled(enabled) {
      this.enabled = enabled;
    }

    log(message, data) {
      if (!this.enabled) return;
      if (data !== undefined) {
        console.log(`${this.prefix} ${message}`, data);
      } else {
        console.log(`${this.prefix} ${message}`);
      }
    }

    warn(message, data) {
      if (!this.enabled) return;
      if (data !== undefined) {
        console.warn(`${this.prefix} ⚠️ ${message}`, data);
      } else {
        console.warn(`${this.prefix} ⚠️ ${message}`);
      }
    }

    error(message, error) {
      if (!this.enabled) return;
      if (error !== undefined) {
        console.error(`${this.prefix} ❌ ${message}`, error);
      } else {
        console.error(`${this.prefix} ❌ ${message}`);
      }
    }

    success(message, data) {
      if (!this.enabled) return;
      if (data !== undefined) {
        console.log(`${this.prefix} ✅ ${message}`, data);
      } else {
        console.log(`${this.prefix} ✅ ${message}`);
      }
    }
  }

  /**
   * Native Bridge 检测器
   */

  const logger$3 = new Logger('[BridgeDetector]');

  /**
   * Bridge 类型枚举
   */
  const BridgeType = {
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
  function detectNativeBridge() {
    // 1️⃣ 优先：通用 NativeBridge
    if (typeof window !== 'undefined' && window.NativeBridge?.isNative?.()) {
      logger$3.success('检测到通用 NativeBridge');
      return {
        type: BridgeType.NATIVE_BRIDGE,
        setRouteConfig: (config) => window.NativeBridge.call('localServerConnectionStatusChanged', config),
        on: (event, handler) => window.NativeBridge.on(event, handler),
        send: (method, data) => window.NativeBridge.send(method, data),
        isNative: () => true
      };
    }

    // 2️⃣ Capacitor Plugin
    if (typeof window !== 'undefined' && 
        window.Capacitor?.Plugins?.NativeConfig) {
      logger$3.success('检测到 Capacitor NativeConfig Plugin');
      return {
        type: BridgeType.CAPACITOR,
        setRouteConfig: (config) => window.Capacitor.Plugins.NativeConfig.setRouteConfig(config),
        isNative: () => true
      };
    }

    // 3️⃣ 自定义 Bridge
    if (typeof window !== 'undefined' && window.NativeConfig) {
      logger$3.success('检测到自定义 NativeConfig Bridge');
      return {
        type: BridgeType.CUSTOM,
        setRouteConfig: (config) => window.NativeConfig.setRouteConfig(config),
        isNative: () => true
      };
    }

    if (typeof window !== 'undefined' && 
        window.webkit?.messageHandlers?.NativeConfig) {
      logger$3.success('检测到 iOS WebKit Bridge');
      return createWebKitBridge();
    }

    if (typeof window !== 'undefined' && window.smartOrderingApp) {
      logger$3.success('检测到 smartOrderingApp (Prompt 模式)');
      return createPromptBridge();
    }

    logger$3.warn('未检测到 Native Bridge，将在 Web 模式运行');
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
   * 健康检查器
   */

  const logger$2 = new Logger('[HealthChecker]');

  /**
   * 健康检查类
   */
  class HealthChecker {
    constructor(config) {
      this.config = config;
      this.isAlive = false;
      this.timer = null;
      this.checkInProgress = false;
    }

    /**
     * 执行单次健康检查
     * @returns {Promise<boolean>} 是否可用
     */
    async check() {
      // 防止并发检查
      if (this.checkInProgress) {
        logger$2.warn('健康检查正在进行中，跳过本次检查');
        return this.isAlive;
      }

      this.checkInProgress = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.healthCheckTimeout
        );

        const response = await fetch(this.config.localServerHealth, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-cache',
          headers: {
            'X-Health-Check': 'true'
          }
        });

        clearTimeout(timeoutId);

        const isAlive = response.ok;
        const statusChanged = this.isAlive !== isAlive;

        if (statusChanged) {
          const oldState = this.isAlive ? 'ALIVE' : 'DOWN';
          const newState = isAlive ? 'ALIVE' : 'DOWN';
          logger$2.log(`🔄 状态变化: ${oldState} → ${newState}`);
        }

        this.isAlive = isAlive;
        return isAlive;

      } catch (error) {
        const wasAlive = this.isAlive;
        this.isAlive = false;

        if (wasAlive) {
          logger$2.warn('Local Server 不可用', error.message);
        }

        return false;

      } finally {
        this.checkInProgress = false;
      }
    }

    /**
     * 启动定时检查
     * @param {Function} onStatusChange 状态变化回调
     */
    start(onStatusChange) {
      if (this.timer) {
        logger$2.warn('健康检查已在运行中');
        return;
      }

      logger$2.log(`启动健康检查，间隔 ${this.config.healthCheckInterval}ms`);

      // 立即执行一次
      this.check().then((isAlive) => {
        if (onStatusChange) {
          onStatusChange(isAlive);
        }
      });

      // 启动定时器
      this.timer = setInterval(async () => {
        const previousState = this.isAlive;
        const currentState = await this.check();

        // 状态变化时触发回调
        if (previousState !== currentState && onStatusChange) {
          onStatusChange(currentState);
        }
      }, this.config.healthCheckInterval);
    }

    /**
     * 停止定时检查
     */
    stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        logger$2.log('健康检查已停止');
      }
    }

    /**
     * 获取当前状态
     * @returns {boolean}
     */
    getStatus() {
      return this.isAlive;
    }

    /**
     * 重置状态
     */
    reset() {
      this.isAlive = false;
      this.checkInProgress = false;
    }
  }

  /**
   * 配置管理器
   */

  const logger$1 = new Logger('[ConfigManager]');

  /**
   * 默认配置
   */
  const DEFAULT_CONFIG = {
    localServerHealth: '',
    healthCheckInterval: 5000,
    healthCheckTimeout: 3000,
    whiteList: [],
    blackList: [],
    enableLog: true
  };

  /**
   * 配置管理类
   */
  class ConfigManager {
    constructor() {
      this.config = { ...DEFAULT_CONFIG };
    }

    /**
     * 设置配置
     * @param {Object} options 
     */
    setConfig(options = {}) {
      // 验证必填字段
      if (!options.localServerHealth) {
        throw new Error('localServerHealth 是必填参数');
      }

      // 验证白名单
      if (!Array.isArray(options.whiteList)) {
        throw new Error('whiteList 必须是非空数组');
      }

      // 合并配置
      this.config = {
        ...DEFAULT_CONFIG,
        ...options
      };

      // 验证数值类型
      if (typeof this.config.healthCheckInterval !== 'number' || this.config.healthCheckInterval < 1000) {
        throw new Error('healthCheckInterval 必须是大于等于 1000 的数字');
      }

      if (typeof this.config.healthCheckTimeout !== 'number' || this.config.healthCheckTimeout < 500) {
        throw new Error('healthCheckTimeout 必须是大于等于 500 的数字');
      }

      logger$1.log('配置已更新', {
        localServerHealth: this.config.localServerHealth,
        healthCheckInterval: this.config.healthCheckInterval,
        healthCheckTimeout: this.config.healthCheckTimeout,
        whiteListCount: this.config.whiteList.length,
        blackListCount: this.config.blackList.length,
        isLocalServerFirst: this.config.isLocalServerFirst
      });
    }

    /**
     * 获取配置
     * @returns {Object}
     */
    getConfig() {
      return { ...this.config };
    }

    /**
     * 更新白名单
     * @param {string[]} whiteList 
     */
    updateWhiteList(whiteList) {
      if (!Array.isArray(whiteList)) {
        throw new Error('whiteList 必须是数组');
      }

      this.config.whiteList = whiteList;
      logger$1.log(`白名单已更新，数量: ${whiteList.length}`);
    }

    /**
     * 更新黑名单
     * @param {string[]} blackList 
     */
    updateBlackList(blackList) {
      if (!Array.isArray(blackList)) {
        throw new Error('blackList 必须是数组');
      }

      this.config.blackList = blackList;
      logger$1.log(`黑名单已更新，数量: ${blackList.length}`);
    }

    /**
     * 生成 Native 配置对象
     * @param {boolean} isLocalAlive - Local Server 是否可用
     * @returns {Object} Native 配置对象
     * @returns {string[]} return.whiteList - 白名单列表
     * @returns {string[]} return.blackList - 黑名单列表
     * @returns {boolean} return.isAllLocalServer - 是否全部走 Local Server
     * @returns {boolean} return.isLocalServerFirst - 是否优先走 Local Server
     * @returns {boolean} return.isLocalServerEnabled - Local Server 心跳是否成功
     */
    generateNativeConfig(isLocalAlive) {
      return {
        whiteList: isLocalAlive ? this.config.whiteList : [],
        blackList: this.config.blackList,
        isAllLocalServer: isLocalAlive,
        isLocalServerFirst: this.config.isLocalServerFirst,
        isLocalServerEnabled: isLocalAlive
      };
    }
  }

  /**
   * 事件触发器
   */

  /**
   * 事件名称常量
   */
  const EventNames = {
    CONFIG_CHANGE: 'edgesdk:config:change',
    NATIVE_BRIDGE_ERROR: 'edgesdk:bridge:error'
  };

  /**
   * 触发自定义事件
   * @param {string} eventName 事件名
   * @param {Object} detail 事件数据
   */
  function dispatchEvent(eventName, detail) {
    if (typeof window === 'undefined') {
      return;
    }

    const event = new CustomEvent(eventName, {
      detail: {
        ...detail,
        timestamp: Date.now()
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * 触发配置变更事件
   * @param {boolean} isLocalAlive 
   * @param {Object} config 
   */
  function dispatchConfigChangeEvent(isLocalAlive, config) {
    dispatchEvent(EventNames.CONFIG_CHANGE, {
      isLocalAlive,
      config
    });
  }

  /**
   * 触发 Native Bridge 错误事件
   * @param {Error} error 
   */
  function dispatchNativeBridgeErrorEvent(error) {
    dispatchEvent(EventNames.NATIVE_BRIDGE_ERROR, {
      error: error.message
    });
  }

  /**
   * Edge SDK - 主入口
   * @module @chowbus/edge-sdk
   */


  const logger = new Logger('[EdgeSDK]');

  /**
   * Edge SDK 主类
   */
  class EdgeSDK {
    constructor() {
      this.initialized = false;
      this.configManager = new ConfigManager();
      this.healthChecker = null;
      this.nativeBridge = null;
      this.bridgeType = BridgeType.NONE;
    }

    /**
     * 初始化 SDK
     * @param {Object} options 配置选项
     * @param {string} options.localServerHealth - Local Server 健康检查 URL
     * @param {number} [options.healthCheckInterval=5000] - 健康检查间隔（毫秒）
     * @param {number} [options.healthCheckTimeout=3000] - 健康检查超时（毫秒）
     * @param {string[]} options.whiteList - 域名白名单
     * @param {string[]} [options.blackList=[]] - 域名黑名单
     * @param {boolean} [options.enableLog=true] - 是否启用日志
     * @param {boolean} options.isLocalServerFirst - 是否优先使用 Local Server
     * @returns {Promise<void>}
     */
    async init(options = {}) {
      if (this.initialized) {
        logger.warn('SDK 已初始化，跳过重复初始化');
        return;
      }

      try {
        logger.log('🚀 初始化中...');

        // 1. 设置配置
        this.configManager.setConfig(options);
        const config = this.configManager.getConfig();

        // 2. 设置日志开关
        logger.setEnabled(config.enableLog);

        // 3. 检测 Native Bridge
        this.nativeBridge = detectNativeBridge();
        if (this.nativeBridge) {
          this.bridgeType = this.nativeBridge.type;
          logger.success(`Native Bridge 已连接: ${this.bridgeType}`);
        } else {
          this.bridgeType = BridgeType.NONE;
          logger.warn('Native Bridge 不可用，运行在 Web 模式');
        }

        // 4. 初始化健康检查器
        this.healthChecker = new HealthChecker(config);

        // 5. 启动健康检查
        this.healthChecker.start(async (isAlive) => {
          await this.handleHealthStatusChange(isAlive);
        });

        this.initialized = true;
        logger.success('✅ 初始化完成');

      } catch (error) {
        logger.error('初始化失败', error);
        throw error;
      }
    }

    /**
     * 处理健康状态变化
     * @param {boolean} isAlive 
     * @private
     */
    async handleHealthStatusChange(isAlive) {
      const config = this.configManager.generateNativeConfig(isAlive);

      logger.log('📤 更新 Native 配置', {
        isLocalAlive: isAlive,
        whiteListCount: config.whiteList.length,
        blackListCount: config.blackList.length
      });

      // 通知 Native
      if (this.nativeBridge) {
        try {
          await this.nativeBridge.setRouteConfig(config);
          logger.success('Native 配置已更新');
        } catch (error) {
          logger.error('Native 配置更新失败', error);
          dispatchNativeBridgeErrorEvent(error);
        }
      }

      // 触发自定义事件
      dispatchConfigChangeEvent(isAlive, config);
    }

    /**
     * 获取当前状态
     * @returns {Object}
     */
    getStatus() {
      if (!this.initialized) {
        return {
          initialized: false,
          isLocalAlive: false,
          bridgeType: BridgeType.NONE,
          whiteList: [],
          blackList: [],
          isAllLocalServer: false
        };
      }

      const config = this.configManager.getConfig();
      const isLocalAlive = this.healthChecker.getStatus();

      return {
        initialized: true,
        isLocalAlive,
        bridgeType: this.bridgeType,
        whiteList: isLocalAlive ? config.whiteList : [],
        blackList: config.blackList,
        isAllLocalServer: isLocalAlive
      };
    }

    /**
     * 手动触发健康检查
     * @returns {Promise<boolean>} Local Server 是否可用
     */
    async manualCheck() {
      if (!this.initialized) {
        throw new Error('SDK 未初始化');
      }

      logger.log('🔍 手动健康检查');
      const isAlive = await this.healthChecker.check();

      // 触发状态更新
      await this.handleHealthStatusChange(isAlive);

      return isAlive;
    }

    /**
     * 动态更新白名单
     * @param {string[]} whiteList 
     */
    updateWhiteList(whiteList) {
      if (!this.initialized) {
        throw new Error('SDK 未初始化');
      }

      this.configManager.updateWhiteList(whiteList);

      // 立即更新 Native 配置
      const isAlive = this.healthChecker.getStatus();
      this.handleHealthStatusChange(isAlive);
    }

    /**
     * 动态更新黑名单
     * @param {string[]} blackList 
     */
    updateBlackList(blackList) {
      if (!this.initialized) {
        throw new Error('SDK 未初始化');
      }

      this.configManager.updateBlackList(blackList);

      // 立即更新 Native 配置
      const isAlive = this.healthChecker.getStatus();
      this.handleHealthStatusChange(isAlive);
    }

    /**
     * 销毁 SDK
     */
    destroy() {
      logger.log('🔄 销毁中...');

      if (this.healthChecker) {
        this.healthChecker.stop();
        this.healthChecker = null;
      }

      this.initialized = false;
      this.nativeBridge = null;
      this.bridgeType = BridgeType.NONE;

      logger.success('✅ 已销毁');
    }
  }

  // 创建单例实例
  const instance = new EdgeSDK();


  instance.EdgeSDK = EdgeSDK;

  return instance;

}));

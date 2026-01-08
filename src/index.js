/**
 * Edge SDK - 主入口
 * @module @chowbus/edge-sdk
 */

import Logger from './utils/logger.js';
import { detectNativeBridge, BridgeType } from './core/bridge-detector.js';
import HealthChecker from './core/health-checker.js';
import ConfigManager from './core/config-manager.js';
import { dispatchConfigChangeEvent, dispatchNativeBridgeErrorEvent } from './core/event-emitter.js';

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

export default instance;

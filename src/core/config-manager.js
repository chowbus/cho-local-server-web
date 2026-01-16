/**
 * 配置管理器
 */
import Logger from '../utils/logger.js';

const logger = new Logger('[ConfigManager]');

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
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

    // // 验证白名单
    // if (!Array.isArray(options.whiteList)) {
    //   throw new Error('whiteList 必须是非空数组');
    // }

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
    console.log('this.config', this.config.localServerHealth);
    logger.log('配置已更新', {
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
    logger.log(`白名单已更新，数量: ${whiteList.length}`);
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
    logger.log(`黑名单已更新，数量: ${blackList.length}`);
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

export default ConfigManager;
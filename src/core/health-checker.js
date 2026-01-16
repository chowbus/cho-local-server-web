/**
 * 健康检查器
 */
import Logger from '../utils/logger.js';

const logger = new Logger('[HealthChecker]');

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
      logger.warn('健康检查正在进行中，跳过本次检查');
      return this.isAlive;
    }

    this.checkInProgress = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.healthCheckTimeout
      );
      console.log('开始健康检查');
      console.log('this.config.localServerHealth', this.config.localServerHealth);
      const response = await fetch(this.config.localServerHealth, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'X-Health-Check': 'true'
        }
      });

      clearTimeout(timeoutId);
      console.log('健康检查结果', response);
      const isAlive = response.ok;
      const statusChanged = this.isAlive !== isAlive;

      if (statusChanged) {
        const oldState = this.isAlive ? 'ALIVE' : 'DOWN';
        const newState = isAlive ? 'ALIVE' : 'DOWN';
        logger.log(`🔄 状态变化: ${oldState} → ${newState}`);
      }

      this.isAlive = isAlive;
      return isAlive;

    } catch (error) {
      const wasAlive = this.isAlive;
      this.isAlive = false;

      if (wasAlive) {
        logger.warn('Local Server 不可用', error.message);
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
      logger.warn('健康检查已在运行中');
      return;
    }

    logger.log(`启动健康检查，间隔 ${this.config.healthCheckInterval}ms`);

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
      logger.log('健康检查已停止');
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

export default HealthChecker;
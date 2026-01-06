/**
 * 事件触发器
 */

/**
 * 事件名称常量
 */
export const EventNames = {
  CONFIG_CHANGE: 'edgesdk:config:change',
  HEALTH_CHECK_FAILED: 'edgesdk:health:failed',
  HEALTH_CHECK_SUCCESS: 'edgesdk:health:success',
  NATIVE_BRIDGE_ERROR: 'edgesdk:bridge:error'
};

/**
 * 触发自定义事件
 * @param {string} eventName 事件名
 * @param {Object} detail 事件数据
 */
export function dispatchEvent(eventName, detail) {
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
export function dispatchConfigChangeEvent(isLocalAlive, config) {
  dispatchEvent(EventNames.CONFIG_CHANGE, {
    isLocalAlive,
    config
  });
}

/**
 * 触发健康检查失败事件
 * @param {Error} error 
 */
export function dispatchHealthCheckFailedEvent(error) {
  dispatchEvent(EventNames.HEALTH_CHECK_FAILED, {
    error: error.message
  });
}

/**
 * 触发健康检查成功事件
 */
export function dispatchHealthCheckSuccessEvent() {
  dispatchEvent(EventNames.HEALTH_CHECK_SUCCESS, {});
}

/**
 * 触发 Native Bridge 错误事件
 * @param {Error} error 
 */
export function dispatchNativeBridgeErrorEvent(error) {
  dispatchEvent(EventNames.NATIVE_BRIDGE_ERROR, {
    error: error.message
  });
}
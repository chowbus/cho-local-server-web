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

export default Logger;
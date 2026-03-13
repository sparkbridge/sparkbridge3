const axios = require('axios');
// 兼容性导入 umami 实例
const umamiInstance = require('@umami/node').default || require('@umami/node');

class UmamiPrivateTracker {
    constructor() {
        this.enabled = false;
        this.initialized = false;
        this.queue = [];
        this.MAX_QUEUE_SIZE = 100; // 内存保护：最多缓存 100 条
        this.CONFIG_URL = 'https://sparkbridge.cn/v1/umami.json';

        // 启动异步加载
        this._initRemoteConfig();
    }

    /**
     * 使用 axios 获取远程配置
     */
    async _initRemoteConfig() {
        try {
            const response = await axios.get(this.CONFIG_URL, {
                timeout: 10000, // 给 100K 带宽留 10 秒缓冲
                // 即使是 404/500 也静默处理，不抛出异常到全局
                validateStatus: (status) => status === 200
            });

            const data = response.data;

            if (data && data.tracking === true && data.hostUrl && data.websiteId) {
                umamiInstance.init({
                    hostUrl: data.hostUrl,
                    websiteId: data.websiteId
                });
                this.enabled = true;
            }
        } catch (e) {
            // 【彻底静默】不打印 TimeoutError，不打印 404
        } finally {
            this.initialized = true;
            this._processQueue();
        }
    }

    /**
     * 处理缓存队列
     */
    _processQueue() {
        if (this.enabled && this.queue.length > 0) {
            this.queue.forEach(item => {
                this._execute(item.type, item.args);
            });
        }
        this.queue = []; // 无论是否开启追踪，都清空队列释放内存
    }

    /**
     * 内部执行器
     */
    _execute(type, args) {
        try {
            const method = type === 'event' ? 'track' : type;
            // 再次确保执行过程中的任何网络抖动都不会报错
            umamiInstance[method](...args).catch(() => { });
        } catch (e) {
            // 静默
        }
    }

    /**
     * 统一调度入口
     */
    _dispatch(type, args) {
        if (!this.initialized) {
            if (this.queue.length < this.MAX_QUEUE_SIZE) {
                this.queue.push({ type, args });
            }
            return;
        }

        if (this.enabled) {
            this._execute(type, args);
        }
    }

    // --- 对外接口 ---

    trackEvent(name, data = {}) {
        this._dispatch('event', [name, data]);
    }

    trackPage(url, title = '') {
        this._dispatch('track', [{ url, title }]);
    }

    identify(properties = {}) {
        this._dispatch('identify', [properties]);
    }
}

module.exports = new UmamiPrivateTracker();
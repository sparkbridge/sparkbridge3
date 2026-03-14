const axios = require('axios');
const umamiInstance = require('@umami/node').default || require('@umami/node');

class UmamiPrivateTracker {
    constructor() {
        this.enabled = false;
        this.initialized = false;
        this.queue = [];
        this.MAX_QUEUE_SIZE = 100;
        this.CONFIG_URL = 'https://sparkbridge.cn/v1/umami.json';

        // 1. 启动异步加载配置
        this._initRemoteConfig();

        // 2. 启动心跳 (每10分钟一次)
        this.heartpack();
        setInterval(() => this.heartpack(), 10 * 60 * 1000);

        // 3. 核心：启动队列消费循环，每秒只处理一个任务
        setInterval(() => this._consumeQueue(), 1000);
    }

    async _initRemoteConfig() {
        try {
            const response = await axios.get(this.CONFIG_URL, {
                timeout: 10000,
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
            // 静默处理
        } finally {
            this.initialized = true;
            // 注意：这里不再一次性处理队列，由定时器负责
        }
    }

    /**
     * 每秒执行一次的消费函数
     */
    _consumeQueue() {
        // 只有初始化完成、且开启了追踪、且队列里有东西时才执行
        if (!this.initialized || !this.enabled || this.queue.length === 0) {
            // 如果初始化完成但未开启追踪，直接清空队列释放内存
            if (this.initialized && !this.enabled) {
                this.queue = [];
            }
            return;
        }

        // 取出队列第一个任务
        const item = this.queue.shift();
        if (item) {
            this._execute(item.type, item.args);
        }
    }

    _execute(type, args) {
        try {
            const method = type === 'event' ? 'track' : type;
            umamiInstance[method](...args).catch(() => { });
        } catch (e) {
            // 静默
        }
    }

    /**
     * 统一调度入口：现在所有请求都必须排队
     */
    _dispatch(type, args) {
        // 如果初始化还没完成，或者开启了追踪，才允许入队
        // 增加队列上限保护，防止 0.5G 内存爆掉
        if (this.queue.length < this.MAX_QUEUE_SIZE) {
            this.queue.push({ type, args });
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

    heartpack() {
        this.trackPage('/heartpack', 'Heartbeat');
    }
}

module.exports = new UmamiPrivateTracker();
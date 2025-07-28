const { EventEmitter } = require("events");
const { v4: uuidv4 } = require('uuid');
const {getModuleLogger}= require('../../services/logger');

// 自訂事件觸發器 (含攔截器功能) - 保持不變
class CustomTrigger extends EventEmitter {
    constructor() { super(); this.interceptors = {}; }
    addInterceptor(event, interceptor) {
        if (!this.interceptors[event]) this.interceptors[event] = [];
        this.interceptors[event].push(interceptor);
    }
    trigger(event, ...args) {
        if (this.interceptors[event]) {
            for (const interceptor of this.interceptors[event]) {
                if (interceptor(...args) === false) return;
            }
        }
        this.emit(event, ...args);
    }
}

/**
 * 原生 OneBot v11 適配器基底類別
 */
class OneBot_v11_BaseAdapter {
    eventEmitter = new CustomTrigger();
    logger;
    accessToken;
    actionPromises = new Map();
    self_id = ''; // 直接使用 v11 的 self_id

    constructor(adapterName, accessToken) {
        this.logger = getModuleLogger(adapterName || 'OB_v11_Adapter');
        this.accessToken = accessToken;
        this.eventEmitter.setMaxListeners(0);
    }

    on(eventName, listener) { this.eventEmitter.on(eventName, listener); }
    emit(eventName, ...args) { this.eventEmitter.trigger(eventName, ...args); }

    /**
     * 【v11 核心】發送動作並等待響應
     * @param {object} payload - 包含 action 和 params 的 v11 動作物件
     * @returns {Promise<any>}
     */
    _sendAction(payload) {
        return new Promise((resolve, reject) => {
            const echo = uuidv4();
            const dataToSend = { ...payload, echo };

            const timeout = setTimeout(() => {
                this.actionPromises.delete(echo);
                reject(new Error(`Action [${payload.action}] with echo [${echo}] timed out`));
            }, 10000);

            this.actionPromises.set(echo, { resolve, reject });
            this._send(JSON.stringify(dataToSend));
        });
    }

    /**
     * 【v11 核心】處理傳入的 v11 事件或響應
     * @param {object} event - 原始 v11 事件/響應
     */
    _handleV11Event(event) {
        // 處理 API 響應
        if (event.echo && this.actionPromises.has(event.echo)) {
            const { resolve, reject } = this.actionPromises.get(event.echo);
            if (event.status === 'ok') {
                resolve(event.data);
            } else {
                reject(new Error(`Action failed: ${event.wording || 'Unknown error'}`));
            }
            this.actionPromises.delete(event.echo);
            return; // 響應處理完畢，不再作為事件發射
        }

        // 處理事件
        if (event.post_type) {
            // 構造 v11 風格的事件名稱
            const eventName = [
                event.post_type,
                event.message_type || event.notice_type || event.request_type || event.meta_event_type,
                event.sub_type
            ].filter(Boolean).join('.');

            if (event.post_type === 'meta_event' && event.meta_event_type === 'lifecycle' && event.sub_type === 'connect') {
                this.self_id = String(event.self_id);
                this.logger.info(`成功連接到机器人 [${this.self_id}]`);
                this.emit('bot.online', { self_id: this.self_id });
            }

            this.emit(eventName, event);
        }
    }

    // --- 提供與 v11 action 一一對應的公開方法 ---

    sendPrivateMsg(user_id, message, auto_escape = false) {
        return this._sendAction({
            action: 'send_private_msg',
            params: { user_id, message, auto_escape }
        });
    }

    sendGroupMsg(group_id, message, auto_escape = false) {
        return this._sendAction({
            action: 'send_group_msg',
            params: { group_id, message, auto_escape }
        });
    }

    getGroupMemberList(group_id) {
        return this._sendAction({
            action: 'get_group_member_list',
            params: { group_id }
        });
    }

    // ... 此處可以繼續添加所有其他 v11 標準動作

    start() { throw new Error("start() must be implemented."); }
    _send(data) { throw new Error("_send() must be implemented."); }
}

module.exports = OneBot_v11_BaseAdapter;
const { EventEmitter } = require("events");
const { v4: uuidv4 } = require('uuid');
const {getModuleLogger} = require('../../services/logger');

// 自訂事件觸發器 (含攔截器功能)
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

class OneBot_v12_BaseAdapter {
    eventEmitter = new CustomTrigger();
    logger;
    accessToken;
    actionPromises = new Map();
    self = { platform: '', user_id: '' };

    constructor(adapterName, accessToken) {
        this.logger = getModuleLogger(adapterName || 'OB_v12_Adapter');
        this.accessToken = accessToken;
        this.eventEmitter.setMaxListeners(0);
    }

    on(eventName, listener) { this.eventEmitter.on(eventName, listener); }
    emit(eventName, ...args) { this.eventEmitter.trigger(eventName, ...args); }
    addInterceptor(eventName, interceptor) { this.eventEmitter.addInterceptor(eventName, interceptor); }

    _sendAction(payload, options = {}) {
        console.log('_sendAction', payload);
        return new Promise((resolve, reject) => {
            const echo = options.echo || uuidv4();
            const dataToSend = { ...payload, echo };

            const timeout = setTimeout(() => {
                this.actionPromises.delete(echo);
                reject(new Error(`Action [${payload.action}] with echo [${echo}] timed out`));
            }, options.timeout || 10000);

            this.actionPromises.set(echo, { resolve, reject, timeout });
            this._send(JSON.stringify(dataToSend));
        });
    }

    _handleActionResponse(response) {
        const { echo } = response;
        this.emit(`api.response.${echo}`, response);

        if (echo && this.actionPromises.has(echo)) {
            const { resolve, reject, timeout } = this.actionPromises.get(echo);
            clearTimeout(timeout);
            if (response.status === 'ok') {
                resolve(response.data);
            } else {
                console.log(response);
                reject(new Error(`Action failed: ${response.message} (retcode: ${response.retcode})`));
            }
            this.actionPromises.delete(echo);
        }
    }

    // --- v12 標準動作 ---
    sendMessage(detail_type, id, message, options) {
        const params = { detail_type, message };
        params[`${detail_type}_id`] = id;
        return this._sendAction({ action: 'send_message', params }, options);
    }

    getSelfInfo(options) {
        return this._sendAction({ action: 'get_self_info', params: {} }, options);
    }

    // ... 其他 v12 標準動作 ...

    start() { throw new Error("start() must be implemented."); }
    _send(data) { throw new Error("_send() must be implemented."); }
}

module.exports = OneBot_v12_BaseAdapter;
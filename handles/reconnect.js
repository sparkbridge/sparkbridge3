// handles/reconnect.js
function createReconnectStrategy() {
    let attempts = 0;
    const baseWait = 3000; // 基础等待 3 秒
    const maxWait = 60000; // 最大等待 60 秒

    return function boom() {
        attempts++;
        // 指数退避算法: 3s, 6s, 12s, 24s... 最大不超过 60s
        let waitTime = Math.min(baseWait * Math.pow(2, attempts - 1), maxWait);
        return waitTime;
    };
}

module.exports = {
    boom: createReconnectStrategy()
};
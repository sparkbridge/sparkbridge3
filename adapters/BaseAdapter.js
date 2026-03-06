const EventEmitter = require('events');

/**
 * SparkBridge3 基础适配器类
 * 所有平台/协议的适配器都应继承此类
 */
class BaseAdapter extends EventEmitter {
    constructor(config) {
        super();
        this.config = config || {};
        this.interceptors = {}; // 用于存储事件拦截器
        // 默认解除最大监听器限制，防止 Node.js 报内存泄漏警告
        this.setMaxListeners(0);
    }

    // 添加拦截器 (保留原版 Qadapter 的拦截特性)
    addInterceptor(event, interceptor) {
        if (!this.interceptors[event]) {
            this.interceptors[event] = [];
        }
        this.interceptors[event].push(interceptor);
    }

    // 触发事件 (带拦截器检查)
    trigger(event, ...args) {
        // 如果存在全局 spark 对象且开启了 debug，则打印触发事件日志

            // console.log(`Triggering event: ${event}`);
        
        // 检查是否有拦截器拦截当前事件
        if (this.interceptors[event]) {
            for (const interceptor of this.interceptors[event]) {
                const result = interceptor(...args);
                if (result === false) {
                    // 如果存在全局 spark 对象且开启了 debug，则打印拦截日志
                    if (global.spark && global.spark.debug) {
                        // console.log(`Event '${event}' was intercepted.`);
                    }
                    return; // 如果拦截器返回 false，则中断事件触发
                }
            }
        }
        // 如果没有被拦截，则正常触发标准 EventEmitter 的 emit
        this.emit(event, ...args);
        // console.log(`Event '${event}' was triggered.`);
    }

    // --- 以下为需要子类实现的抽象方法 ---

    /**
     * 连接到机器人客户端或启动服务
     */
    async connect() {
        throw new Error("Adapter 必须实现 connect() 方法");
    }

    /**
     * 向底层发送原始数据包
     * @param {Object|String} pack 数据包
     */
    sendWSPack(pack) {
        throw new Error("Adapter 必须实现 sendWSPack() 方法");
    }

    async sendGroupMsg(groupId, message) {
        throw new Error('Method sendGroupMsg must be implemented');
    }

    sendPrivateMsg(userId, message) {
        throw new Error('Method sendPrivateMsg must be implemented');
    }

    sendGroupForwardMsg(groupId, messages){
        throw new Error('Method sendGroupForwardMsg must be implemented');
    }
    sendGroupBan(groupId, userId, duration) {
        throw new Error('Method sendGroupBan must be implemented');
    }
    deleteMsg(messageId) {
        throw new Error('Method deleteMsg must be implemented');
    }
    getGroupMemberList(groupId) {
        throw new Error('Method getGroupMemberList must be implemented');
    }
    getGroupMemberInfo(groupId, userId) {
        throw new Error('Method getGroupMemberInfo must be implemented');
    }
    setGroupAddRequest(flag, subType, approve){
        throw new Error('Method setGroupAddRequest must be implemented');
    }
    setFriendAddRequest(flag, approve){
        throw new Error('Method setFriendAddRequest must be implemented');
    }
    sendLike(userId, times){
        throw new Error('Method sendLike must be implemented');
    }
    getMsg(messageId){
        throw new Error('Method getMsg must be implemented');
    }
    getGroupRootFiles(groupId){
        throw new Error('Method getGroupRootFiles must be implemented');
    }
    uploadGroupFile(groupId, fileName, asName, folderId){
        throw new Error('Method uploadGroupFile must be implemented');
    }
    sendGroupWholeBan(groupId, enable){
        throw new Error('Method sendGroupWholeBan must be implemented');
    }
    setGroupKick(groupId, userId, reject){
        throw new Error('Method setGroupKick must be implemented');
    }
    setGroupLeave(groupId, dismiss){
        throw new Error('Method setGroupLeave must be implemented');
    }
    setGroupName(groupId, name){
        throw new Error('Method setGroupName must be implemented');
    }
    getStrangerInfo(StrangerId, noCache){
        throw new Error('Method getStrangerInfo must be implemented');
    }
    getGroupInfo(groupId, noCache){
        throw new Error('Method getGroupInfo must be implemented');
    }
    getFriendInfo(friendId, noCache){
        throw new Error('Method getFriendInfo must be implemented');
    }
    getStatus(){
        throw new Error('Method getStatus must be implemented');
    }
    getGroupList(){
        throw new Error('Method getGroupList must be implemented');
    }
    getFriendList(){
        throw new Error('Method getFriendList must be implemented');
    }
    getGroupHonorInfo(groupId, type){ 
        throw new Error('Method getGroupHonorInfo must be implemented');
    }
    getLoginInfo(){
        throw new Error('Method getLoginInfo must be implemented');
    }
    getModelShow(){
        throw new Error('Method getModelShow must be implemented');
    }
}

module.exports = BaseAdapter;
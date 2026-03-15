const name_space = "SparkAPIEx"

spark.on('core.ready', () => {
    if (typeof ll === 'undefined' || !ll.exports) {
        logger.warn('sb3_api_exporter: LLSE 不支持导出');
        return;
    }
    
    try {
        // ==================== 基础信息 ====================
        ll.exports(() => spark.env.get('version'), name_space, "getVersion");
        ll.exports(() => spark.env.get('main_group'), name_space, "getMainGroup");
        ll.exports(() => spark.env.get('admin_qq'), name_space, "getAdminQQ");
        ll.exports(() => spark.env.get('qid'), name_space, "getBotQQ");
        
        // ==================== 消息发送 ====================
        // 群消息
        ll.exports((gid, msg) => spark.QClient.sendGroupMsg(gid, msg), name_space, "sendGroupMsg");
        // 私聊消息
        ll.exports((fid, msg) => spark.QClient.sendPrivateMsg(fid, msg), name_space, "sendPrivateMsg");
        // 合并转发
        ll.exports((gid, msg) => spark.QClient.sendGroupForwardMsg(gid, msg), name_space, "sendGroupForwardMsg");
        // 撤回消息
        ll.exports((id) => spark.QClient.deleteMsg(id), name_space, "deleteMsg");
        // 发送原始包
        ll.exports((pack) => spark.QClient.sendWSPack(pack), name_space, "sendWSPack");
        
        // ==================== 群管理 ====================
        // 禁言
        ll.exports((gid, mid, duration) => spark.QClient.sendGroupBan(gid, mid, duration), name_space, "sendGroupBan");
        // 全群禁言
        ll.exports((gid, enable) => spark.QClient.sendGroupWholeBan(gid, enable), name_space, "sendGroupWholeBan");
        // 踢人
        ll.exports((gid, mid, reject) => spark.QClient.setGroupKick(gid, mid, reject), name_space, "setGroupKick");
        // 退群
        ll.exports((gid, dismiss) => spark.QClient.setGroupLeave(gid, dismiss), name_space, "setGroupLeave");
        // 设置群名
        ll.exports((gid, name) => spark.QClient.setGroupName(gid, name), name_space, "setGroupName");
        
        // ==================== 获取信息 ====================
        // 群成员列表
        ll.exports((gid) => spark.QClient.getGroupMemberList(gid), name_space, "getGroupMemberList");
        // 群成员信息
        ll.exports((gid, mid) => spark.QClient.getGroupMemberInfo(gid, mid), name_space, "getGroupMemberInfo");
        // 群列表
        ll.exports(() => spark.QClient.getGroupList(), name_space, "getGroupList");
        // 好友列表
        ll.exports(() => spark.QClient.getFriendList(), name_space, "getFriendList");
        // 群信息
        ll.exports((gid, noCache) => spark.QClient.getGroupInfo(gid, noCache), name_space, "getGroupInfo");
        // 陌生人信息
        ll.exports((uid, noCache) => spark.QClient.getStrangerInfo(uid, noCache), name_space, "getStrangerInfo");
        // 好友信息
        ll.exports((fid, noCache) => spark.QClient.getFriendInfo(fid, noCache), name_space, "getFriendInfo");
        // 登录信息
        ll.exports(() => spark.QClient.getLoginInfo(), name_space, "getLoginInfo");
        // 状态
        ll.exports(() => spark.QClient.getStatus(), name_space, "getStatus");
        // 消息
        ll.exports((id) => spark.QClient.getMsg(id), name_space, "getMsg");
        
        // ==================== 其他功能 ====================
        // 点赞
        ll.exports((uid, times) => spark.QClient.sendLike(uid, times), name_space, "sendLike");
        // 处理加群请求
        ll.exports((flag, subType, approve) => spark.QClient.setGroupAddRequest(flag, subType, approve), name_space, "setGroupAddRequest");
        // 处理加好友请求
        ll.exports((flag, approve) => spark.QClient.setFriendAddRequest(flag, approve), name_space, "setFriendAddRequest");
        
        // ==================== 消息构建器 ====================
        ll.exports((content) => spark.msgbuilder.text(content), name_space, "text");
        ll.exports((qq) => spark.msgbuilder.at(qq), name_space, "at");
        ll.exports((file) => spark.msgbuilder.img(file), name_space, "img");
        ll.exports((id) => spark.msgbuilder.face(id), name_space, "face");
        ll.exports((id) => spark.msgbuilder.poke(id), name_space, "poke");
        ll.exports((file) => spark.msgbuilder.video(file), name_space, "video");
        ll.exports((file) => spark.msgbuilder.record(file), name_space, "record");
        ll.exports((id) => spark.msgbuilder.reply(id), name_space, "reply");
        ll.exports((msg) => spark.msgbuilder.format(msg), name_space, "format");
        ll.exports(() => spark.msgbuilder.ForwardMsgBuilder(), name_space, "ForwardMsgBuilder");
        
        // ==================== 包构建器 ====================
        ll.exports((gid, msg, id) => spark.packbuilder.GroupMessagePack(gid, msg, id), name_space, "GroupMessagePack");
        ll.exports((fid, msg, id) => spark.packbuilder.PrivateMessagePack(fid, msg, id), name_space, "PrivateMessagePack");
        ll.exports((gid, msg, id) => spark.packbuilder.GroupForwardMessagePack(gid, msg, id), name_space, "GroupForwardMessagePack");
        ll.exports((gid, mid, duration) => spark.packbuilder.GroupBanPack(gid, mid, duration), name_space, "GroupBanPack");
        ll.exports((gid, id) => spark.packbuilder.GroupMemberListPack(gid, id), name_space, "GroupMemberListPack");
        ll.exports((fid, times) => spark.packbuilder.LikePack(fid, times), name_space, "LikePack");
        
        
        logger.info('✓ sb3_api_exporter: 成功导出全部 SparkAPI 函数');
        
    } catch (e) {
        logger.error(`✗ 导出失败: ${e}`);
    }
})
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
        // 设置群名片
        ll.exports((gid, mid, card) => spark.QClient.setGroupCard(gid, mid, card), name_space, "setGroupCard");
        // 删除群文件
        ll.exports((gid, fileId) => spark.QClient.deleteGroupFile(gid, fileId), name_space, "deleteGroupFile");
        // 创建群文件文件夹
        ll.exports((gid, name) => spark.QClient.createGroupFileFolder(gid, name), name_space, "createGroupFileFolder");
        // 删除群文件文件夹
        ll.exports((gid, folderId) => spark.QClient.deleteGroupFileFolder(gid, folderId), name_space, "deleteGroupFileFolder");
        // 移动群文件
        ll.exports((gid, fileId, currentParentDirectory, targetParentDirectory) => spark.QClient.moveGroupFile(gid, fileId, currentParentDirectory, targetParentDirectory), name_space, "moveGroupFile");
        // 转存群文件
        ll.exports((gid, fileId) => spark.QClient.transGroupFile(gid, fileId), name_space, "transGroupFile");
        // 重命名群文件
        ll.exports((gid, fileId, currentParentDirectory, newName) => spark.QClient.renameGroupFile(gid, fileId, currentParentDirectory, newName), name_space, "renameGroupFile");
        // 上传群文件
        ll.exports((gid, file, name, folderId, uploadFile) => spark.QClient.uploadGroupFile(gid, file, name, folderId, uploadFile), name_space, "uploadGroupFile");
        // 上传私聊文件
        ll.exports((uid, file, name, uploadFile) => spark.QClient.uploadPrivateFile(uid, file, name, uploadFile), name_space, "uploadPrivateFile");
        
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
        // 群荣誉信息
        ll.exports((gid, type) => spark.QClient.getGroupHonorInfo(gid, type), name_space, "getGroupHonorInfo");
        // 群文件系统信息
        ll.exports((gid) => spark.QClient.getGroupFileSystemInfo(gid), name_space, "getGroupFileSystemInfo");
        // 群根目录文件
        ll.exports((gid, fileCount) => spark.QClient.getGroupRootFiles(gid, fileCount), name_space, "getGroupRootFiles");
        // 按文件夹获取群文件
        ll.exports((gid, folderId, fileCount) => spark.QClient.getGroupFilesByFolder(gid, folderId, fileCount), name_space, "getGroupFilesByFolder");
        // 获取群文件下载地址
        ll.exports((gid, fileId) => spark.QClient.getGroupFileUrl(gid, fileId), name_space, "getGroupFileUrl");
        // 获取机型显示
        ll.exports(() => spark.QClient.getModelShow(), name_space, "getModelShow");
        
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
        // ll.exports((id) => spark.msgbuilder.poke(id), name_space, "poke");
        ll.exports((file) => spark.msgbuilder.video(file), name_space, "video");
        ll.exports((file) => spark.msgbuilder.record(file), name_space, "record");
        ll.exports((id) => spark.msgbuilder.reply(id), name_space, "reply");
        ll.exports((msg) => spark.msgbuilder.format(msg), name_space, "format");
        ll.exports(() => spark.msgbuilder.ForwardMsgBuilder(), name_space, "ForwardMsgBuilder");
        
        // ==================== 包构建器 ====================
        ll.exports((group_id, user_id, id) => spark.packbuilder.GroupPokePack(group_id, user_id, id), name_space, "GroupPokePack");
        ll.exports((user_id, id) => spark.packbuilder.FriendPokePack(user_id, id), name_space, "FriendPokePack");
        ll.exports((gid, msg, id) => spark.packbuilder.GroupMessagePack(gid, msg, id), name_space, "GroupMessagePack");
        ll.exports((fid, msg, id) => spark.packbuilder.PrivateMessagePack(fid, msg, id), name_space, "PrivateMessagePack");
        ll.exports((gid, msg, id) => spark.packbuilder.GroupForwardMessagePack(gid, msg, id), name_space, "GroupForwardMessagePack");
        ll.exports((gid, mid, duration) => spark.packbuilder.GroupBanPack(gid, mid, duration), name_space, "GroupBanPack");
        ll.exports((gid, id) => spark.packbuilder.GroupMemberListPack(gid, id), name_space, "GroupMemberListPack");
        ll.exports((fid, times) => spark.packbuilder.LikePack(fid, times), name_space, "LikePack");
        ll.exports((gid, id, fileCount) => spark.packbuilder.GroupRootFilesPack(gid, id, fileCount), name_space, "GroupRootFilesPack");
        ll.exports((gid, file, name, folderId, uploadFile) => spark.packbuilder.UploadGroupFilePack(gid, file, name, folderId, uploadFile), name_space, "UploadGroupFilePack");
        ll.exports((gid, fileId) => spark.packbuilder.DeleteGroupFilePack(gid, fileId), name_space, "DeleteGroupFilePack");
        ll.exports((gid, name) => spark.packbuilder.CreateGroupFileFolderPack(gid, name), name_space, "CreateGroupFileFolderPack");
        ll.exports((gid, folderId) => spark.packbuilder.DeleteGroupFileFolderPack(gid, folderId), name_space, "DeleteGroupFileFolderPack");
        ll.exports((gid, id) => spark.packbuilder.GroupFileSystemInfoPack(gid, id), name_space, "GroupFileSystemInfoPack");
        ll.exports((gid, folderId, id, fileCount) => spark.packbuilder.GroupFilesByFolderPack(gid, folderId, id, fileCount), name_space, "GroupFilesByFolderPack");
        ll.exports((gid, fileId, id) => spark.packbuilder.GroupFileUrlPack(gid, fileId, id), name_space, "GroupFileUrlPack");
        ll.exports((uid, file, name, uploadFile) => spark.packbuilder.UploadPrivateFilePack(uid, file, name, uploadFile), name_space, "UploadPrivateFilePack");
        ll.exports((gid, fileId, currentParentDirectory, targetParentDirectory) => spark.packbuilder.MoveGroupFilePack(gid, fileId, currentParentDirectory, targetParentDirectory), name_space, "MoveGroupFilePack");
        ll.exports((gid, fileId) => spark.packbuilder.TransGroupFilePack(gid, fileId), name_space, "TransGroupFilePack");
        ll.exports((gid, fileId, currentParentDirectory, newName) => spark.packbuilder.RenameGroupFilePack(gid, fileId, currentParentDirectory, newName), name_space, "RenameGroupFilePack");
        
        
        logger.info('✓ sb3_api_exporter: 成功导出全部 SparkAPI 函数');
        
    } catch (e) {
        logger.error(`✗ 导出失败: ${e}`);
    }
})

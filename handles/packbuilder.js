
class Builder {
    static MessagePack(id, type, msg, pid) {
        let sendjson = {
            action: 'send_msg',
            echo: pid,
            params: {
                user_id: id,
                message: msg,
                message_type: type
            }
        }
        if (type == 'group') {
            sendjson.params.group_id = id
        }
        return sendjson
    }
    static PrivateMessagePack(fid, msg, id) {
        return this.MessagePack(fid, 'private', msg, id);
    }

    static GroupMessagePack(gid, msg, id) {
        return this.MessagePack(gid, 'group', msg, id);
    }
    static SendGroupMessagePack(gid, msg, escape = false) {
        return {
            action: 'send_group_msg',
            params: {
                group_id: gid,
                message: msg,
                auto_escape: escape
            }
        }
    }
    static SandGroupMessagePack(gid, msg, escape = false) {
        return this.SendGroupMessagePack(gid, msg, escape)
        //由铭记制造的历史遗留问题
    }
    static LikePack(fid, times) {
        return {
            action: 'send_like',
            params: {
                user_id: fid,
                times
            }
        }
    }
    // 群内戳一戳
    static GroupPokePack(group_id, user_id, id) {
        return {
            action: 'group_poke',
            echo: id,
            params: {
                group_id: group_id,
                user_id: user_id
            }
        }
    }
    // 私聊戳一戳
    static FriendPokePack(user_id, id) {
        return {
            action: 'send_friend_poke',
            echo: id,
            params: {
                user_id: user_id
            }
        }
    }

    static DeleteMsgPack(id) {
        return {
            action: 'delete_msg',
            params: {
                message_id: id
            }
        }
    }
    static GetMsgPack(mid, id) {
        return {
            action: 'get_msg',
            echo: id,
            params: {
                message_id: mid,
            }
        }
    }
    static GroupBanPack(gid, mid, duration) {
        return {
            action: 'set_group_ban',
            params: {
                group_id: gid,
                user_id: mid,
                duration
            }
        }
    }
    static GroupRequestPack(flag, sub_type, approve,reason) {
        return {
            action: 'set_group_add_request',
            params: {
                flag,
                sub_type,
                approve,
                reason
            }
        }
    }
    static FriendRequestPack(flag, approve) {
        return {
            action: 'set_friend_add_request',
            params: {
                flag,
                approve
            }
        }
    }
    static GroupMemberListPack(gid, id) {
        return {
            action: 'get_group_member_list',
            echo: id,
            params: {
                group_id: gid
            }
        }
    }
    static GroupMemberInfoPack(gid, mid, id) {
        return {
            action: 'get_group_member_info',
            echo: id,
            params: {
                group_id: gid,
                user_id: mid
            }
        }
    }
    static GroupForwardMessagePack(gid, msg, id) {
        return {
            action: 'send_group_forward_msg',
            echo: id,
            params: {
                group_id: gid,
                messages: msg
            }
        }
    }
    static GroupCardSet(gid, mid, card) {
        return {
            action: 'set_group_card',
            params: {
                group_id: gid,
                user_id: mid,
                card: card
            }
        }
    }
    static GroupKickPack(gid, mid, rej) {
        return {
            action: 'set_group_kick',
            params: {
                group_id: gid,
                user_id: mid,
                reject_add_request: rej
            }
        }
    }
    static GroupLeavePack(gid, dismiss) {
        return {
            action: 'set_group_leave',
            params: {
                group_id: gid,
                is_dismiss: dismiss
            }
        }
    }
    static GroupWholeBanPack(gid, enable) {
        return {
            action: 'set_group_whole_ban',
            params: {
                group_id: gid,
                enable
            }
        }
    }
    static GroupNamePack(gid, name) {
        return {
            action: 'set_group_name',
            params: {
                group_id: gid,
                group_name: name
            }
        }
    }
    static StrangerInfoPack(sid, no_cache, id) {
        return {
            action: 'get_stranger_info',
            echo: id,
            params: {
                user_id: sid,
                no_cache
            }
        }
    }
    static FriendInfoPack(fid, no_cache, id) {
        return {
            action: 'get_friend_info',
            echo: id,
            params: {
                user_id: fid,
                no_cache
            }
        }
    }
    static GroupInfoPack(gid, no_cache, id) {
        return {
            action: 'get_group_info',
            echo: id,
            params: {
                group_id: gid,
                no_cache
            }
        }
    }
    static FriendListPack(id) {
        return {
            action: 'get_friend_list',
            echo: id
        }
    }
    static GroupListPack(id) {
        return {
            action: 'get_group_list',
            echo: id
        }
    }
    static GroupHonorInfoPack(gid, type, id) {
        return {
            action: 'get_group_honor_info',
            echo: id,
            params: {
                group_id: gid,
                type
            }
        }
    }
    static StatusPack(id) {
        return {
            action: 'get_status',
            echo: id
        }
    }
    static GroupRootFilesPack(gid, id, fileCount = 50) {
        return {
            action: "get_group_root_files",
            echo: id,
            params: {
                group_id: gid, // 群号
                file_count: fileCount
            }
        }
    }
    static UploadGroupFilePack(gid, FileName, AsName, FolderID, uploadFile = true) {
        return {
            action: "upload_group_file",
            params: {
                group_id: gid, // 群号
                file: FileName, // 本地文件路径
                name: AsName, // 储存名称
                folder: FolderID, // 不提供父目录ID，默认上传到根目录
                folder_id: FolderID,
                upload_file: uploadFile
            }
        };
    }
    static DeleteGroupFilePack(gid, fileId) {
        return {
            action: 'delete_group_file',
            params: {
                group_id: gid,
                file_id: fileId
            }
        }
    }
    static CreateGroupFileFolderPack(gid, name) {
        return {
            action: 'create_group_file_folder',
            params: {
                group_id: gid,
                name,
                folder_name: name
            }
        }
    }
    static DeleteGroupFileFolderPack(gid, folderId) {
        return {
            action: 'delete_group_folder',
            params: {
                group_id: gid,
                folder_id: folderId
            }
        }
    }
    static GroupFileSystemInfoPack(gid, id) {
        return {
            action: 'get_group_file_system_info',
            echo: id,
            params: {
                group_id: gid
            }
        }
    }
    static GroupFilesByFolderPack(gid, folderId, id, fileCount = 50) {
        return {
            action: 'get_group_files_by_folder',
            echo: id,
            params: {
                group_id: gid,
                folder_id: folderId,
                folder: folderId,
                file_count: fileCount
            }
        }
    }
    static GroupFileUrlPack(gid, fileId, id) {
        return {
            action: 'get_group_file_url',
            echo: id,
            params: {
                group_id: gid,
                file_id: fileId
            }
        }
    }
    static UploadPrivateFilePack(uid, FileName, AsName, uploadFile = true) {
        return {
            action: 'upload_private_file',
            params: {
                user_id: uid,
                file: FileName,
                name: AsName,
                upload_file: uploadFile
            }
        }
    }
    static MoveGroupFilePack(gid, fileId, currentParentDirectory, targetParentDirectory) {
        return {
            action: 'move_group_file',
            params: {
                group_id: gid,
                file_id: fileId,
                current_parent_directory: currentParentDirectory,
                target_parent_directory: targetParentDirectory
            }
        }
    }
    static TransGroupFilePack(gid, fileId) {
        return {
            action: 'trans_group_file',
            params: {
                group_id: gid,
                file_id: fileId
            }
        }
    }
    static RenameGroupFilePack(gid, fileId, currentParentDirectory, newName) {
        return {
            action: 'rename_group_file',
            params: {
                group_id: gid,
                file_id: fileId,
                current_parent_directory: currentParentDirectory,
                new_name: newName
            }
        }
    }
    static LoginInfoPack(id) {
        return {
            action: 'get_login_info',
            echo: id
        }
    }
    static ModelShowPack(id) {
        return {
            action: '_get_model_show',
            echo: id
        }
    }
}


module.exports = Builder;

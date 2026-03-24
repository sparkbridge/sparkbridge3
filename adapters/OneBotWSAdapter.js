const WebSocket = require('ws');
const BaseAdapter = require('./BaseAdapter');
const logger = require('../handles/logger');
const packbuilder = require('../handles/packbuilder');
const msgbuilder = require('../handles/msgbuilder');
// 假设 reconnect.js 依然保留在项目中
const { boom } = require('../handles/reconnect');

function uuid() {
    let s = []
    let hexDigits = '0123456789abcdef'
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substring(Math.floor(Math.random() * 0x10), 1)
    }
    s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substring((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = '-'

    let uuid = s.join('')
    return uuid
}

const ErrorLogger = require('../handles/logger').getLogger('ErrorLogger');

/**
 * SparkBridge3 - OneBot 标准 WebSocket 适配器
 */
class OneBotWSAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
        // config 结构示例: { ws_type: 0, target: 'ws://...', port: 3001, qid: 114514, pwd: '...' }
        this.ws_type = config.ws_type;
        this.target = config.target;
        this.port = config.port;
        this.qid = config.qid;
        this.pwd = config.pwd;

        this.client = null;
        this.logger = logger.getLogger('OneBotWSAdapter');
    }

    defaultErrorHandler(error) {
        if (error.reason === 'timeout') {
            ErrorLogger.warn("请求超时,此信息可能发送失败");
            // 这里可以做一些超时后的默认处理，比如重试等
        } else {
            ErrorLogger.error("请求发送时发生错误:", error);
        }
    }

    async connect() {
        if (this.ws_type == 0) {
            this._initForwardWS();
        } else if (this.ws_type == 1) {
            this._initReverseWS();
        } else {
            this.logger.error('未知的 ws_type，仅支持 0 (正向) 或 1 (反向)');
        }
    }

    // 内部方法：初始化正向 WebSocket (连接到 Go-cqhttp/NapCat 等)
    _initForwardWS() {
        this.client = new WebSocket(this.target, {
            headers: { Authorization: 'Bearer ' + this.pwd }
        });

        this.client.on('open', () => {
            this.logger.info('正向 WebSocket 连接成功，开始处理事件');
            this.trigger('bot.online');
        });

        this.client.on('error', (e) => {
            this.logger.error('WebSocket 故障！！请检查连接目标和密钥是否正确');
            if (global.spark && global.spark.debug) console.log(e);
        });

        this.client.on('close', (e) => {
            let waitTime = boom();
            this.logger.warn(`WebSocket 已经断开, 将在 ${(new Date(Date.now() + waitTime)).toLocaleString()} 尝试重连`);
            setTimeout(() => {
                this.connect();
            }, waitTime);
        });

        this.client.on('message', (_data, _islib) => {
            this._handleMessage(_data, _islib);
        });
    }

    // 内部方法：初始化反向 WebSocket (作为服务端等待机器人连接)
    _initReverseWS() {
        this.client = new WebSocket.Server({
            port: this.port,
            reuseAddr: true
        });
        this.logger.info(`反向 WebSocket 服务器于 ws://localhost:${this.port} 开启`);

        this.connectedClients = new Set();
        this.client.on('connection', (ws, req) => {
            this.logger.info(`收到来自 ${req.headers.host} 的连接请求`);
            this.connectedClients.add(ws);

            if (global.spark && global.spark.debug) {
                console.log('Client request headers:', req.headers);
            }

            // 鉴权拦截
            if (req.headers.authorization != `Bearer ${this.pwd}` && !(global.spark && global.spark.debug)) {
                this.logger.info('客户端未提供正确的授权头，连接被拒绝');
                ws.send('Client 未提供正确的授权头');
                ws.close();
                return;
            }

            if (req.headers['x-self-id'] == this.qid) {
                this.logger.info(`WebSocket 服务器已接收到来自 [${this.qid}] 的授权连接`);
                this.trigger('bot.online');
            }

            ws.on('message', (message) => {
                this._handleMessage(message, false);
            });

            ws.on('error', (error) => {
                this.logger.error('WebSocket 客户端连接出现错误:', error);
            });

            ws.on('close', () => {
                this.connectedClients.delete(ws);
                this.logger.info('WebSocket 客户端已断开连接');
            });
        });

        this.client.on('error', (error) => {
            this.logger.error('反向 WebSocket 服务器故障:', error);
        });
    }

    // 内部方法：统一处理收到的消息
    _handleMessage(_data, _islib) {
        let raw = _data;

        if (true) {
            raw = _data.toString();
        }
        // console.log("WS-Recv <--", raw);
        let msg_obj;
        try {
            msg_obj = JSON.parse(raw);
            // console.log("WS-Recv <--", msg_obj);
        } catch (err) {
            this.logger.error('解析 WebSocket 消息出现 JSON 错误！');
            if (global.spark && global.spark.debug) console.log(err);
            return;
        }
        // 触发原版核心高度依赖的 gocq.pack 事件
        this.trigger('gocq.pack', msg_obj);
        if (msg_obj.echo != undefined) {
            // if (spark.debug) console.log(pack);
            this.trigger("packid_" + msg_obj.echo, msg_obj.data);
            // return  // <-- 要不要return呢，不return也没什么，但是怕出啥问题。。。
        }
        // console.log(msg_obj)
    }

    // 实现基类的发送数据包方法
    sendWSPack(pack) {
        if (typeof pack !== 'string') {
            pack = JSON.stringify(pack);
        }

        if (global.spark && global.spark.debug) {
            // console.log("WS-Send -->", pack);
        }

        if (this.ws_type == 0 && this.client && this.client.readyState === WebSocket.OPEN) {
            this.client.send(pack);
        } else if (this.ws_type == 1 && this.client) {
            this.client.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(pack);
                }
            });
        }
    }



    

    // sparkbridge3/adapters/OneBotWSAdapter.js
    async sendGroupMsg(gid, msg) {
        let tmp_id = uuid();
        msg = msgbuilder.format(msg);
        this.sendWSPack(packbuilder.GroupMessagePack(gid, msg, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler);
    }

    sendPrivateMsg(uid, msg) {
        let tmp_id = uuid();
        msg = msgbuilder.format(msg);
       this.sendWSPack(packbuilder.PrivateMessagePack(uid, msg, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 1e3)
        })
    }

    async sendGroupForwardMsg(gid, msg) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupForwardMessagePack(gid, msg, tmp_id));
        try {
            return await new Promise((res, rej) => {
                this.once('packid_' + tmp_id, (data) => {
                    res(data);
                });
                setTimeout(() => {
                    rej({ reason: 'timeout' });
                }, 10e3);
            });
        } catch (error) {
            return this.defaultErrorHandler(error);
        }
    }

    sendGroupBan(gid, mid, d) {
       this.sendWSPack(packbuilder.GroupBanPack(gid, mid, d));
    }
    deleteMsg(id) {
       this.sendWSPack(packbuilder.DeleteMsgPack(id));
    }

    getGroupMemberList(gid) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupMemberListPack(gid, tmp_id));
        return new Promise((res, rej) => {
           this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupMemberInfo(gid, mid) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupMemberInfoPack(gid, mid, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    setGroupAddRequest(flag, sub_type, approve) {
       this.sendWSPack(packbuilder.GroupRequestPack(flag, sub_type, approve));
    }

    setFriendAddRequest(flag, approve) {
       this.sendWSPack(packbuilder.FriendRequestPack(flag, approve));
    }

    sendLike(fid, times) {
       this.sendWSPack(packbuilder.LikePack(fid, times));
    }

    getMsg(id) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GetMsgPack(id, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    // sendGroupForwardMessage(gid, msg) {
    //     let tmp_id = uuid();
    //    this.sendWSPack(packbuilder.GroupForwardMessagePack(gid, msg, tmp_id));
    //     return new Promise((res, rej) => {
    //         this.tigger('packid_' + tmp_id, (data) => {
    //             res(data);
    //         });
    //         setTimeout(() => {
    //             rej({ reason: 'timeout' });
    //         }, 10e3);
    //     }).catch(this.defaultErrorHandler)
    // }

    getGroupRootFiles(gid, fileCount = 50) {
        try {
            let tmp_id = uuid();
           this.sendWSPack(packbuilder.GroupRootFilesPack(gid, tmp_id, fileCount));
            return new Promise((res, rej) => {
                this.once('packid_' + tmp_id, (data) => {
                    res(data);
                });
                setTimeout(() => {
                    rej({ reason: 'timeout' });
                }, 10e3);
            });
        } catch (error) {
            return this.defaultErrorHandler(error);
        }
    }

    uploadGroupFile(gid, FileName, AsName, FolderID, uploadFile = true) {
       this.sendWSPack(packbuilder.UploadGroupFilePack(gid, FileName, AsName, FolderID, uploadFile))
    }

    deleteGroupFile(gid, fileId) {
       this.sendWSPack(packbuilder.DeleteGroupFilePack(gid, fileId));
    }

    createGroupFileFolder(gid, name) {
       this.sendWSPack(packbuilder.CreateGroupFileFolderPack(gid, name));
    }

    deleteGroupFileFolder(gid, folderId) {
       this.sendWSPack(packbuilder.DeleteGroupFileFolderPack(gid, folderId));
    }

    getGroupFileSystemInfo(gid) {
        let tmp_id = uuid();
        this.sendWSPack(packbuilder.GroupFileSystemInfoPack(gid, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupFilesByFolder(gid, folderId, fileCount = 50) {
        let tmp_id = uuid();
        this.sendWSPack(packbuilder.GroupFilesByFolderPack(gid, folderId, tmp_id, fileCount));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupFileUrl(gid, fileId) {
        let tmp_id = uuid();
        this.sendWSPack(packbuilder.GroupFileUrlPack(gid, fileId, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    uploadPrivateFile(uid, FileName, AsName, uploadFile = true) {
       this.sendWSPack(packbuilder.UploadPrivateFilePack(uid, FileName, AsName, uploadFile));
    }

    moveGroupFile(gid, fileId, currentParentDirectory, targetParentDirectory) {
       this.sendWSPack(packbuilder.MoveGroupFilePack(gid, fileId, currentParentDirectory, targetParentDirectory));
    }

    transGroupFile(gid, fileId) {
       this.sendWSPack(packbuilder.TransGroupFilePack(gid, fileId));
    }

    renameGroupFile(gid, fileId, currentParentDirectory, newName) {
       this.sendWSPack(packbuilder.RenameGroupFilePack(gid, fileId, currentParentDirectory, newName));
    }

    sendGroupWholeBan(gid, enable) {
       this.sendWSPack(packbuilder.GroupWholeBanPack(gid, enable));
    }

    setGroupKick(gid, mid, rej) {
       this.sendWSPack(packbuilder.GroupKickPack(gid, mid, rej));
    }

    setGroupLeave(gid, dismiss) {
      this.sendWSPack(packbuilder.GroupLeavePack(gid, dismiss));
    }

    setGroupName(gid, name) {
       this.sendWSPack(packbuilder.GroupNamePack(gid, name));
    }

    getStrangerInfo(sid, no_cache) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.StrangerInfoPack(sid, no_cache, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getFriendInfo(fid, no_cache) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.FriendInfoPack(fid, no_cache, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupInfo(gid, no_cache) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupInfoPack(gid, no_cache, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getFriendList() {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.FriendListPack(tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupList() {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupListPack(tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getGroupHonorInfo(gid, type) {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.GroupHonorInfoPack(gid, type, tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getStatus() {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.StatusPack(tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }

    getLoginInfo() {
        let tmp_id = uuid();
       this.sendWSPack(packbuilder.LoginInfoPack(tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        })
    }
    getModelShow(){
        let tmp_id = uuid();
        this.sendWSPack(packbuilder.ModelShowPack(tmp_id));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)
    }
    setGroupCard(gid, mid, card){
        let tmp_id = uuid();
        this.sendWSPack(packbuilder.GroupCardSet(gid, mid, card));
        return new Promise((res, rej) => {
            this.once('packid_' + tmp_id, (data) => {
                res(data);
            });
            setTimeout(() => {
                rej({ reason: 'timeout' });
            }, 10e3);
        }).catch(this.defaultErrorHandler)

    }
    // 断开所有客户端
    disconnectAllClients() {
        this.logger.info('正在断开所有客户端连接...');
        if (this.connectedClients) {
            this.connectedClients.forEach(client => {
                try {
                    client.close(1000, '服务器重启');
                } catch (e) {
                    this.logger.error(`断开客户端失败: ${e}`);
                }
            });
            this.connectedClients.clear();
        }
    }
}

module.exports = OneBotWSAdapter;

# SparkAPI - LLSE 插件调用接口

## 概述
通过 `ll.imports("SparkAPIEx", "函数名")` 导入对应函数，可在其他 LLSE 插件中调用 SparkBridge3 的功能。
>> 为保证不与未来的官方导出冲突，所以本插件使用的命名空间为 "SparkAPIEx"

## 基础信息

### 获取框架版本
`getVersion()`
- 返回值：SparkBridge3 当前版本号
- 返回值类型：String

### 获取主群号
`getMainGroup()`
- 返回值：配置文件中的主群号
- 返回值类型：Number

### 获取管理员列表
`getAdminQQ()`
- 返回值：管理员 QQ 号列表
- 返回值类型：Array

### 获取机器人 QQ
`getBotQQ()`
- 返回值：机器人自身的 QQ 号
- 返回值类型：Number

## 消息发送

### 发送群消息
`sendGroupMsg(gid, msg)`
- 参数：
  - gid : `Number` - 群号
  - msg : `String | Array` - 消息内容或消息段数组
- 返回值：发送结果
- 返回值类型：Promise

### 发送私聊消息
`sendPrivateMsg(fid, msg)`
- 参数：
  - fid : `Number` - 好友 QQ 号
  - msg : `String | Array` - 消息内容或消息段数组
- 返回值：发送结果
- 返回值类型：Promise

### 发送合并转发消息
`sendGroupForwardMsg(gid, msg)`
- 参数：
  - gid : `Number` - 群号
  - msg : `Array` - 合并转发消息内容
- 返回值：发送结果
- 返回值类型：Promise

### 撤回消息
`deleteMsg(id)`
- 参数：
  - id : `String` - 消息 ID
- 返回值：操作结果
- 返回值类型：Promise

### 发送原始 WebSocket 包
`sendWSPack(pack)`
- 参数：
  - pack : `Object` - 要发送的原始数据包
- 返回值：发送结果
- 返回值类型：void

## 群管理

### 禁言群成员
`sendGroupBan(gid, mid, duration)`
- 参数：
  - gid : `Number` - 群号
  - mid : `Number` - 要禁言的成员 QQ
  - duration : `Number` - 禁言时长（秒）
- 返回值：操作结果
- 返回值类型：Promise

### 全员禁言
`sendGroupWholeBan(gid, enable)`
- 参数：
  - gid : `Number` - 群号
  - enable : `Boolean` - true 开启全员禁言，false 关闭
- 返回值：操作结果
- 返回值类型：void

### 踢出群成员
`setGroupKick(gid, mid, reject)`
- 参数：
  - gid : `Number` - 群号
  - mid : `Number` - 要踢出的成员 QQ
  - reject : `Boolean` - 是否拒绝再次加群
- 返回值：操作结果
- 返回值类型：void

### 退出群聊
`setGroupLeave(gid, dismiss)`
- 参数：
  - gid : `Number` - 群号
  - dismiss : `Boolean` - 是否解散群（仅群主有效）
- 返回值：操作结果
- 返回值类型：void

### 设置群名称
`setGroupName(gid, name)`
- 参数：
  - gid : `Number` - 群号
  - name : `String` - 新群名称
- 返回值：操作结果
- 返回值类型：void

### 设置群名片
`setGroupCard(gid, mid, card)`
- 参数：
  - gid : `Number` - 群号
  - mid : `Number` - 成员 QQ
  - card : `String` - 新群名片
- 返回值：操作结果
- 返回值类型：Promise

### 删除群文件
`deleteGroupFile(gid, fileId)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
- 返回值：操作结果
- 返回值类型：void

### 创建群文件文件夹
`createGroupFileFolder(gid, name)`
- 参数：
  - gid : `Number` - 群号
  - name : `String` - 文件夹名称
- 返回值：操作结果
- 返回值类型：void

### 删除群文件文件夹
`deleteGroupFileFolder(gid, folderId)`
- 参数：
  - gid : `Number` - 群号
  - folderId : `String` - 文件夹 ID
- 返回值：操作结果
- 返回值类型：void

### 移动群文件
`moveGroupFile(gid, fileId, currentParentDirectory, targetParentDirectory)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
  - currentParentDirectory : `String` - 当前父目录 ID
  - targetParentDirectory : `String` - 目标父目录 ID
- 返回值：操作结果
- 返回值类型：void

### 转存群文件
`transGroupFile(gid, fileId)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
- 返回值：操作结果
- 返回值类型：void

### 重命名群文件
`renameGroupFile(gid, fileId, currentParentDirectory, newName)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
  - currentParentDirectory : `String` - 当前父目录 ID
  - newName : `String` - 新文件名
- 返回值：操作结果
- 返回值类型：void

### 上传群文件
`uploadGroupFile(gid, file, name, folderId, uploadFile)`
- 参数：
  - gid : `Number` - 群号
  - file : `String` - 本地文件路径
  - name : `String` - 上传后的文件名
  - folderId : `String` - 目标目录 ID，不填通常为根目录
  - uploadFile : `Boolean` - 是否实际执行上传，默认 `true`
- 返回值：操作结果
- 返回值类型：void

### 上传私聊文件
`uploadPrivateFile(uid, file, name, uploadFile)`
- 参数：
  - uid : `Number` - 用户 QQ
  - file : `String` - 本地文件路径
  - name : `String` - 上传后的文件名
  - uploadFile : `Boolean` - 是否实际执行上传，默认 `true`
- 返回值：操作结果
- 返回值类型：void

## 获取信息

### 获取群成员列表
`getGroupMemberList(gid)`
- 参数：
  - gid : `Number` - 群号
- 返回值：群成员信息数组
- 返回值类型：Promise(Array)

### 获取群成员信息
`getGroupMemberInfo(gid, mid)`
- 参数：
  - gid : `Number` - 群号
  - mid : `Number` - 成员 QQ
- 返回值：指定成员详细信息
- 返回值类型：Promise(Object)

### 获取群列表
`getGroupList()`
- 返回值：机器人加入的所有群列表
- 返回值类型：Promise(Array)

### 获取好友列表
`getFriendList()`
- 返回值：机器人的好友列表
- 返回值类型：Promise(Array)

### 获取群信息
`getGroupInfo(gid, noCache)`
- 参数：
  - gid : `Number` - 群号
  - noCache : `Boolean` - 是否不使用缓存
- 返回值：群详细信息
- 返回值类型：Promise(Object)

### 获取陌生人信息
`getStrangerInfo(uid, noCache)`
- 参数：
  - uid : `Number` - 用户 QQ
  - noCache : `Boolean` - 是否不使用缓存
- 返回值：用户详细信息
- 返回值类型：Promise(Object)

### 获取好友信息
`getFriendInfo(fid, noCache)`
- 参数：
  - fid : `Number` - 好友 QQ
  - noCache : `Boolean` - 是否不使用缓存
- 返回值：好友详细信息
- 返回值类型：Promise(Object)

### 获取登录信息
`getLoginInfo()`
- 返回值：机器人登录信息（QQ、昵称等）
- 返回值类型：Promise(Object)

### 获取状态
`getStatus()`
- 返回值：机器人当前状态
- 返回值类型：Promise(Object)

### 获取消息
`getMsg(id)`
- 参数：
  - id : `String` - 消息 ID
- 返回值：指定消息的详细信息
- 返回值类型：Promise(Object)

### 获取群荣誉信息
`getGroupHonorInfo(gid, type)`
- 参数：
  - gid : `Number` - 群号
  - type : `String` - 荣誉类型
- 返回值：群荣誉信息
- 返回值类型：Promise(Object)

### 获取群文件系统信息
`getGroupFileSystemInfo(gid)`
- 参数：
  - gid : `Number` - 群号
- 返回值：群文件系统信息
- 返回值类型：Promise(Object)

### 获取群根目录文件
`getGroupRootFiles(gid, fileCount)`
- 参数：
  - gid : `Number` - 群号
  - fileCount : `Number | String` - 文件数量，默认 `50`
- 返回值：群根目录文件列表
- 返回值类型：Promise(Object)

### 获取群目录下文件
`getGroupFilesByFolder(gid, folderId, fileCount)`
- 参数：
  - gid : `Number` - 群号
  - folderId : `String` - 文件夹 ID
  - fileCount : `Number | String` - 文件数量，默认 `50`
- 返回值：目录中的文件和文件夹
- 返回值类型：Promise(Object)

### 获取群文件下载地址
`getGroupFileUrl(gid, fileId)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
- 返回值：文件下载地址信息
- 返回值类型：Promise(Object)

### 获取机型显示
`getModelShow()`
- 返回值：当前机型显示信息
- 返回值类型：Promise(Object)

## 其他功能

### 点赞
`sendLike(uid, times)`
- 参数：
  - uid : `Number` - 要点赞的用户 QQ
  - times : `Number` - 点赞次数（建议不超过 20）
- 返回值：操作结果
- 返回值类型：Promise

### 处理加群请求
`setGroupAddRequest(flag, subType, approve)`
- 参数：
  - flag : `String` - 请求标识
  - subType : `String` - 请求子类型
  - approve : `Boolean` - 是否同意
- 返回值：操作结果
- 返回值类型：void

### 处理加好友请求
`setFriendAddRequest(flag, approve)`
- 参数：
  - flag : `String` - 请求标识
  - approve : `Boolean` - 是否同意
- 返回值：操作结果
- 返回值类型：void

## 消息构建器

### 文本消息
`text(content)`
- 参数：
  - content : `String` - 文本内容
- 返回值：文本消息段
- 返回值类型：Object

### At 某人
`at(qq)`
- 参数：
  - qq : `Number | String` - 要 @ 的 QQ 号
- 返回值：@消息段
- 返回值类型：Object

### 图片消息
`img(file)`
- 参数：
  - file : `String | Buffer` - 图片路径、URL 或 Buffer
- 返回值：图片消息段
- 返回值类型：Object

### 表情消息
`face(id)`
- 参数：
  - id : `String | Number` - 表情 ID
- 返回值：表情消息段
- 返回值类型：Object

### 视频消息
`video(file)`
- 参数：
  - file : `String` - 视频文件路径
- 返回值：视频消息段
- 返回值类型：Object

### 语音消息
`record(file)`
- 参数：
  - file : `String` - 语音文件路径
- 返回值：语音消息段
- 返回值类型：Object

### 回复消息
`reply(id)`
- 参数：
  - id : `String` - 要回复的消息 ID
- 返回值：回复消息段
- 返回值类型：Object

### 格式化消息
`format(msg)`
- 参数：
  - msg : `String | Object | Array` - 要格式化的消息
- 返回值：格式化后的消息数组
- 返回值类型：Array

### 创建合并转发构建器
`ForwardMsgBuilder()`
- 返回值：新的 ForwardMsgBuilder 实例
- 返回值类型：Object

## 包构建器（高级功能）

### 群截一截包
`GroupPokePack(group_id, user_id, id)`
- 参数：
  - group_id : `Number` - 群号
  - user_id : `Number` - 被戳用户 QQ
  - id : `String` - 唯一请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 私聊截一截保
`FriendPokePack(user_id, id)`
- 参数：
  - user_id : `Number` - 被戳用户 QQ
  - id : `String` - 唯一请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 群消息包
`GroupMessagePack(gid, msg, id)`
- 参数：
  - gid : `Number` - 群号
  - msg : `Array` - 消息内容
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 私聊消息包
`PrivateMessagePack(fid, msg, id)`
- 参数：
  - fid : `Number` - 好友 QQ
  - msg : `Array` - 消息内容
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 合并转发消息包
`GroupForwardMessagePack(gid, msg, id)`
- 参数：
  - gid : `Number` - 群号
  - msg : `Array` - 合并转发内容
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 禁言包
`GroupBanPack(gid, mid, duration)`
- 参数：
  - gid : `Number` - 群号
  - mid : `Number` - 成员 QQ
  - duration : `Number` - 禁言时长
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 群成员列表包
`GroupMemberListPack(gid, id)`
- 参数：
  - gid : `Number` - 群号
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 点赞包
`LikePack(fid, times)`
- 参数：
  - fid : `Number` - 用户 QQ
  - times : `Number` - 点赞次数
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 获取群根目录文件包
`GroupRootFilesPack(gid, id, fileCount)`
- 参数：
  - gid : `Number` - 群号
  - id : `String` - 请求 ID
  - fileCount : `Number | String` - 文件数量，默认 `50`
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 上传群文件包
`UploadGroupFilePack(gid, file, name, folderId, uploadFile)`
- 参数：
  - gid : `Number` - 群号
  - file : `String` - 本地文件路径
  - name : `String` - 上传后的文件名
  - folderId : `String` - 目标目录 ID
  - uploadFile : `Boolean` - 是否实际执行上传，默认 `true`
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 删除群文件包
`DeleteGroupFilePack(gid, fileId)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 创建群文件夹包
`CreateGroupFileFolderPack(gid, name)`
- 参数：
  - gid : `Number` - 群号
  - name : `String` - 文件夹名称
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 删除群文件夹包
`DeleteGroupFileFolderPack(gid, folderId)`
- 参数：
  - gid : `Number` - 群号
  - folderId : `String` - 文件夹 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 获取群文件系统信息包
`GroupFileSystemInfoPack(gid, id)`
- 参数：
  - gid : `Number` - 群号
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 获取群目录文件包
`GroupFilesByFolderPack(gid, folderId, id, fileCount)`
- 参数：
  - gid : `Number` - 群号
  - folderId : `String` - 文件夹 ID
  - id : `String` - 请求 ID
  - fileCount : `Number | String` - 文件数量，默认 `50`
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 获取群文件地址包
`GroupFileUrlPack(gid, fileId, id)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
  - id : `String` - 请求 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 上传私聊文件包
`UploadPrivateFilePack(uid, file, name, uploadFile)`
- 参数：
  - uid : `Number` - 用户 QQ
  - file : `String` - 本地文件路径
  - name : `String` - 上传后的文件名
  - uploadFile : `Boolean` - 是否实际执行上传，默认 `true`
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 移动群文件包
`MoveGroupFilePack(gid, fileId, currentParentDirectory, targetParentDirectory)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
  - currentParentDirectory : `String` - 当前父目录 ID
  - targetParentDirectory : `String` - 目标父目录 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 转存群文件包
`TransGroupFilePack(gid, fileId)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
- 返回值：OneBot 协议数据包
- 返回值类型：Object

### 重命名群文件包
`RenameGroupFilePack(gid, fileId, currentParentDirectory, newName)`
- 参数：
  - gid : `Number` - 群号
  - fileId : `String` - 文件 ID
  - currentParentDirectory : `String` - 当前父目录 ID
  - newName : `String` - 新文件名
- 返回值：OneBot 协议数据包
- 返回值类型：Object

## 使用示例

```javascript
// 导入函数
const sendGroupMsg = ll.imports("SparkAPIEx", "sendGroupMsg");
const text = ll.imports("SparkAPIEx", "text");
const getGroupMemberList = ll.imports("SparkAPIEx", "getGroupMemberList");

// 发送消息
sendGroupMsg(123456789, text("Hello from LLSE plugin!"));

// 获取群成员列表
const members = await getGroupMemberList(123456789);
members.forEach(m => {
    logger.info(`${m.nickname} - ${m.user_id}`);
});
```

## 注意事项
- 所有返回 Promise 的函数都需要使用 `await` 或 `.then()` 处理异步结果
- 请确保在 SparkBridge3 完全启动后再调用这些函数
- 部分功能需要机器人具有相应的群管理权限

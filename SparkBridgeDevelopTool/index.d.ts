/**
 * SparkBridge3 插件开发类型定义
 * 提供了沙盒环境内注入的全局对象和 API 支持
 */

declare interface SparkLogger {
    info(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

/** 定义事件传递的具体数据结构 */
interface EventPayloads {
    /** 收到完整的 OneBot 数据包 */
    "gocq.pack": {
        post_type: string;
        message_type?: string;
        user_id: number;
        raw_message?: string;
        [key: string]: any; // 允许其他扩展字段
    };

    /** 消息事件 */
    "message": {
        sender: { user_id: number; nickname: string };
        message: string;
        group_id?: number;
    };

    /** 配置更新事件（这是一个特殊处理，见下文） */
    [key: `config.update.${string}`]: any;
}

/** 定义所有合法的事件名称 */
type SparkEventNames =
    | "gocq.pack"                 // 收到完整的 OneBot 数据包
    | "message.group.normal"                   // 收到消息事件
    | `config.update.${string}` // 动态匹配所有配置更新事件
    | (string & { _?: never });   // 允许自动补全的同时，支持自定义字符串（如 config.update.插件名）

/** * 文件操作对象类 (对应 file.js 中的 FileObj)
 * 专门用于操作插件独立的数据目录
 */
declare interface FileHelperInstance {
    /** 插件数据目录下的插件名 */
    pname: string;

    /** * 初始化文件
     * @param fname 文件名
     * @param init_obj 初始内容对象
     * @param autoUpdate 是否自动同步缺失的键值对到本地文件，默认为 true
     */
    initFile(fname: string, init_obj: object, autoUpdate?: boolean): void;

    /** * 读取插件数据目录下的文件内容
     * @returns 字符串内容，若文件不存在则返回 null
     */
    read(fname: string): string | null;

    /** * 写入数据到插件数据目录
     * @param fname 文件名
     * @param data_obj 写入的内容（字符串或对象）
     * @param json 序列化工具，默认为 JSON
     */
    write(fname: string, data_obj: string | object, json?: any): void;

    /** 判断插件目录下是否存在某文件 */
    exists(fname: string): boolean;
}

/** * 静态文件工具方法 (对应 file.js 中的全局函数)
 */
declare interface FileStaticUtils {
    /** 判断绝对或相对路径是否存在 */
    exists(path: string): boolean;
    /** 读取指定路径的文件内容 */
    read(path: string): string | null;
    /** 写入内容到指定路径 */
    writeTo(path: string, raw: string): void;
    /** 递归创建目录 */
    mkdir(path: string): void;
    /** 复制文件 */
    copy(src: string, dest: string): void;
}
/** * 配置构造器接口
 * 支持链式调用来构建 Web 管理界面的配置表单
 */
declare interface WebConfigBuilder {
    /** 注册一个开关 */
    switch(key: string, val: boolean, desc: string): this;
    /** 注册一个文本输入框 */
    text(key: string, val: string, desc: string): this;
    /** 注册一个数字输入框 */
    number(key: string, val: number, desc: string): this;
    /** 注册一个下拉选择框 */
    select(key: string, val: string, options: string[], desc: string): this;
    /** 注册一个可编辑的数组/列表 */
    array(key: string, arr: any[], desc: string): this;
    /** 完成构建并提交注册到 Web 面板 */
    register(): void;
}

declare interface SparkLegacyAPI {
    /** 机器人 QQ 号 */
    qid: number;
    /** 是否开启调试模式 */
    debug: boolean;
    /** 环境变量操作 */
    env: {
        get(key: string): any;
        set(key: string, value: any): void;
    };
    /** Web 管理相关 API */
    web: {
        /** * 创建一个新的配置表单构造器
         * @param name 表单名称（通常使用插件名）
         */
        createConfig(name: string): WebConfigBuilder;
        /** 注册一个插件自定义 API 接口 */
        registerApi(method: 'get' | 'post' | 'put' | 'delete', path: string, handler: (req: any, res: any) => void, needAuth?: boolean): void;
        /** 在 Web 面板注册一个自定义页面 */
        registerPage(title: string, relativePath: string): void;
    };
    QClient: QClient;
    /** 配置与遥测 */
    /** 获取文件操作助手 */
    /** * 获取一个针对当前插件数据目录的文件操作实例 
     * @param pluginName 插件名（选填，默认为当前插件名）
     */
    getFileHelper(pluginName?: string): FileHelperInstance;
    /** 获取当前插件的日志句柄 */
    getLogger(): SparkLogger;

    /** * 监听 Spark 核心事件
     * @param event 事件名称，例如 'gocq.pack' 或 'config.update.你的插件名'
     * @param listener 回调函数
     */
    on(event: SparkEventNames, listener: (...args: any[]) => void): this;

    /** * 核心：通过泛型 K 匹配 EventPayloads 里的键
     */
    // on<K extends keyof EventPayloads>(
    //     event: K,
    //     listener: (data: EventPayloads[K]) => void
    // ): this;

    // 1. 精准匹配特定的核心事件 (单参数)
    on(event: "gocq.pack", listener: (data: EventPayloads["gocq.pack"]) => void): this;
    on(event: "message", listener: (data: EventPayloads["message"]) => void): this;

    // 2. 精准匹配配置更新事件 (双参数：键名和新值)
    on(
        event: `config.update.${string}`,
        listener: (key: string, newValue: any) => void
    ): this;

    /** 单词监听 */
    once(event: SparkEventNames, listener: (...args: any[]) => void): this;

    /** 移除监听 */
    off(event: SparkEventNames, listener: (...args: any[]) => void): this;
}

declare interface QClient { 
    sendGroupMsg(groupId: number, message: string): Promise<void>;
    sendPrivateMsg(userId: number, message: string): Promise<void>;
    sendGroupForwardMsg(groupId: number, messages: any[]): Promise<void>;
    sendGroupBan(groupId: number, userId: string, duration: number): Promise<void>;
    deleteMsg(messageId: string): Promise<void>;
    sendGroupBan(groupId: number, userId: string, duration: number): Promise<void>;
    getGroupMemberList(groupId: number): Promise<any[]>;
    getGroupMemberInfo(groupId: number, userId: number): Promise<any>;
    setGroupAddRequest(flag: string, subType: string, approve: boolean): Promise<void>;
    setFriendAddRequest(flag: string, approve: boolean) : Promise<void>;
    sendLike(userId: number, times: number): Promise<void>;
    getMsg(messageId: string): Promise<any>;
    getGroupRootFiles(groupId: number): Promise<any[]>
    uploadGroupFile(groupId: number, fileName: string, asName: string, folderId: string)
    sendGroupWholeBan(groupId: number, enable: boolean): Promise<void>
    setGroupKick(groupId: number, userId: number, reject: boolean): Promise<void>
    setGroupLeave(groupId: number, dismiss: boolean): Promise<void>
    setGroupName(groupId: number, name: string): Promise<void>
    getStrangerInfo(userId: number, noCache: boolean): Promise<any>
    getFriendInfo(userId: number, noCache: boolean): Promise<any>
    getGroupInfo(groupId: number, noCache: boolean): Promise<any>
    getFriendList(): Promise<any>
    getGroupList(): Promise<any>
    getGroupHonorInfo(groupId: number, type: string): Promise<any>

}

// --- 注入沙盒的全局变量 ---

/** 旧版兼容对象，包含核心 API */
declare const spark: SparkLegacyAPI;

/** 专门为当前插件生成的日志实例 */
declare const logger: SparkLogger;

/** 插件所在的绝对目录路径 */
declare const __dirname: string;

/** 基础 Node.js 全局函数 */
declare function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): NodeJS.Timeout;
declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): NodeJS.Timeout;
declare function clearInterval(timeoutId: NodeJS.Timeout): void;
declare function clearTimeout(timeoutId: NodeJS.Timeout): void;

/** 提供部分 process 功能 */
declare const process: {
    cwd(): string;
    platform: string;
    env: { NODE_ENV: string | undefined };
};

/** 只有在特定权限（如 'key'）下才可用的 ll/mc 对象 */
declare const ll: any;
declare const mc: any;

/** 模块引入函数 */
declare function require(moduleName: string): any;
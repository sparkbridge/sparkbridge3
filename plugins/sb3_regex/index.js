const { text, at, image, build } = require('../../handles/msgbuilder');
const fhelper = require('../../handles/file');

// 1. 初始化文件助手 (使用我们的 File API)
const fileObj = new fhelper.FileObj('sb3_regex');

// ==========================================
// 模块 B: 基础配置持久化 (config.json)
// ==========================================
// 尝试读取本地已保存的配置，如果没有则使用默认值并立刻保存
const defaultConfig = { enable: true, admin_debug: false,book:false,book_url:"" };


fileObj.initFile("rules.json", [
    {
        id: 'rule_101', name: '辱骂词汇拦截', enabled: true, triggerType: 'message',
        pattern: '(tmd|sb|卧槽|滚)', flags: 'ig', eventType: '',
        conditions: [{ id: 'c1', field: 'userRole', operator: '!=', value: 'admin' }],
        actions: [{ id: 'a1', type: 'deleteMessage', params: '' }, { id: 'a2', type: 'muteUser', params: '600' }]
    },
    {
        id: 'rule_103', name: '新人入群欢迎', enabled: true, triggerType: 'event',
        pattern: '', flags: '', eventType: 'group.member_join',
        conditions: [{ id: 'c4', field: 'groupId', operator: '==', value: '123456789' }],
        actions: [{ id: 'a5', type: 'replyText', params: '欢迎 $userId 加入本群！' }]
    }
]);
let rules = JSON.parse(fileObj.read('rules.json'))

fileObj.initFile("config.json", defaultConfig);
const conf = JSON.parse(fileObj.read('config.json'));


// 注册动态 Web 配置 (原生 Web API)，注意：默认值直接填入读取到的 conf 变量
spark.web.createConfig("sb3_regex")
    .switch("enable", conf.enable, "是否全局启用正则引擎")
    .switch("admin_debug", conf.admin_debug, "是否开启匹配调试日志")
    .switch("book",conf.book,"是否开启订阅功能")
    .text("book_url",conf.book_url,"订阅链接")
    .register();

spark.web.registerApi("GET","/regexengine/list",(req,res)=>{
    res.json({code:200,data:rules})
},false);
spark.web.registerApi("POST","/regexengine/save",(req,res)=>{ 
    const data = req.body;
    // console.log(data);
    rules = data;
    fileObj.write('rules.json', rules);
    res.json({code:200,message:"保存成功"});
},false);

spark.web.registerPage("正则测试器","regextest.html")

// 监听配置更新，同步修改内存并【调用 File API 存入本地】
spark.on("config.update.sb3_regex", (key, val) => {
    conf[key] = val;
    fileObj.write('config.json', conf); // 持久化保存
    logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});

const customActionsRegistry = {};

/**
 * 暴露给其他插件的注册函数
 * @param {string} actionType 动作类型名称 (如 'getWeather')
 * @param {function} handlerFunction 处理函数
 */
function registerAction(actionType, handlerFunction) {
    if (typeof handlerFunction === 'function') {
        customActionsRegistry[actionType] = handlerFunction;
        logger.info(`已成功注册外部自定义动作: [${actionType}]`);
    } else {
        logger.error(`注册外部动作 [${actionType}] 失败: 必须提供一个函数`);
    }
}

// 将该函数挂载到 sharedEnv 变量池中
if (spark.env && spark.env.set) {
    spark.env.set('regex.register_action', registerAction);
    console.log(spark.env.get("regex.register_action"));
    logger.info('已将自定义动作注册接口挂载到全局变量池: regex.register_action');
}

/**
 * 文本变量替换引擎
 * @param {string} text 包含 $变量 的原始文本
 * @param {Object} pack 消息包 (提供基础属性)
 * @param {Object} context 动作上下文 (提供插件返回的动态属性)
 */
function parseVariables(text, pack, context) {
    if (!text) return '';

    // 匹配 $ 开头，后面跟着字母、数字或下划线的变量名，例如 $userId, $weather
    return text.replace(/\$([a-zA-Z0-9_]+)/g, (match, varName) => {
        // 1. 优先匹配系统内置变量
        if (varName === 'userId') return pack.user_id;
        if (varName === 'groupId') return pack.group_id;
        if (varName === 'nickname') return pack.sender ? pack.sender.nickname : '';

        // 2. 匹配上下文中的动态变量 (包括 executeCommand 的 result，或第三方插件返回的 kv)
        if (context[varName] !== undefined) {
            return context[varName];
        }

        // 3. 如果都没找到，原样返回（或者你也可以改成返回空字符串 ''）
        return match;
    });
}

// ==========================================
// 模块 C: 异步动作执行器
// ==========================================
async function executeActions(actions, pack) {
    // 动作执行上下文，现在它是一个动态的变量池
    let actionContext = {
        result: '' // 保留默认的 $result 供 executeCommand 等使用
    };

    for (const action of actions) {
        try {
            // 1. 优先检查是否为其他插件注册的自定义动作
            if (customActionsRegistry[action.type]) {
                // 此时也可以用 parseVariables 解析第三方动作的 params (这样第三方插件也能接收动态参数)
                const parsedParams = parseVariables(action.params, pack, actionContext);

                // 执行第三方自定义动作
                const ret = await customActionsRegistry[action.type](parsedParams, pack, actionContext);

                // 【核心修改】判断返回值类型
                if (ret && typeof ret === 'object' && !Array.isArray(ret)) {
                    // 如果返回的是 {weather: "晴天", location: "美国"} 这样的对象
                    // 直接将键值对合并到 actionContext 中
                    Object.assign(actionContext, ret);
                } else if (ret !== undefined) {
                    // 如果只返回了字符串或数字，按老规矩存入 $result
                    actionContext.result = String(ret);
                }
                continue;
            }

            // 2. 原生内置动作
            switch (action.type) {
                case 'replyText': {
                    // 【核心修改】使用通用的变量替换引擎
                    let content = parseVariables(action.params, pack, actionContext);
                    await spark.QClient.sendGroupMsg(pack.group_id, content);
                    break;
                }

                case 'deleteMessage': {
                    await spark.adapter.deleteMsg(pack.message_id);
                    break;
                }

                case 'muteUser': {
                    // 禁言时长也支持解析变量了，比如第三方插件返回了一个 $punishTime
                    const parsedDuration = parseVariables(action.params, pack, actionContext);
                    const duration = parseInt(parsedDuration) || 600;
                    await spark.adapter.sendGroupBan(pack.group_id, pack.user_id, duration);
                    break;
                }

                case 'executeCommand': {
                    // 命令也支持动态变量替换，比如 list $targetPlayer
                    let parsedCmd = parseVariables(action.params, pack, actionContext);
                    let res = mc.runcmdEx(parsedCmd);
                    actionContext.result = res.output || (res.success ? "执行成功" : "执行失败");
                    break;
                }

                default:
                    console.warn(`[正则模块] 未知动作类型: ${action.type}`);
            }
        } catch (err) {
            console.error(`[正则模块] 执行动作 ${action.type} 失败:`, err.message);
        }
    }
}

/**
 * 校验规则条件
 * @param {Array} conditions 条件列表
 * @param {Object} pack 消息包
 */
function checkConditions(conditions, pack) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
        let actualValue;
        // 映射字段名
        if (cond.field === 'userRole') actualValue = pack.sender ? pack.sender.role : 'member';
        else if (cond.field === 'userId') actualValue = pack.user_id.toString();
        else if (cond.field === 'groupId') actualValue = pack.group_id.toString();
        else actualValue = pack[cond.field];

        switch (cond.operator) {
            case '==': return actualValue == cond.value;
            case '!=': return actualValue != cond.value;
            case '>': return actualValue > cond.value;
            case '<': return actualValue < cond.value;
            case 'includes': return actualValue.includes(cond.value);
            default: return false;
        }
    });
}

// ==========================================
// 模块 D: 核心匹配引擎
// ==========================================
spark.on('message.group.normal', async (pack) => {
    // console.log(pack);
    // 检查配置项中的 enable 开关
    if (!conf.enable || pack.post_type !== 'message' || pack.message_type !== 'group') return;

    const msgText = pack.raw_message.trim();

    // 2. 遍历规则库
    for (const rule of rules) {
        // 仅处理触发类型为 message 的规则
        if (!rule.enabled || rule.triggerType !== 'message') continue;

        try {
            // 3. 正则匹配
            const regex = new RegExp(rule.pattern, rule.flags || 'g');
            if (regex.test(msgText)) {

                // 4. 条件检查（如排除管理员等）
                if (!checkConditions(rule.conditions, pack)) {
                    continue;
                }

                console.log(`[正则模块] 命中规则: ${rule.name}`);

                // 5. 执行动作
                await executeActions(rule.actions, pack);

                // 如果设置了拦截，则停止匹配后续规则
                if (rule.block) break;
            }
        } catch (e) {
            // 使用 Spark 注入的 logger
            console.error(`规则 [${rule.name}] 的正则表达式错误: ${e.message}`);
        }
    }
});

spark.on('system.request_reload', () => {
    logger.info("正则规则已热重载完毕。");
});
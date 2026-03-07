const { text, at, image, build } = require('../../handles/msgbuilder');
const fhelper = require('../../handles/file');

// 1. 初始化文件助手 (使用我们的 File API)
const fileObj = new fhelper.FileObj('sb3_regex');

// ==========================================
// 模块 B: 基础配置持久化 (config.json)
// ==========================================
// 尝试读取本地已保存的配置，如果没有则使用默认值并立刻保存
const defaultConfig = { enable: true, admin_debug: false,book:false,book_url:"",only_on_main:true };


fileObj.initFile("rules.json", [
    {
        "id": "4a3gynzms",
        "name": "查询人数",
        "enabled": true,
        "triggerType": "message",
        "pattern": "查服",
        "flags": "i",
        "eventType": "group.member_join",
        "conditions": [],
        "actions": [
            {
                "id": "siy07v46s",
                "type": "executeCommand",
                "params": "list"
            },
            {
                "id": "e2g4ugyz1",
                "type": "replyText",
                "params": "$result"
            }
        ]
    },
    {
        "id": "th7nremtk",
        "name": "执行命令",
        "enabled": true,
        "triggerType": "message",
        "pattern": "执行(.+)",
        "flags": "i",
        "eventType": "group.member_join",
        "conditions": [
            {
                "id": "8ful15hh3",
                "field": "userRole",
                "operator": "==",
                "value": "admin"
            }
        ],
        "actions": [
            {
                "id": "hap8czwoh",
                "type": "executeCommand",
                "params": "$1"
            },
            {
                "id": "hmnunjjh6",
                "type": "replyText",
                "params": "$result"
            }
        ]
    },
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
],false);
let rules = JSON.parse(fileObj.read('rules.json'))

fileObj.initFile("config.json", defaultConfig);
const conf = JSON.parse(fileObj.read('config.json'));


// 注册动态 Web 配置 (原生 Web API)，注意：默认值直接填入读取到的 conf 变量
spark.web.createConfig("sb3_regex")
    .switch("enable", conf.enable, "是否全局启用正则引擎")
    .switch("admin_debug", conf.admin_debug, "是否开启匹配调试日志")
    .switch("book",conf.book,"是否开启订阅功能")
    .text("book_url",conf.book_url,"订阅链接")
    .switch("only_on_main",conf.only_on_main,"是否仅对主群生效")
    .register();

spark.web.registerApi("GET","/regexengine/list",(req,res)=>{
    res.json({code:200,data:rules})
},false);
spark.web.registerApi("POST","/regexengine/save",(req,res)=>{ 
    const data = req.body;
    // console.log(data);
    rules = data;
    splitRegex();
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

let messageRegex = [];
let eventRegex = [];

// 分割消息触发和事件触发
function splitRegex(){
    messageRegex.length = 0;
    eventRegex.length = 0;
    rules.forEach(rule => {
        if (rule.triggerType === 'message') {
            messageRegex.push(rule);
        } else if (rule.triggerType === 'event') {
            eventRegex.push(rule)
        }
    })
}

splitRegex();

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
    // console.log(spark.env.get("regex.register_action"));
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
/**
 * 执行动作序列
 * @param {Array} actions 动作列表
 * @param {Object} pack 原始消息包
 * @param {Array} matchResult 正则匹配结果数组
 */
async function executeActions(actions, pack, matchResult = []) {
    let actionContext = {
        result: ''
    };

    // 【核心修改】将正则捕获组注入到上下文中
    // 这样上下文中就会有 context['0'], context['1'] 等属性
    if (matchResult && matchResult.length > 0) {
        matchResult.forEach((val, index) => {
            actionContext[index.toString()] = val;
        });
    }

    for (const action of actions) {
        try {
            if (customActionsRegistry[action.type]) {
                const parsedParams = parseVariables(action.params, pack, actionContext);
                const ret = await customActionsRegistry[action.type](parsedParams, pack, actionContext);

                if (ret && typeof ret === 'object' && !Array.isArray(ret)) {
                    Object.assign(actionContext, ret);
                } else if (ret !== undefined) {
                    actionContext.result = String(ret);
                }
                continue;
            }

            switch (action.type) {
                case 'replyText': {
                    let content = parseVariables(action.params, pack, actionContext);
                    await spark.QClient.sendGroupMsg(pack.group_id, content);
                    break;
                }
                case 'deleteMessage': {
                    await spark.QClient.deleteMsg(pack.message_id);
                    break;
                }
                case 'muteUser': {
                    const parsedDuration = parseVariables(action.params, pack, actionContext);
                    const duration = parseInt(parsedDuration) || 600;
                    await spark.QClient.sendGroupBan(pack.group_id, pack.user_id, duration);
                    break;
                }
                case 'executeCommand': {
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
 * 校验规则条件 (多重身份独立验证)
 * @param {Array} conditions 条件列表
 * @param {Object} pack 消息包/事件包
 */
function checkConditions(conditions, pack) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(cond => {
        // --- 特殊处理：userRole 权限字段 ---
        if (cond.field === 'userRole') {
            const userRoles = []; // 用户当前拥有的身份集合

            // 1. 获取群内本地身份 (owner, admin, member)
            if (pack.sender && pack.sender.role) {
                userRoles.push(pack.sender.role);
            } else {
                userRoles.push('member');
            }

            // 2. 获取全局最高管理身份 (sparkadmin)
            if (spark.env.get("admin_qq").includes(Number(pack.user_id))) {
                userRoles.push('sparkadmin');
            }

            // 只要用户的身份集合里，包含了配置里要求的那个身份就行
            if (cond.operator === '==') return userRoles.includes(cond.value);
            // 如果是不等于，就要求用户的身份集合里【不能】有那个身份
            if (cond.operator === '!=') return !userRoles.includes(cond.value);

            return false;
        }

        // --- 常规处理：其他普通字段 ---
        let actualValue = '';
        if (cond.field === 'userId') {
            actualValue = (pack.user_id || '').toString();
        } else if (cond.field === 'groupId') {
            actualValue = (pack.group_id || '').toString();
        } else {
            actualValue = pack[cond.field] !== undefined ? String(pack[cond.field]) : '';
        }

        // --- 核心判定 ---
        if (cond.operator === '==') return actualValue == cond.value;
        if (cond.operator === '!=') return actualValue != cond.value;
        if (cond.operator === 'includes') return actualValue.includes(cond.value);
        if (cond.operator === 'matches') {
            try {
                const regex = new RegExp(cond.value, 'i');
                return regex.test(actualValue);
            } catch (e) {
                console.error(`[正则模块] 条件匹配正则错误 (${cond.value}):`, e.message);
                return false;
            }
        }

        return false;
    });
}

// ==========================================
// 模块 D: 核心匹配引擎
// ==========================================
spark.on('message.group.normal', async (pack) => {
    if (!conf.enable || pack.post_type !== 'message' || pack.message_type !== 'group') return;
    if (pack.group_id !== spark.env.get('main_group') && conf.only_on_main == true) return;

    const msgText = pack.raw_message.trim();

    for (const rule of messageRegex) {
        if (!rule.enabled || rule.triggerType !== 'message') continue;

        try {
            const regex = new RegExp(rule.pattern, rule.flags || 'g');

            // 【核心修改】使用 exec 获取匹配结果数组
            // matchResult[0] 是完整匹配内容，matchResult[1] 是第一个括号的捕获组，以此类推
            const matchResult = regex.exec(msgText);

            if (matchResult) {
                if (!checkConditions(rule.conditions, pack)) {
                    continue;
                }

                // console.log(`[正则模块] 命中规则: ${rule.name}`);

                // 【核心修改】将 matchResult 传递给执行器
                await executeActions(rule.actions, pack, matchResult);

                if (rule.block) break;
            }
        } catch (e) {
            console.error(`规则 [${rule.name}] 的正则表达式错误: ${e.message}`);
        }
    }
});

/**
 * 通用事件处理引擎
 * @param {string} currentEventType 当前触发的事件类型 (如 'group.member_join')
 * @param {Object} pack 原始事件数据包
 */
async function handleEvent(currentEventType, pack) {
    // 1. 全局开关检查
    if (!conf.enable) return;

    // 2. 数据包容错处理 (防止替换变量时由于缺少字段报错)
    // 很多 Notice 事件没有 sender 对象，我们为其提供一个安全的默认值
    if (!pack.sender) {
        pack.sender = {
            role: 'member',
            nickname: pack.user_id ? pack.user_id.toString() : '未知用户'
        };
    }

    // 3. 遍历规则库
    for (const rule of rules) {
        // 过滤出启用、类型为 event 且事件类型匹配的规则
        if (!rule.enabled || rule.triggerType !== 'event' || rule.eventType !== currentEventType) {
            continue;
        }

        try {
            let matchResult = [];

            // 4. 正则匹配 (对于事件，通常用于精准匹配特定的 QQ 号，非必填)
            if (rule.pattern && rule.pattern.trim() !== '') {
                const regex = new RegExp(rule.pattern, rule.flags || 'ig');
                // 以 user_id 作为正则匹配的默认目标
                const targetStr = pack.user_id ? pack.user_id.toString() : '';
                matchResult = regex.exec(targetStr);

                if (!matchResult) continue; // 正则未命中，跳过此规则
            } else {
                // 如果没有写正则，默认将 $0 设为 user_id
                matchResult = [pack.user_id ? pack.user_id.toString() : ''];
            }

            if(rule.eventType === 'server.player_chat'){
                matchResult = [pack.raw_message];
            }

            // 5. 条件校验 (复用原有的 checkConditions)
            if (!checkConditions(rule.conditions, pack)) {
                continue;
            }

            // console.log(`[正则模块] 触发事件规则: [${rule.name}] (${currentEventType})`);

            // 6. 执行动作序列 (复用原有的 executeActions)
            await executeActions(rule.actions, pack, matchResult);

            // 7. 阻断后续规则
            if (rule.block) break;

        } catch (e) {
            console.error(`[正则模块] 事件规则 [${rule.name}] 执行失败: ${e.message}`);
        }
    }
}

spark.on('notice.group.increase', async (pack) => {
    if(pack.group_id !== spark.env.get('main_group') && conf.only_on_main == true)return;
    await handleEvent('group.member_join', pack);
});

spark.on('notice.group.decrease', async (pack) => {
    if (pack.group_id !== spark.env.get('main_group') && conf.only_on_main == true) return;
    await handleEvent('group.member_leave', pack);
});

// 4. 监听: 甚至可以兼容 Minecraft 的进服事件！
if (typeof mc !== 'undefined') {
    mc.listen("onJoin", (player) => {
        // 构造一个兼容 QQ pack 格式的伪装包
        const mockPack = {
            user_id: player.realName || player.name,
            group_id: spark.env.get("main_group"), // 如果需要推送到QQ群，配置里写个默认群号
            sender: { nickname: player.realName, role: 'member' }
        };

        // 交给同一个通用函数处理！
        handleEvent('server.player_join', mockPack);
    });
    mc.listen("onLeft", (player) => {
        // 构造一个兼容 QQ pack 格式的伪装包
        const mockPack = {
            user_id: player.realName || player.name,
            group_id: spark.env.get("main_group"), // 如果需要推送到QQ群，配置里写个默认群号
            sender: { nickname: player.realName, role: 'member' }
        };

        // 交给同一个通用函数处理！
        handleEvent('server.player_left', mockPack);
    })
    mc.listen("onChat", (player, message) => {
        // 构造一个兼容 QQ pack 格式的伪装包
        const mockPack = {
            user_id: player.realName || player.name,
            group_id: spark.env.get("main_group"), // 如果需要推送到QQ群，配置里写个默认群号
            raw_message: message,
            sender: { nickname: player.realName, role: 'member' }
        }
        handleEvent('server.player_chat', mockPack);
    })
}

// spark.on('system.request_reload', () => {
//     logger.info("正则规则已热重载完毕。");
// });
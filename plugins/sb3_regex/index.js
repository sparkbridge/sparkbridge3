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

// ==========================================
// 模块 C: 异步动作执行器
// ==========================================
/**
 * 执行动作序列
 * @param {Array} actions 动作列表
 * @param {Object} pack 原始消息包
 */
async function executeActions(actions, pack) {
    for (const action of actions) {
        try {
            switch (action.type) {
                case 'replyText': {
                    // 替换变量，例如 $userId
                    let content = action.params
                        .replace('$userId', pack.user_id)
                        .replace('$nickname', pack.sender ? pack.sender.nickname : '');

                    // 调用已有的发送群消息接口
                    await spark.QClient.sendGroupMsg(pack.group_id, content);
                    break;
                }

                case 'deleteMessage': {
                    // 调用 OneBot API 撤回消息
                    await spark.adapter.deleteMsg(pack.message_id);
                    break;
                }

                case 'muteUser': {
                    // 调用 OneBot API 禁言用户
                    const duration = parseInt(action.params) || 600;
                    await spark.adapter.sendGroupBan(pack.group_id, pack.user_id, duration);
                    break;
                }

                case 'executeCommand':{
                    let res = mc.runcmdEx(action.params);
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
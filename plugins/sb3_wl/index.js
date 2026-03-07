const fileObj = spark.getFileHelper('sb3_wl');


const initconf = {
    enable:true,
    auto_add:true
}

fileObj.initFile("config.json",initconf);
const config = JSON.parse(fileObj.read('config.json'));

fileObj.initFile("wl.json",[]);
const wl = JSON.parse(fileObj.read('wl.json'));

spark.web.createConfig("sb3_wl")
    .switch("enable", config.enable, "是否开启白名单绑定")
    .switch("auto_add", config.auto_add, "是否自动执行命令")
    .register();



spark.on("config.update.sb3_wl", (key, val) => {
    config[key] = val;
    fileObj.write('config.json', conf); // 持久化保存
    // logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});


function save_wl(){ 
    fileObj.write('wl.json',JSON.stringify(wl));
}

function set_xbox_by_qid(qid,xbox){ 
    wl.push({qid,xbox});
    save_wl();
}

function get_xbox_by_qid(id){
    return wl.find(x=>x.qid == id);
}

function get_qid_by_xbox(xbox){ 
    return wl.find(x=>x.xbox == xbox).qid;
}

function xbox_exist(xbox){ 
    return wl.find(x=>x.xbox == xbox) != undefined;
}

function del_xbox_by_qid(qid){ 
    wl.splice(wl.findIndex(x=>x.qid == qid),1);
    save_wl();
}

spark.env.set('del_xbox_by_qid', del_xbox_by_qid);
spark.env.set('get_xbox_by_qid', get_xbox_by_qid);
spark.env.set('get_qid_by_xbox', get_qid_by_xbox);
spark.env.set('xbox_exist', xbox_exist);
spark.env.set('set_xbox_by_qid', set_xbox_by_qid);

const xbox = {
    getXbox: function (id) {
        return get_xbox_by_qid(id);
    },
    addXbox: function (id, xbox) {
        if (get_xbox_by_qid(id) == undefined) {
            if (xbox_exist(xbox)) {
                return false;
            }
            set_xbox_by_qid(id, xbox);
            return true;
        }
        return false;
    },
    remXboxByQid : function (id) {
        del_xbox_by_qid(id);
    },
    hasXbox: function (id) {
        return get_xbox_by_qid(id) != undefined;
    },
    getQQByXbox : function (xbox) {
        return get_qid_by_xbox(xbox);
    },
    remXboxByName : function (name) {
        let qid = get_qid_by_xbox(name);
        if(qid != undefined){
            del_xbox_by_qid(qid);
        }
    }
}

// 兼容SB2
spark.env.set('mc', xbox);

// console.log(config)

if(config.enable){
    // console.log("已启用白名单绑定");
    spark.on("message.group.normal",(e,reply)=>{
        let {raw_message,group_id} = e;
        // console.log(e)
        // console.log(spark.env.get("main_group"))
        if(group_id == spark.env.get("main_group")){ 
            if(raw_message.startsWith("绑定白名单")){
                if (get_xbox_by_qid(e.sender.user_id) == undefined) {
                    if(raw_message.length < 7){
                        reply("请输入正确的XboxID", true);
                        return;
                    }
                    let id = raw_message.substring(6);
                    if(xbox_exist(id)){
                        reply("该XboxID已绑定", true);
                        return;
                    }

                    if(config.auto_add)
                        mc.runcmd("whitelist add \"" + id + "\"");
                    set_xbox_by_qid(e.sender.user_id, id);
                    reply("绑定成功，你已绑定>" + id + "<", true);
                }else{
                    // console.log(get_xbox_by_qid(e.sender.user_id))
                    reply("你已经绑定白名单");
                }
            }else if(raw_message == "解绑白名单"){
                
                let usr_info = get_xbox_by_qid(e.sender.user_id);
                if(usr_info){
                    mc.runcmd("whitelist remove \"" + usr_info.xbox + "\"");
                    del_xbox_by_qid(e.sender.user_id);
                    reply("解绑成功", true);
                }else{
                    reply("你未绑定任何白名单", true);
                }
                
            }
        }
    });
    spark.on('notice.group_decrease', (e) => {
        const { self_id, user_id, group_id } = e;
        if (group_id != spark.env.get("main_group") || user_id == self_id) return
        if (get_xbox_by_qid(user_id) != undefined) {
            let xb = get_xbox_by_qid(user_id).xbox;
            del_xbox_by_qid(user_id);
            spark.QClient.sendGroupMsg(group_id, `用户${xb}退出群聊，已从白名单移除`)
            mc.runcmd('allowlist remove "' + xb + '"');
        }
    })

}
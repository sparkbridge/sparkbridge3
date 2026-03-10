const express = require('express');
const path = require('path');
const f = require('../../handles/file');

module.exports = (webManager) => {
    const router = express.Router();

    // 路由一：获取所有装载的插件列表 (从 PluginManager 内存中读)
    router.post('/toggle', webManager.requireAuth, (req, res) => {
        // 直接返回 PluginManager 中的 pluginsRegistry 完整数据
        let data = req.body;
        const registry = webManager.core.pluginManager.pluginsRegistry;
        // console.log(registry[data.id].folder);
        changeLoadStatus(registry[data.id].folder, data.enable);
        webManager.core.pluginManager.pluginsRegistry[data.id].info.enable = data.enable;
        res.json({
            code: 200// 包含插件状态、元信息、优先级等所有数据
        });
    });
    return router;
}

function changeLoadStatus(id, status) { 
    let json_path = path.join(__dirname, '../../plugins/', id, 'spark.json');
    // console.log(json_path);
    let data_json = JSON.parse(f.read(json_path));
    data_json.load = status;
    f.writeTo(json_path, JSON.stringify(data_json,null, 4));
    return true;
}

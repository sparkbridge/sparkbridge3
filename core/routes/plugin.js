const express = require('express');

module.exports = (webManager) => {
    const router = express.Router();

    // 路由一：获取所有装载的插件列表 (从 PluginManager 内存中读)
    router.get('/list', webManager.requireAuth, (req, res) => {
        // 直接返回 PluginManager 中的 pluginsRegistry 完整数据
        const registry = webManager.core.pluginManager.pluginsRegistry;
        res.json({
            code: 200,
            data: registry // 包含插件状态、元信息、优先级等所有数据
        });
    });

    router.get('/custom-pages', webManager.requireAuth, (req, res) => {
        res.json({
            code: 200,
            data: webManager.customPages
        });
    });

    // 路由二：获取插件配置 (从 WebManager 中读 registerConfig 注册的 Schema 数据)
    router.get('/config/:pluginName', webManager.requireAuth, (req, res) => {
        const { pluginName } = req.params;
        // 读取通过 registerConfig 注册的配置 Schema
        const schema = webManager.pluginsConfigSchema[pluginName];

        if (!schema) {
            return res.status(200).json({
                code: 404,
                msg: '该插件未推送配置定义（未调用 registerConfig）'
            });
        }

        // 返回注册的完整配置 Schema（包含表单类型、默认值、描述等）
        res.json({
            code: 200,
            data: schema
        });
    });

    // 路由三：保存配置 (写入磁盘并同步更新内存中的 Schema 值)
    // router.post('/config/:pluginName', webManager.requireAuth, (req, res) => {
    //     const { pluginName } = req.params;
    //     const newData = req.body; // 前端提交的最新配置键值对

    //     try {
    //         // 1. 持久化到磁盘
    //         // const { FileObj } = require('../../handles/file');
    //         // const file = new FileObj(pluginName);
    //         // file.write('config.json', newData);

    //         spark.emit("config.update."+pluginName,newData);
            

    //         // 触发事件，通知插件配置已更新
            

    //         // 2. 同步更新 WebManager 中注册的 Schema 值
    //         if (webManager.pluginsConfigSchema[pluginName]) {
    //             webManager.pluginsConfigSchema[pluginName].items.forEach(item => {
    //                 if (newData[item.key] !== undefined) {
    //                     // 更新 Schema 中的值，保证下次获取时是最新的
    //                     item.val = newData[item.key];
    //                 }
    //             });
    //         }

    //         res.json({
    //             code: 200,
    //             msg: '保存成功并已同步到内存',
    //             data: webManager.pluginsConfigSchema[pluginName] // 返回更新后的 Schema
    //         });
    //     } catch (e) {
    //         res.status(200).json({
    //             code: 500,
    //             msg: `保存失败：${e.message}`
    //         });
    //     }
    // });


    // 路由三：保存配置 (适配数组与深度比较)
    router.post('/config/:pluginName', webManager.requireAuth, (req, res) => {
        const { pluginName } = req.params;
        let newData = req.body;
        const updatedKeys = [];

        // 1. 健壮性检查：确保 newData 是一个对象格式 (k-v 映射)
        // 如果前端传的是数组 [{key: 'a', val: 1}], 转换成 {a: 1}
        if (Array.isArray(newData)) {
            const map = {};
            newData.forEach(i => { if (i.key) map[i.key] = i.val; });
            newData = map;
        }

        try {
            const schema = webManager.pluginsConfigSchema[pluginName];
            if (!schema) throw new Error('未找到该插件的配置定义');

            // console.log(schema)
            // console.log(newData)


            schema.items.forEach(item => {
                let newValue = newData[item.key];
                if (newValue === undefined) return;

                // --- 核心修复：根据配置定义强制转换类型 ---
                if (item.type === 'number') {
                    // 强制转换为数字类型，避免变成字符
                    newValue = Number(newValue);
                } else if (item.type === 'switch') {
                    // 强制转换为布尔类型
                    newValue = (newValue === true || newValue === 'true');
                }
                // ----------------------------------------

                const oldValue = item.val;

                // 2. 深度比较：现在比较的是转换后的正确类型
                const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

                if (isChanged) {
                    // 更新内存中的值，此时存入的是正确的数字或布尔类型
                    item.val = newValue;
                    updatedKeys.push(item.key);

                    // 4. 触发通用更新事件 (带 Key)
                    webManager.core.emit(`config.update.${pluginName}`, item.key, newValue);
                }
            });

            res.json({
                code: 200,
                msg: `成功更新 ${updatedKeys.length} 项配置`,
                data: {
                    updatedKeys,
                    // 返回最新的完整 Schema 供前端同步
                    schema: webManager.pluginsConfigSchema[pluginName]
                }
            });
        } catch (e) {
            res.status(200).json({ code: 500, msg: `保存失败: ${e.message}` });
        }
    });

    return router;
};
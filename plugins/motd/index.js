const Plugin = require('../../src/plugins/plugins');
// 引入您提供的 WebConfigBuilder
const { WebConfigBuilder } = require('../../src/services/webConfig'); // 確保路徑正確

class PingPongPlugin extends Plugin {

    /**
     * 【新增】靜態方法，用於定義插件的配置結構。
     * PluginManager 會自動調用此方法。
     * @returns {object}
     */
    static defineConfig() {
        const builder = new WebConfigBuilder('motd');
        builder.addText('startWith', 'motd', '触发前缀');
        builder.addSwitch('enable_private_chat', true, '是否在私聊中啟用');
        builder.addText('motd', '欢迎来到群组', 'MOTD');
        builder.addNumber('interval', 5, 'MOTD 刷新间隔（秒）');
        builder.addChoosing('mode', ['normal', 'random'], 0, "模式");
        builder.addEditArray('motd_list', ['MOTD 列表'], 'MOTD 列表')
        
        return {
            // schema 存放由 Builder 創建的配置定義
            schema: builder.configObj,
            // autoRepair 直接在此處設置，決定是否自動修復此插件的配置
            autoRepair: true
        };
    }

    async onEnable() {
        this.logger.info('motd 插件已啟用！');

        // 監聽配置更新事件
        if (this.ctx.config) {
            this.ctx.config.on('update', (key, newValue) => {
                this.logger.info(`配置項 [${key}] 已更新為: ${newValue}`);
            });
        }

        // this.ctx.adapter.on('message.group.normal', (event) => {
        //     if (event.raw_message === 'ping') {
        //         // 從配置中獲取回覆內容
        //         const replyContent = this.ctx.config.get('pong_reply', 'pong!');
        //         this.ctx.adapter.sendGroupMsg(event.group_id, replyContent);
        //     }
        // });

        this.ctx.adapter.on('message.private.friend', (event) => {
            // 從配置中讀取是否啟用
            if (!this.ctx.config.get('enable_private_chat', true)) return;

            if (event.raw_message.startsWith(this.ctx.config.get('startWith'))) {
                const replyContent = '触发motd';
                this.ctx.adapter.sendPrivateMsg(event.user_id, replyContent);
            }
        });
    }

    // onDisable 方法保持不變
}

module.exports = PingPongPlugin;
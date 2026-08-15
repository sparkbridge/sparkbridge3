const { msgbuilder, packbuilder } = spark;
const parseCQString = require('../../handles/parserCQString').parse;
const lg = require('../../handles/logger')
const logger = lg.getLogger();

const build_reply = (id, type, mid) => {
    return (msg, quote = false) => {
        msg = msgbuilder.format(msg);
        if (quote) {
            msg.unshift({
                type: 'reply',
                data: {
                    id: mid.toString()
                }
            });
        }
        if (type == 'group') {
            return spark.QClient.sendGroupMsg(id, msg);
        } else {
            return spark.QClient.sendPrivateMsg(id, msg);
        }
    }
}

spark.on('gocq.pack', (pack) => {
    const POST_TYPE = pack.post_type;
    switch (POST_TYPE) {
        case 'meta_event':
            spark.emit(`${POST_TYPE}.${pack.meta_event_type}`, pack);
            break;
        case 'message':
            // 格式归一化：保证下游插件（sb3_mc/sb3_wl/sb3_regex）拿到统一的消息数组格式
            //   - 数组（OneBot v11 segment）：NapCat 等，原样保留
            //   - 非数组（CQ 码字符串/缺失）：Gensokyo 等官方转换器输出，降级解析为数组
            if (!Array.isArray(pack.message)) {
                if (typeof pack.message === 'string') {
                    // 字符串（CQ 码字符串）：解析为 OneBot v11 segment 数组
                    pack.message = parseCQString(pack.message);
                } else {
                    // message 缺失或类型异常：降级为空文本段，避免下游插件崩溃
                    pack.message = [{ type: 'text', data: { text: '' } }];
                }
            }
            if (typeof pack.raw_message === 'string' && (pack.raw_message.includes('&#91;') || pack.raw_message.includes('&#93;') || pack.raw_message.includes('&#44;') || pack.raw_message.includes('&amp;'))) {
                pack.raw_message = pack.raw_message.replaceAll('&#91;', '[')
                    .replaceAll('&#93;', ']')
                    .replaceAll('&#44;', ',')
                    .replaceAll('&amp;', '&');
                // 采用最烂的替换方式，希望能有高效率的方法，欢迎PR
            }

            spark.emit(`${POST_TYPE}.${pack.message_type}.${pack.sub_type}`, pack, build_reply(pack.group_id == undefined ? pack.user_id : pack.group_id, pack.message_type, pack.message_id));
            break;
        case 'notice':
            if(spark.debug)
                logger.info(`触发 ${POST_TYPE}.${pack.notice_type}`)
            spark.emit(`${POST_TYPE}.${pack.notice_type}`, pack)
            break;
        case 'request':
            spark.emit(`${POST_TYPE}.${pack.request_type}`, pack);
            break;
    }
});

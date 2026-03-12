const { msgbuilder, packbuilder } = spark;
const parseCQString  = require('../../handles/parserCQString').parse;
const lg = require('../../handles/logger')
const logger = lg.getLogger();
// const JSON5 = require('json5');

// function text(str) {
//     if (typeof str == 'string') return msgbuilder.text(str);
//     else return str;
// }

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

const fhelper = require('../../handles/file');
// const _config = new fhelper.FileObj('base');
// const _raw_file = _config.getFile("config.json");
// const _p_raw = JSON5.parse(_raw_file);
// const _isArray = _p_raw.onebot_mode_v11;
//console.log(_isArray)
spark.on('gocq.pack', (pack) => {
   // if (spark.debug)
        //  console.log(pack);
    //let evt_name = `${pack.post_type}${pack.message_type == undefined ? '' :'.'+ pack.message_type}`;

    // if (pack.echo != undefined) {
    //     // if (spark.debug) console.log(pack);
    //     spark.emit("packid_" + pack.echo, pack.data);
    //     // return  // <-- 要不要return呢，不return也没什么，但是怕出啥问题。。。
    // }
    const POST_TYPE = pack.post_type;
    switch (POST_TYPE) {
        case 'meta_event':
            spark.emit(`${POST_TYPE}.${pack.meta_event_type}`, pack);
            break;
        case 'message':
            //console.log("in");
            // if (!_isArray) {
            //     //console.log("in",typeof pack.message);
            //     let _pmessage = parseCQString(pack.message.toString());
            //     pack.message = _pmessage;
            //     //console.log(_pmessage);
            // }
            if (pack.raw_message.includes('&#91;') || pack.raw_message.includes('&#93;') || pack.raw_message.includes('&#44;') || pack.raw_message.includes('&amp;')) {
                pack.raw_message = pack.raw_message.replaceAll('&#91;', '[')
                    .replaceAll('&#93;', ']')
                    .replaceAll('&#44;', ',')
                    .replaceAll('&amp;', '&');
                // 采用最烂的替换方式，希望能有高效率的方法，欢迎PR
            }

            // if (pack.raw_message.includes('&#91;') || pack.raw_message.includes('&#93;') || pack.raw_message.includes('&#44;') || pack.raw_message.includes('&amp;')) {
            //     pack.raw_message = decodeURIComponent(pack.raw_message.replace(/&#(\d+);/g, function (match, p1) {
            //         return String.fromCharCode(p1);
            //     }));
            // }


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

spark.on('gocq.pack', (pack) => {
    // console.log(pack);
    // spark.emit(`packid_${pack.echo}`, pack.data);
});
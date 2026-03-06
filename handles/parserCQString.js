// handles/parserCQString.js

class CQParser {
    /**
     * 将包含老式 CQ 码的纯字符串解析为 OneBot v11 标准对象数组
     * 示例: "你好[CQ:at,qq=123]吃饭了吗" -> 
     * [ {type:'text', data:{text:'你好'}}, {type:'at', data:{qq:'123'}}, {type:'text', data:{text:'吃饭了吗'}} ]
     */
    static parse(str) {
        if (!str) return [];
        const result = [];

        // 匹配 [CQ:类型,参数=值,参数=值] 这种格式
        const regex = /\[CQ:([^,\]]+)(?:,([^\]]+))?\]/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(str)) !== null) {
            // 提取 CQ 码前面的纯文本
            if (match.index > lastIndex) {
                result.push({
                    type: 'text',
                    data: { text: str.substring(lastIndex, match.index) }
                });
            }

            const type = match[1];
            const dataStr = match[2];
            const dataObj = {};

            // 解析参数部分
            if (dataStr) {
                dataStr.split(',').forEach(pair => {
                    const [key, val] = pair.split('=');
                    if (key && val) {
                        // CQ 码里的逗号等符号是被转义过的，需要反转义（可选，视具体端而定）
                        dataObj[key] = val.replace(/&#44;/g, ',').replace(/&amp;/g, '&').replace(/&#91;/g, '[').replace(/&#93;/g, ']');
                    }
                });
            }

            result.push({ type, data: dataObj });
            lastIndex = regex.lastIndex;
        }

        // 提取末尾剩余的纯文本
        if (lastIndex < str.length) {
            result.push({
                type: 'text',
                data: { text: str.substring(lastIndex) }
            });
        }

        return result;
    }

    /**
     * 将 OneBot v11 的对象数组序列化回纯字符串格式 (带 CQ 码)
     * 适用于一些只支持字符串操作的老插件
     */
    static stringify(segments) {
        if (!Array.isArray(segments)) return segments;

        return segments.map(seg => {
            if (seg.type === 'text') {
                // 文本内的特殊字符需要转义
                return (seg.data.text || '').replace(/&/g, '&amp;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
            } else {
                let cqStr = `[CQ:${seg.type}`;
                for (let key in seg.data) {
                    const val = String(seg.data[key]).replace(/&/g, '&amp;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/,/g, '&#44;');
                    cqStr += `,${key}=${val}`;
                }
                cqStr += ']';
                return cqStr;
            }
        }).join('');
    }
}

module.exports = CQParser;
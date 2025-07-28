// 源自您提供的 parserCQString.js，稍作整理
function parseSingleCode(codeStr) {
    const data = { type: "", data: {} };
    const parts = codeStr.slice(1, -1).split(',');
    const typePart = parts.shift(); // 取出第一部分 CQ:type

    if (typePart.startsWith('CQ:')) {
        data.type = typePart.substring(3);
    }

    for (const part of parts) {
        const i = part.indexOf('=');
        if (i > -1) {
            data.data[part.substring(0, i)] = part.substring(i + 1);
        }
    }
    return data;
}

function parseCqCode(str) {
    const segments = [];
    let textBuffer = '';

    for (let i = 0; i < str.length; i++) {
        if (str[i] === '[' && str.substring(i, i + 4) === '[CQ:') {
            if (textBuffer) {
                segments.push({ type: 'text', data: { text: textBuffer } });
                textBuffer = '';
            }
            const endIndex = str.indexOf(']', i);
            if (endIndex !== -1) {
                const cqCode = str.substring(i, endIndex + 1);
                segments.push(parseSingleCode(cqCode));
                i = endIndex;
            } else {
                textBuffer += str[i];
            }
        } else {
            textBuffer += str[i];
        }
    }

    if (textBuffer) {
        segments.push({ type: 'text', data: { text: textBuffer } });
    }
    return segments;
}

module.exports = { parseCqCode };
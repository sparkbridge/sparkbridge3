const fs = require('fs');

/**
 * 創建一個 v12 標準的文本消息段。
 * @param {string} text - 文字內容。
 * @returns {{type: 'text', data: {text: string}}}
 */
function text(text) {
    return { type: 'text', data: { text: String(text) } };
}

/**
 * 創建一個 v12 標準的 @某人 (提及) 消息段。
 * @param {string | number} user_id - 要提及的用戶 ID。
 * @returns {{type: 'mention', data: {user_id: string}}}
 */
function mention(user_id) {
    return { type: 'mention', data: { user_id: String(user_id) } };
}

/**
 * 創建一個 v12 標準的 @全體成員 消息段。
 * @returns {{type: 'mention_all', data: {}}}
 */
function mentionAll() {
    return { type: 'mention_all', data: {} };
}

/**
 * 創建一個 v12 標準的圖片消息段。
 * @param {string | Buffer} file - 圖片的本地路徑、URL 或 Buffer。
 * @returns {{type: 'image', data: {file_id: string}}}
 */
function image(file) {
    let fileData = file;
    // 如果傳入的是一個存在的檔案路徑，則讀取為 Buffer
    if (typeof file === 'string' && fs.existsSync(file)) {
        fileData = `base64://${fs.readFileSync(file).toString('base64')}`;
    }
    // 如果傳入的是 Buffer，則轉換為 base64 字串
    else if (file instanceof Buffer) {
        fileData = `base64://${file.toString('base64')}`;
    }
    // v12 的 key 是 file_id
    return { type: 'image', data: { file_id: fileData } };
}

/**
 * 創建一個 v12 標準的語音消息段。
 * @param {string | Buffer} file - 語音的本地路徑、URL 或 Buffer。
 * @returns {{type: 'voice', data: {file_id: string}}}
 */
function voice(file) {
    let fileData = file;
    if (typeof file === 'string' && fs.existsSync(file)) {
        fileData = `base64://${fs.readFileSync(file).toString('base64')}`;
    } else if (file instanceof Buffer) {
        fileData = `base64://${file.toString('base64')}`;
    }
    return { type: 'voice', data: { file_id: fileData } };
}

/**
 * 創建一個 v12 標準的影片消息段。
 * @param {string | Buffer} file - 影片的本地路徑、URL 或 Buffer。
 * @returns {{type: 'video', data: {file_id: string}}}
 */
function video(file) {
    let fileData = file;
    if (typeof file === 'string' && fs.existsSync(file)) {
        fileData = `base64://${fs.readFileSync(file).toString('base64')}`;
    } else if (file instanceof Buffer) {
        fileData = `base64://${file.toString('base64')}`;
    }
    return { type: 'video', data: { file_id: fileData } };
}

/**
 * 創建一個 v12 標準的回覆消息段。
 * @param {string | number} message_id - 要回覆的消息的 ID。
 * @returns {{type: 'reply', data: {message_id: string}}}
 */
function reply(message_id) {
    return { type: 'reply', data: { message_id: String(message_id) } };
}

/**
 * 創建一個 v12 標準的 QQ 表情消息段。
 * @param {string | number} id - 表情的 ID。
 * @returns {{type: 'face', data: {id: string}}}
 */
function face(id) {
    return { type: 'face', data: { id: String(id) } };
}

/**
 * 格式化消息，確保其為符合 v12 標準的消息段陣列格式。
 * @param {string | object | Array<string|object>} message - 原始消息。
 * @returns {Array<object>} - 標準的消息段陣列。
 */
function format(message) {
    if (!Array.isArray(message)) {
        message = [message];
    }
    return message.map(seg => (typeof seg === 'string' ? text(seg) : seg));
}

module.exports = {
    text,
    mention,
    mentionAll,
    image,
    voice,
    video,
    reply,
    face,
    format
};
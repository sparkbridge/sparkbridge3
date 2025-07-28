const fs = require('fs');
// 假設 fhelper 是一個包含文件操作輔助函數的模塊
// const fhelper = require('./file'); 

/**
 * 用於構造合併轉發消息的類別。
 * 合併轉發消息由多個「節點 (node)」組成。
 */
class ForwardMsgBuilder {
    /**
     * @property {Array<object>} msg - 存儲所有消息節點的陣列。
     */
    msg = [];

    /**
     * 通過消息 ID 添加一個轉發節點。
     * 這會直接引用一條已存在的聊天記錄。
     * @param {string | number} id - 要引用的消息的 ID。
     */
    addMsgById(id) {
        this.msg.push({
            type: 'node',
            data: {
                id: String(id) // 確保 ID 是字串
            }
        });
    }

    /**
     * 添加一個自訂的轉發節點。
     * 這允許你模擬某人發送一條特定的消息。
     * @param {string} name - 自訂的發送者昵稱。
     * @param {string | number} uin - 自訂的發送者 QQ 號。
     * @param {string | Array<object>} content - 自訂的消息內容，可以是純文字或消息段陣列。
     */
    addCustomsMsg(name, uin, content) {
        this.msg.push({
            type: 'node',
            data: {
                name,
                uin: String(uin),
                content
            }
        });
    }

    /**
     * 獲取最終構造完成的合併轉發消息節點陣列。
     * @returns {Array<object>} - 可用於發送的消息節點陣列。
     */
    getMsg() {
        return this.msg;
    }
}

/**
 * 一個靜態工具類，用於快速創建符合 OneBot v11 標準的各種消息段 (Message Segment)。
 */
class Builder {
    /**
     * 創建一個圖片消息段。
     * @param {string | Buffer} file - 圖片的檔案路徑 (string)、URL (string) 或 Buffer 物件。
     * @returns {object} - 圖片消息段物件。
     */
    static img(file) {
        // 如果傳入的是一個存在的檔案路徑，則讀取為 Buffer
        if (typeof file === 'string' && fs.existsSync(file)) {
            file = fs.readFileSync(file);
        }
        // 如果傳入的是 Buffer，則轉換為 base64 字串
        if (file instanceof Buffer) {
            file = `base64://${file.toString('base64')}`;
        }
        // subType: 0 通常表示普通圖片
        return { type: 'image', data: { file: file, subType: 0 } };
    }

    /**
     * 創建一個 @ 某人的消息段。
     * @param {string | number} qid - 要 @ 的人的 QQ 號。
     * @returns {object} - at 消息段物件。
     */
    static at(qid) {
        return { type: "at", data: { "qq": String(qid) } };
    }

    /**
     * 創建一個 QQ 表情消息段。
     * @param {string | number} id - QQ 表情的 ID。
     * @returns {object} - face 消息段物件。
     */
    static face(id) {
        return { type: 'face', data: { id: String(id) } };
    }

    /**
     * 創建一個純文字消息段。
     * @param {string} raw - 文字內容。
     * @returns {object} - text 消息段物件。
     */
    static text(raw) {
        return { type: 'text', data: { text: raw } };
    }

    /**
     * 創建一個戳一戳消息段。
     * @param {string | number} id - 要戳的人的 QQ 號。
     * @returns {object} - poke 消息段物件。
     */
    static poke(id) {
        return { type: 'poke', data: { qq: String(id) } };
    }

    /**
     * 創建一個影片消息段。
     * @param {string} file - 影片的檔案路徑或 URL。
     * @returns {object} - video 消息段物件。
     */
    static video(file) {
        return { type: 'video', data: { file: String(file) } };
    }

    /**
     * 創建一個語音消息段。
     * @param {string} file - 語音的檔案路徑或 URL。
     * @returns {object} - record 消息段物件。
     */
    static record(file) {
        return { type: "record", data: { file: String(file) } };
    }

    /**
     * 創建一個回覆消息段。
     * @param {string | number} id - 要回覆的消息的 ID。
     * @returns {object} - reply 消息段物件。
     */
    static reply(id) {
        return { type: 'reply', data: { id: String(id) } };
    }

    /**
     * 格式化消息，確保其為標準的消息段陣列格式。
     * 如果傳入的是字串，會自動包裝成 text 消息段。
     * @param {string | object | Array<string|object>} msg - 原始消息，可以是字串、單個消息段或混合陣列。
     * @returns {Array<object>} - 標準的消息段陣列。
     */
    static format(msg) {
        // 如果不是陣列，先轉化為單元素陣列
        if (!Array.isArray(msg)) {
            msg = [msg];
        }
        // 遍歷陣列，將所有 string 類型的元素轉換為 text 消息段
        for (let index in msg) {
            if (typeof msg[index] === 'string') {
                msg[index] = Builder.text(msg[index]);
            }
        }
        return msg;
    }

    /**
     * 獲取一個新的 ForwardMsgBuilder 實例。
     * 這是一個工廠方法，方便鏈式調用。
     * @returns {ForwardMsgBuilder} - 一個新的 ForwardMsgBuilder 實例。
     */
    static ForwardMsgBuilder() {
        return new ForwardMsgBuilder();
    }
}


module.exports = Builder;
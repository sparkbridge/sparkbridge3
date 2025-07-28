/**
 * 建立成功的 API 回應物件
 * @param {any} data - 回應的資料
 * @param {string} message - 回應的訊息
 * @returns {{code: 0, data: any, message: string}}
 */
const createSuccessResponse = (data, message = '請求成功') => ({
    code: 0,
    data,
    message
});

/**
 * 建立失敗的 API 回應物件
 * @param {string} message - 失敗的訊息
 * @param {number} code - 錯誤碼
 * @param {any} data - 附加的資料
 * @returns {{code: number, data: any, message: string}}
 */
const createErrorResponse = (message = '請求失敗', code = -1, data = null) => ({
    code,
    data,
    message
});

module.exports = {
    createSuccessResponse,
    createErrorResponse,
};
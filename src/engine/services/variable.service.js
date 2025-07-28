const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/rules.json');

async function loadDataFromFile() {
    try {
        const content = await fs.readFile(DB_PATH, 'utf-8');
        const data = JSON.parse(content);
        return {
            rules: data.rules || [],
            variables: data.variables || [],
        };
    } catch (error) {
        console.error("加载规则文件失败，将使用空配置启动。", error);
        return { rules: [], variables: [] };
    }
}

async function saveDataToFile(data) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("保存规则文件失败。", error);
    }
}

module.exports = { loadDataFromFile, saveDataToFile };
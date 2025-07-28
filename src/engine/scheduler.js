const cron = require('node-cron');
const { getModuleLogger } = require('../services/logger');
const logger = getModuleLogger('RuleEngine-Scheduler');
function initializeScheduler(rules, engine) {
    const scheduledTasks = rules.filter(r => r.eventType === 'scheduled_task');
    const jobs = []; // 創建一個陣列來存放任務
    logger.info(`初始化 ${scheduledTasks.length} 个定时任务...`);

    for (const task of scheduledTasks) {
        if (cron.validate(task.schedule)) {
            const job = cron.schedule(task.schedule, () => { // 將任務實例賦值給 job
                logger.log(`执行定时任务: ${task.name}`);
                engine.emit('scheduled_task', { rule: task });
            });
            jobs.push(job); // 將任務添加到陣列
        } else {
            logger.error(`无效的 Cron 表达式: ${task.schedule} for rule ${task.name}`);
        }
    }
    return jobs; // 【重要】返回任務實例陣列
}
module.exports = { initializeScheduler };
const { EventEmitter } = require('events');
const { evaluateConditions } = require('./evaluators/condition.evaluator');
const { executeActions } = require('./services/action.service');
const { loadDataFromFile, saveDataToFile } = require('./services/variable.service');
const { initializeScheduler } = require('./scheduler');
const { v4: uuidv4 } = require('uuid');
const {getModuleLogger} = require('../services/logger');

class RulesEngine extends EventEmitter {
    constructor() {
        super();
        this.rulesByEvent = new Map();
        this.variables = new Map();
        this.chatAdapter = null;
        this.logger = getModuleLogger('RulesEngine');
    }

    async initialize(chatAdapter) {
        this.chatAdapter = chatAdapter;
        if (!this.chatAdapter) {
            throw new Error("ChatAdapter is required for engine initialization.");
        }

        const { rules, variables } = await loadDataFromFile();
        this.variables = new Map(variables.map(v => [v.key, v.value]));

        for (const rule of rules) {
            if (!this.rulesByEvent.has(rule.eventType)) {
                this.rulesByEvent.set(rule.eventType, []);
            }
            this.rulesByEvent.get(rule.eventType).push(rule);
        }

        for (const eventType of this.rulesByEvent.keys()) {
            this.on(eventType, (eventData) => this.handleEvent(eventType, eventData));
        }

        initializeScheduler(rules, this);

        this.logger.info('规则引擎已启动');
    }

    async reload() {
        this.logger.info('正在熱加載規則引擎...');
        await this._loadAndConfigure();
        this.logger.info('規則引擎已成功熱加載');
    }

    async handleEvent(eventType, eventData) {
        // 對於定時任務，其 eventData 是 { rule: task }
        // 我們需要將其轉換為標準的遍歷模式
        const rulesToProcess = eventType === 'scheduled_task'
            ? [eventData.rule]
            : (this.rulesByEvent.get(eventType) || []);

        for (const rule of rulesToProcess) {
            const context = {
                event: eventData,
                variables: new Map(this.variables),
                isStateDirty: false
            };

            const conditionsMet = evaluateConditions(rule.conditions, context);

            if (conditionsMet) {
                await executeActions(rule.actions, context, this.chatAdapter);

                if (context.isStateDirty) {
                    this.variables = new Map(context.variables);
                    const allData = {
                        rules: [...this.rulesByEvent.values()].flat(),
                        variables: Array.from(this.variables.entries()).map(([key, value]) => ({ id: uuidv4(), key, value })),
                    };
                    await saveDataToFile(allData);
                    this.logger.info("变量状态已更新并保存。");
                }
            }
        }
    }
}

module.exports = RulesEngine;
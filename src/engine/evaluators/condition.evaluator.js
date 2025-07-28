function getFactValue(type, context) {
    switch (type) {
        case 'message_content': return context.event.message;
        case 'user_id': return String(context.event.userId);
        case 'group_id': return String(context.event.groupId);
        default: return null;
    }
}

function getComparisonValue(condition, context) {
    if (condition.operator === 'equals_variable') {
        return context.variables.get(condition.value);
    }
    return condition.value;
}

function evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) {
        return true; // 沒有條件，預設為真
    }
    for (const condition of conditions) {
        const fact = getFactValue(condition.type, context);
        const value = getComparisonValue(condition, context);

        let result = false;
        switch (condition.operator) {
            case 'equals': result = (fact === value); break;
            case 'contains': result = (fact && fact.includes(value)); break;
            case 'matches_regex': result = (fact && new RegExp(value).test(fact)); break;
            case 'equals_variable': result = (fact === value); break;
            default: result = false;
        }
        if (!result) {
            return false; // AND 邏輯，一假則全假
        }
    }
    return true; // 所有條件都滿足
}

module.exports = { evaluateConditions };
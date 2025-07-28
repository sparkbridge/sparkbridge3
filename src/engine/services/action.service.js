async function executeActions(actions, context, chatAdapter) {
    for (const action of actions) {
        try {
            switch (action.type) {
                case 'reply_text':
                    await chatAdapter.sendMessage({
                        type: context.event.type, // 'private' or 'group'
                        targetId: context.event.type === 'private' ? context.event.userId : context.event.groupId,
                        content: action.value
                    });
                    break;

                case 'send_group_message': // 針對定時任務等無源消息的動作
                    await chatAdapter.sendMessage({
                        type: 'group',
                        targetId: action.targetGroupId,
                        content: action.value
                    });
                    break;

                case 'mute_user':
                    const durationMinutes = parseInt(action.value, 10);
                    if (context.event.type === 'group' && !isNaN(durationMinutes)) {
                        await chatAdapter.muteGroupMember(context.event.groupId, context.event.userId, durationMinutes * 60);
                    }
                    break;

                case 'set_variable':
                    if (action.variableName) {
                        context.variables.set(action.variableName, action.value);
                        context.isStateDirty = true; // 標記變數狀態已變更
                    }
                    break;
            }
        } catch (error) {
            console.error(`执行动作失败: ${action.type}`, error);
        }
    }
}

module.exports = { executeActions };
const releaseData = [
    {
        version: "v3.2.0",
        isLatest: true,
        date: "2026-03-09",
        coreVersion: "2.1.0",
        webVersion: "3.2.0",
        summary: "本次更新重构了底层规则引擎，显著提升了大规模并发下的数据转发性能，并优化了插件获取 Token 的交互方式。",
        changes: [
            { type: 'feature', text: '新增对 <code>iframe</code> 插件通过 <code>postMessage</code> 获取全局 Token 的支持。' },
            { type: 'perf', text: '将路由匹配正则引擎切换至 WebAssembly 版本，性能提升 40%。' },
            { type: 'breaking', text: '废弃了旧版的基于 URL Params 传递敏感 Token 的行为，详见下方 API 变更。' },
            { type: 'fix', text: '修复了暗黑模式下标签颜色对比度不足导致看不清的问题。' }
        ],
        apiDiff: [
            { type: 'normal', code: '  // 插件端 Token 获取方式变更' },
            { type: 'remove', code: '  const token = new URLSearchParams(window.location.search).get("token");' },
            { type: 'add', code: '  window.parent.postMessage({ action: "GET_SB3_TOKEN" }, "*");' },
            { type: 'add', code: '  window.addEventListener("message", (e) => { ... });' }
        ]
    },
    {
        version: "v3.1.5",
        isLatest: false,
        date: "2026-02-28",
        coreVersion: "2.0.8",
        webVersion: "3.1.5",
        summary: "常规问题修复与 UI 细节打磨。",
        changes: [
            { type: 'feature', text: '为未匹配到内置类型的插件标签提供了一套优雅的白色兜底样式。' },
            { type: 'fix', text: '修复主面板容器 <code>flex</code> 布局未撑满导致滚动条异常的问题。' }
        ],
        apiDiff: [] // 没有 API 变更就不传或传空数组，UI会自动隐藏该模块
    }
]
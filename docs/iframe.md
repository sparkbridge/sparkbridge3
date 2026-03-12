针对 **SparkBridge3** 这个特定的控制台系统，开发一个完美的嵌入式网页（插件视图）需要遵守一套特定的“内部规范”。

因为我们之前已经为 SparkBridge3 奠定了非常明确的设计语言和鉴权体系，所以你要开发的插件页面（无论是用原生 HTML、Vue 还是 React 写）只需要对齐以下 **四个核心标准**，就能实现“原生级”的无缝融合 [cite: 2025-12-15]。

---

### 一、 视觉与 UI 规范（SparkBridge3 Design System）

为了让 iframe 看起来不像外来的，必须复刻 SparkBridge3 的 CSS 基因：

1. **色彩变量对齐**：
在插件页的 `:root` 中，强制使用以下核心色卡：
* 主题蓝：`#3b82f6` (悬浮加深 `#2563eb`)
* 页面底色：`#ffffff` 或 `#f8fafc` (建议用纯白与 iframe 容器融为一体)
* 边框色：`#e2e8f0`
* 文本主色：`#1e293b`，辅助色：`#94a3b8`


2. **圆角与阴影（拟态玻璃风）**：
SparkBridge3 的核心卡片使用了大圆角和极淡的阴影。插件内的主要卡片必须遵循：
* `border-radius: 24px;` (大卡片) 或 `12px` (按钮/输入框)
* `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);`


3. **字体家族**：
普通文本使用系统无衬线字体（`-apple-system, sans-serif`），涉及代码、正则、版本号、数字的地方，必须使用等宽字体 `'Fira Code', monospace` 以保持极客感。
4. **边距清零**：
`body` 必须设置 `margin: 0; padding: 32px; box-sizing: border-box;`。

### 二、 鉴权与 API 规范（Token 穿透）

SparkBridge3 的主应用使用 `sb3_token` 进行鉴权，并且我们刚刚封装了极其严格的 Axios 拦截器。插件页面如果需要独立请求后端，必须解决鉴权问题。

1. **获取 Token**：
插件页面不能直接读取主应用的 `localStorage`（如果是跨域 iframe 会被浏览器拦截）。
* **标准做法**：插件页面加载后，通过 `window.parent.postMessage` 向主应用索要 Token；


2. **统一的 403 处理**：
如果插件页面自己发起的 API 请求返回了 `403` 或 `401`，它不应该自己跳回登录页，而是应该通知主应用：“我的 Token 失效了，请把我踢出去”。

### 三、 跨层级通信规范（与主界面的联动）

为了让体验完整，插件页面需要通过 `postMessage` 与 SparkBridge3 的主页面 (`CustomPageView.vue`) 建立一套约定好的消息通道：

1. **调用全局提示框 (Toast)**：
插件内如果保存配置成功，不应该用原生的 `alert()`，而是向主应用发消息，让主应用调用右下角的 `showNotice('保存成功', 'success')`。
* *插件端发送*：`window.parent.postMessage({ action: 'showNotice', msg: '保存成功', type: 'success' }, '*');`


2. **动态调整高度**：
如果插件内容动态变多，最好通知主应用拉长 iframe，避免在 iframe 内部出现局部的滚动条，保持主应用页面级别的全局滚动。

### 四、 路由与历史记录规范

1. **SPA 路由隔离**：
如果你的插件本身也是个 Vue/React 单页应用，请务必将其路由模式设置为 **Memory Router（内存路由）** 或 **Hash Router**。
* **绝对禁止使用 History 模式**，否则插件内的路由变化会污染 SparkBridge3 的浏览器历史栈，导致用户点击浏览器“返回”键时行为错乱。


2. **白屏兜底**：
插件页面必须自己处理数据加载时的骨架屏或 Loading 状态。

---

**总结来说：**
做 SparkBridge3 的插件网页，就是**“穿它的衣服（UI），用它的钱包（Token），有事向它汇报（postMessage）”**。

开发 SparkBridge3 的嵌入式网页（通过 `iframe` 引入的插件页），**必须是一个完整、独立的标准 HTML 文件** [cite: 2025-12-15]。

因为 `iframe` 本质上是在当前页面中开辟了一个全新的浏览器窗口，所以它不能只是一段 `<div>` 片段，而是需要包含完整的 HTML 骨架。

为了让其他开发者（或者你自己）在编写新插件时有据可依，我为你整理了**《SparkBridge3 插件页面开发规范》**的具体代码要求：

### 1. 基础文档结构（必须包含完整的 HTML 标签）

插件页面必须是一个标准的 HTML5 文档。必须包含 `<!DOCTYPE html>`、`<html>`、`<head>` 和 `<body>`。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>你的插件名称</title>
    
    <style>
        /* 样式写在这里或引入外部 CSS */
    </style>
</head>
<body>
    </body>
</html>

```

### 2. CSS 强制重置与透明化（核心外观要求）

为了让 iframe 完全融入主系统，你必须在插件的 CSS 中写死以下基础样式：

```css
/* 1. 全局盒子模型，防止 padding 撑破容器 */
* {
    box-sizing: border-box;
}

/* 2. 重置 body，消除白边和白底 */
body {
    margin: 0;
    padding: 24px; /* 建议保留适当内边距，不要贴边 */
    background-color: transparent; /* 【关键】必须透明，透出主系统的背景 */
    
    /* 3. 强制继承主系统的字体，不要用宋体或默认的衬线体 */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b; /* 默认主文本色 */
}

/* 4. 滚动条美化（如果插件内部需要滚动） */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

```

### 3. a 标签与超链接规范（防止“画中画”套娃）

如果你的插件页面里有超链接（比如指向 Github 仓库、外部文档等），**必须加上 `target="_blank"**`。

* **错误写法**：`<a href="https://github.com">查看源码</a>` （这会导致 Github 的网页在你的小 iframe 框里加载，极其难看且很多网站防嵌套会报错）。
* **正确写法**：`<a href="https://github.com" target="_blank">查看源码</a>` （在新标签页完整打开）。

### 4. 路由规范（针对使用 Vue/React/纯单页构建的插件）

如果你嫌写原生 HTML 太累，决定用 Vite + Vue 重新起一个微型项目来打包这个插件：

* **绝对禁止** 使用 `History` 模式的路由（如 Vue Router 的 `createWebHistory`）。
* **必须使用** `Hash` 模式（`createWebHashHistory`）或 `Memory` 模式。
* **原因**：History 模式会修改主浏览器地址栏的真实 URL 栈，导致用户在主系统点击浏览器的“后退”按钮时，主系统没反应，只有 iframe 里面的页面在后退。

### 5. 与主系统的通信接口规范 (JavaScript API)

插件页面内部**不能**使用原生的 `alert()`、`confirm()` 或 `prompt()`，因为它们会阻塞 iframe，并且 UI 风格极其违和。

你必须使用 `postMessage` 呼叫主系统（SparkBridge3）来代办。建议你在插件的 `<script>` 中封装如下工具函数：

```javascript
// 插件调用主系统的 Toast 提示框
function showNotice(msg, type = 'info') {
    // 检查是否在 iframe 中运行
    if (window !== window.top) {
        window.parent.postMessage({
            action: 'SHOW_NOTICE', // 约定的事件名
            payload: { msg: msg, type: type } // type 可选: 'success', 'error', 'warning', 'info'
        }, '*');
    } else {
        // 如果是单独在浏览器打开这个 HTML 调试，降级使用 alert
        alert(`[${type}] ${msg}`);
    }
}

// 使用示例：
document.getElementById('saveBtn').addEventListener('click', () => {
    // ... 保存逻辑 ...
    showNotice('配置保存成功！', 'success');
});

```

*(注意：主系统的 `CustomPageView.vue` 中也需要补充对应的 `window.addEventListener('message', ...)` 来接收这个信号并调用你自己的 Notice 组件。)*

### 总结 Checklist（给插件开发者的备忘录）：

1. [x] 是一个完整的 `.html` 文件，包含 `<!DOCTYPE>`。
2. [x] `body` 的 `margin` 为 `0`，`background` 为 `transparent`。
3. [x] 所有外部链接 `<a href="...">` 都加了 `target="_blank"`。
4. [x] 没有任何原生的 `alert()` 弹窗。
5. [x] 字体使用了无衬线字体（Sans-serif）。
6. [x] （若是单页应用）使用了 Hash 路由而非 History 路由。

只要满足这 6 条硬性要求，任何语言、任何框架打包出来的静态网页，都能完美无瑕地嵌入到你的 SparkBridge3 控制台中！
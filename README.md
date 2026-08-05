[English Version](README_en.md)

# zhyx1996.github.io

基于 GitHub Pages 的个人主页，展示个人简介、公开仓库、Star 项目、博客文章，以及部分公开信息嵌入示例。

由 AI 辅助设计与构建。

## 页面结构

| 文件 | 说明 |
|------|------|
| `index.html` | 主页，含个人方向、近期关注、文章摘要、Steam 游戏、石蒜模拟器 |
| `projects.html` | 公开仓库展示 |
| `stars.html` | GitHub Stars 展示 |
| `articles.html` | 博客园文章展示 |
| `app.js` | 数据渲染与交互逻辑（API 集成、动画、拖拽） |
| `styles.css` | 全站样式（含响应式断点） |
| `public/pretext-effect.js` | 浮动小球动画引擎 |

## 技术特性

- 原生 HTML / CSS / JavaScript，无构建工具
- Sakana Widget（石蒜模拟器）集成，支持鼠标/触摸拖拽
- 浮动小球弹跳动画，边界约束与拖拽
- GitHub API 集成（仓库、Stars、个人信息）
- Steam 游戏库展示
- 博客园文章聚合
- 响应式布局（桌面 / 平板 / 移动端）

## 本地预览

```bash
python -m http.server 8000
```

访问 `http://localhost:8000`。建议通过本地静态服务器访问，避免资源路径与网络请求行为不一致。

## 校验

```bash
node --check app.js
```

## Sakana 调试诊断模式

石蒜模拟器（Sakana）拖拽行为异常时，可用内置的诊断模式抓取结构化事件日志，无需改动代码。默认关闭，关闭时不产生任何日志，不影响物理行为。

开启（二选一）：

- URL 参数：访问 `http://localhost:8000/?sakana-debug=1`
- localStorage：控制台执行 `localStorage.setItem('sakana-debug', '1')` 后刷新页面（URL 参数存在时优先于 localStorage，`?sakana-debug=0` 可强制关闭）

开启后浏览器控制台会以 `[Sakana]` 前缀输出 `console.debug` 日志（pointerdown / pointermove 节流采样 / setPointerCapture / 收尾原因 / 释放解析前后速度 / 角色初始状态 / 碰撞 / 动画停止等），同时写入 `window.__sakanaDebug.events` 环形缓冲（最多 500 条，自动覆盖最旧）。

读取日志：

```js
window.__sakanaDebug.getEvents()   // 全部事件（按时间排序的副本，可 JSON 序列化）
window.__sakanaDebug.clear()       // 清空缓冲
window.__sakanaDebug.getState()    // 当前组件 rect/className、sakana._running 与 _state
window.__sakanaDebug.enabled       // 当前是否开启（也可运行时置 true/false 动态开关）
```

关闭：`localStorage.removeItem('sakana-debug')` 并移除 URL 参数后刷新。

## 部署

提交到 `main` 分支后由 GitHub Pages 自动发布。

## 维护

- 新增页面时沿用现有导航与视觉风格
- 修改 `app.js` 中的数据获取逻辑时保留兜底数据与异常处理
- 外部入口更新时同步检查对应页面中的按钮链接与文案

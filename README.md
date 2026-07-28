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

## 部署

提交到 `main` 分支后由 GitHub Pages 自动发布。

## 维护

- 新增页面时沿用现有导航与视觉风格
- 修改 `app.js` 中的数据获取逻辑时保留兜底数据与异常处理
- 外部入口更新时同步检查对应页面中的按钮链接与文案

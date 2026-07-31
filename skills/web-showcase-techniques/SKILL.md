---
name: web-showcase-techniques
description: >
  个人网站展示技术合集：Pretext 文字绕球动画、Sakana 石蒜模拟器物理拖拽、CORS 代理与 API 集成模式。
  当用户需要实现以下功能时使用此 skill：文字绕圆形障碍物动态排版、弹性物理动画、Canvas 字体校准、
  SakanaWidget 集成与自定义拖拽物理、CORS 代理调用外部 API、fetch 超时与错误降级处理、
  个人网站动态数据展示（汇率、加密货币、Steam 资料）。
  关键词：文字绕球、Sakana、石蒜模拟器、物理弹跳、CORS proxy、fetch timeout、
  canvas text measurement、spring physics、damped oscillation、个人网站动画。
---

# Web Showcase Techniques

个人网站中使用的三类前端技术：Pretext 文字动画、Sakana 物理模拟器、API 集成。

## 快速导航

| 组件 | 技术要点 | 参考文档 |
|------|---------|---------|
| Pretext 文字绕球 | 圆-矩形碰撞检测、区间切割、贪心排版、Canvas 字体校准 | [references/pretext-animation.md](references/pretext-animation.md) |
| Sakana 石蒜模拟器 | 弹簧-阻尼物理、自定义拖拽、lerp 平滑、触摸事件 | [references/sakana-widget.md](references/sakana-widget.md) |
| API 集成 | CORS 代理、fetch 超时、优雅降级、HTML 抓取 | [references/api-patterns.md](references/api-patterns.md) |

## 技术栈概览

- **零依赖**：所有动画和交互纯 vanilla JS，无框架
- **CDN 加载**：外部库（SakanaWidget）通过 jsDelivr CDN 异步加载
- **渐进增强**：API 失败时显示降级 UI，不阻塞页面渲染
- **性能优化**：GPU 合成（`translate3d`）、条件重排（1px 阈值）、delta-time 物理

## 核心设计原则

1. **物理模拟用 delta-time**：`deltaSeconds = (now - lastTime) / 1000`，保证帧率无关
2. **碰撞后位置修正**：反弹时不仅反转速度，还要 clamp 位置防止穿透
3. **状态平滑过渡**：用 lerp（`current += (target - current) * factor`）防抖
4. **错误边界**：每个 API 调用独立 try/catch，返回 null 而非 throw
5. **XSS 防护**：所有动态数据 innerHTML 插入前必须 escapeHtml

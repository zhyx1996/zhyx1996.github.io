# 经验教训（本站开发踩坑记录）

> 记录 zhyx1996.github.io 维护过程中遇到的坑与对策。
> 持续更新，供后续 AI 协作直接复用。

## 1. Playwright 自动化：卡住的根因与对策

**症状**：`playwright-cli open <url>` 经常长时间无输出，最终被工具超时判定"卡死"。

**根因**（读了 `@playwright/cli@0.1.8` 源码 `program.js`/`session.js` 确认）：
`open <url>` 内部 = 启动浏览器 daemon → **再执行一次 `goto <url>` 并等待页面
`load` 事件完成** → 才打印结果退出。而本站首页挂了多个外链（enka.network 的
原神 iframe、GitHub API、corsproxy、Steam、CoinGecko、黄金/汇率 API），
**在大陆网络下这些请求很慢或被墙**，`load` 迟迟不触发 → `goto` 长时间阻塞。

实测：
| 场景 | 耗时 |
|---|---|
| `open`（不带 URL，about:blank） | ~0.9s |
| `goto` about:blank / 静态子页 | ~0.2s |
| `goto` 首页（外链慢） | 7–10s |
| `goto` 首页 + route 屏蔽外链 | ~0.95s |

**对策**：
1. `open` **不带 URL**（秒开），再单独 `goto`，避免 open 内部那次等待页面加载。
2. 对国内慢/被墙的外链加 `playwright-cli route "https://enka.network/**" --status=404`
   拦截，首页 1s 内加载完。
3. 所有 playwright 命令都显式加 bash `timeout` 参数。
4. 不要用 `| Select-Object -First N` 截断 playwright 输出（大输出写满管道会阻塞）。

## 2. 视觉子代理（gpt-5.6-luna）国内不可用，走代理

**症状**：`vision` 子代理调用报 `403 This model is not available in your region`，
返回空结果。

**根因**：视觉模型走 `opencode-go/gpt-5.6-luna`（托管于 opencode.ai），大陆 IP 被拒。

**对策**：
- 本机 `localhost:18808` 是可用 HTTP 代理（`HTTPS_PROXY/HTTP_PROXY=http://localhost:18808` 已持久化）。
- 重启 opencode 后会话内子代理即可用；或在命令行用 `opencode run --model opencode-go/gpt-5.6-luna` 配合代理跑视觉验收。

## 3. 视觉模型判距不可靠，几何验收为准

视觉模型对 11px 级小字（pretext 圆球与文字间隙）的判断有 ±5px 噪声，
多次给出互相矛盾、甚至"球两侧都有空隙"与"球两侧都贴住"的相反结论。
**精确验收一律用 DOM 几何**：逐行量文字边缘到球边缘的实际像素差，
或对比左右侧平均间隙（应近似相等）。

## 4. page-agent 浮窗定位：bottom 锚定 + 几何复核

- 之前用 `top` 锚定 + 按收起高度定位，面板展开时向下生长压到 Sakana。
- 改**底边锚定**（`bottom` 固定、`top:auto`），展开时向上生长，再配
  `max-height` 兜底，永不出屏、不与下方组件重叠。
- 视觉模型说"与返回顶部按钮重叠"，DOM 几何复核实际间隔 34px，无重叠——
  再次印证第 3 条：以几何为准。

## 5. pretext 文字绕球：三约束不可兼得

「左对齐贴边」「字距恒定」「球左右间隙完全一致」三者无法同时完美满足。
最终按 editorial-engine demo 的方案：**行左对齐 + 球固定留白 `ORB_H_PAD=8 / ORB_V_PAD=4`**，
字距恒定、拖拽稳定，两侧最小间隙相同。详见同目录
`pretext-animation.md` 的「设计取舍与经验」。

## 6. 多进程并行提交同一仓库

期间检测到另一个进程也在提交该仓库（如文章同步、版本号统一等）。
**提交/推送前先 `git log` 与 `git status` 核对**，避免冲突或把别人的改动一起带上；
版本号统一到全站一致再提交。

## 7. git push 到 GitHub 也要走代理

大陆直连 `git push origin main` 会报
`schannel: failed to receive handshake, SSL/TLS connection failed`。
走本机代理即可：

```bash
git -c http.proxy=http://localhost:18808 -c https.proxy=http://localhost:18808 push origin main
```

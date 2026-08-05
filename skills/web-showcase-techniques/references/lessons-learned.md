# 经验教训（本站开发踩坑记录）

> 记录 zhyx1996.github.io 维护过程中遇到的坑与对策。
> 持续更新，供后续 AI 协作直接复用。

## 0. 访问外链一律走代理（127.0.0.1:18808）

大陆网络访问 GitHub、Google、opencode.ai 等外网经常失败/超时。
**凡是要访问外链资源（API、网页、git push、模型等），统一走本机代理：**

```bash
# 通用环境变量（PowerShell 当前会话）
$env:HTTPS_PROXY="http://127.0.0.1:18808"
$env:HTTP_PROXY="http://127.0.0.1:18808"
$env:NO_PROXY="localhost,127.0.0.1,172.30.194.57"

# git push
git -c http.proxy=http://127.0.0.1:18808 -c https.proxy=http://127.0.0.1:18808 push origin main

# 通用请求（PowerShell）
Invoke-WebRequest -Uri "<url>" -Proxy "http://127.0.0.1:18808"

# opencode 视觉子代理（opencode run）
$env:HTTPS_PROXY="http://127.0.0.1:18808"; opencode run --model opencode-go/gpt-5.6-luna "..."
```

注意：`HTTP_PROXY/HTTPS_PROXY` 已持久化到用户环境变量，重启 opencode 后
会话内的视觉子代理即可直接用代理；本机/内网（localhost、172.30.194.57）走 `NO_PROXY` 豁免。

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
走代理即可（见第 0 节），例如：

```bash
git -c http.proxy=http://localhost:18808 -c https.proxy=http://localhost:18808 push origin main
```

## 8. 改文件编码：绝不直接用 Set-Content（会毁掉中文）

用 `powershell.exe`（Windows PowerShell 5.1）执行 `Set-Content` 时，默认编码是
ANSI/GBK，会把 UTF-8 的中文整文件批量损坏成 `�?`，且损坏字节会破坏 HTML
标签解析（曾导致 nethack 两个 iframe 面板在浏览器里被错误嵌套、游戏区塌陷）。
**教训**：
- 改文件优先用编辑工具（保留编码）。
- 必须脚本批量改时，用 `[System.IO.File]::ReadAllText/WriteAllText` 并显式
  指定 `UTF8Encoding($false)`（无 BOM），不要用 `Get-Content/Set-Content`。
- 改完用 `git diff --stat` 核对：若中文文件出现超大 diff（整文件行级变动），
  几乎必然是编码损坏，用 `git checkout HEAD -- <file>` 恢复后重做。

## 9. page-agent 定位的坑（面板出屏 + 遮罩被压扁）

page-agent 注入的是运行时元素，有几处易踩的坑：
- **`[id*="page-agent" i]` 选择器会命中辅助元素**：`#page-agent-runtime_simulator-mask`
  的 id 含 "page-agent"，把全屏遮罩也套上 `position:fixed; left:24px; width:340px`
  会被压成左下角小块。定位规则必须加 `:not([id*="simulator" i]):not([class*="mask" i])`
  排除，且 JS 定位（`place()`）也要跳过 `simulator/mask`。
- **库在任务开始再次 show() 时会写回 `translateX(-50%)`**（假设 left:50% 居中），
  与本站 `left:24px` 叠加 → 面板左移半宽出屏。用 CSS `transform: translateY(0) !important`
  钉住即可（代价是收起动画没了，位置正确）。
- **千万别给面板设 `overflow: auto` 或 `max-height`**：库的面板 `--height` 恒为
  40px，输入栏与历史区是用绝对定位放在 `top/bottom: var(--height)` 处、靠 wrapper
  默认 `overflow:visible` **溢出显示**的。设了 `overflow:auto` 会把输入栏裁掉
  （表现为"输入栏显示不全"）。滚动交给历史区自身的 `max-height + overflow-y:auto`。
- **测试要本地化脚本**：page-agent 从 jsdelivr 加载，大陆测试环境拉不到 → 面板
  不注入、无法验收。临时把 `page-agent.demo.js` 下载到 `public/` 并在 index.html
  指到本地，验完再还原（别提交测试文件）。
- 验收以 DOM 几何 + 视觉子代理为准：任务触发后检查 panel 的 `left`/`transform`
  和 mask 是否全屏。

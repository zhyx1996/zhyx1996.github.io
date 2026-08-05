# Sakana 石蒜模拟器 — 自定义物理拖拽

基于 sakana-widget 库，替换其内置拖拽为自定义物理系统，实现墙弹跳 + 人偶物理摇晃。

## 架构概览

```
HTML 页面
  └── <div id="sakana-drag-widget"></div>
        │
        ├── SakanaWidget (CDN v2.7.1)
        │     ├── Canvas 渲染 + 角色图片
        │     ├── 内置弹簧物理 (_run)
        │     └── 暴露 _state / _draw / _running
        │
        └── initSakanaDrag() — 自定义物理
              ├── 拖拽追踪（mouse + touch）
              ├── 速度历史（5 帧加权平均）
              ├── 人偶倾斜（vx → rotation）
              ├── 墙弹跳（75% 能量保持）
              └── 释放时交回弹簧物理
```

## 初始化

### HTML（所有页面统一）

```html
<div id="sakana-drag-widget"></div>
<script>
  function initSakanaWidget() {
    window.sakanaInstance = new SakanaWidget({
      size: 120,
      character: 'chisato',
      draggable: false  // 禁用内置拖拽
    }).mount('#sakana-drag-widget');
  }
</script>
<script async onload="initSakanaWidget()"
  src="https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.js"></script>
```

### 等待库就绪

```javascript
const checkSakana = setInterval(() => {
  const w = document.getElementById('sakana-drag-widget');
  if (w && w.querySelector('canvas')) {
    clearInterval(checkSakana);
    initSakanaDrag();
  }
}, 200);
setTimeout(() => clearInterval(checkSakana), 10000);
```

## 自定义拖拽物理

### 状态变量

```javascript
let isDragging = false;
let vx = 0, vy = 0;           // 当前帧速度（px/frame）
let lastX, lastY, lastTime;    // 上次指针位置
let animId = null;             // requestAnimationFrame ID
let vxHistory = [], vyHistory = []; // 最近 5 帧位移
let leftPos = 0, topPos = 0;   // 控件当前位置
let initialized = false;
```

### 统一指针抽象（Mouse + Touch）

```javascript
const getXY = (e) => {
  if (e.touches && e.touches[0])
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0])
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
};
```

### 释放时速度计算（加权平均）

```javascript
if (vxHistory.length > 0) {
  let totalWeight = 0, weightedVx = 0, weightedVy = 0;
  for (let i = 0; i < vxHistory.length; i++) {
    const weight = i + 1;  // 越新权重越高
    weightedVx += vxHistory[i] * weight;
    weightedVy += vyHistory[i] * weight;
    totalWeight += weight;
  }
  vx = weightedVx / totalWeight;
  vy = weightedVy / totalWeight;
}
// 限制最大速度
const maxV = 25;
vx = Math.max(-maxV, Math.min(maxV, vx));
vy = Math.max(-maxV, Math.min(maxV, vy));
```

## 人偶摇晃机制

### 拖拽时 — 倾斜（直接控制）

```javascript
let currentR = 0;
const applyCharLean = () => {
  const sakana = window.sakanaInstance;
  if (!sakana) return;
  sakana._running = false;  // 暂停库物理
  const targetR = Math.max(-20, Math.min(20, vx * 0.4));
  currentR += (targetR - currentR) * 0.3;  // lerp 平滑
  sakana._state.r = currentR;
  sakana._draw();
};
```

### 释放时 — 弹簧振荡（交还物理引擎）

```javascript
const sakana = window.sakanaInstance;
if (sakana) {
  sakana._lastRunUnix = Date.now();
  sakana._state.r = Math.max(-30, Math.min(30, vx * 0.5));  // 初始角度
  sakana._state.y = Math.max(-15, Math.min(15, vy * 0.3));  // 初始高度
  sakana._state.w = 0;   // 角速度归零
  sakana._state.t = 0;   // 垂直速度归零
  sakana._running = true;
  sakana._run();  // 启动弹簧物理
}
```

**关键设计**：释放时不设置角速度，只设置初始位移。弹簧物理会自然将人偶拉回中心，形成阻尼振荡。

## 墙弹跳

```javascript
const bounce = () => {
  vx *= 0.96;  // 摩擦：每帧损失 4%
  vy *= 0.96;

  let nextLeft = leftPos + vx;
  let nextTop = topPos + vy;

  if (nextLeft <= 0) {
    nextLeft = 0;
    vx = Math.abs(vx) * 0.75;  // 向右反弹
  }
  if (nextLeft >= viewportW - widgetW) {
    nextLeft = viewportW - widgetW;
    vx = -Math.abs(vx) * 0.75;  // 向左反弹
  }
  // Y 轴同理...

  setPos(nextLeft, nextTop);

  // 停止条件
  if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) {
    sakana._state.r = 0;  // 人偶回正
    sakana._state.y = 0;
    sakana._draw();
    currentR = 0;
    return;
  }
  animId = requestAnimationFrame(bounce);
};
```

## 库内部物理（弹簧-阻尼系统）

```javascript
// SakanaWidget._run() 简化
_run = () => {
  let { r, y, t, w } = this._state;     // 角度/高度/垂直速度/角速度
  const { d, i } = this._state;          // 阻尼/惯性

  w = w - 2*r - rotate;                  // 弹簧：角度越大回复力越大
  r += w * i * 1.2;                      * 角度 += 角速度 × 惯性
  this._state.w = w * d;                 // 角速度 × 阻尼衰减

  t = t - 2*y;                           // 垂直弹簧
  y += t * i * 2;
  this._state.t = t * d;

  // 速度低于阈值则停止
  if (Math.max(Math.abs(w), Math.abs(r), Math.abs(t), Math.abs(y)) < threshold)
    this._running = false;
  else
    requestAnimationFrame(this._run);
};
```

## 关键参数

| 参数 | 值 | 说明 |
|------|---|------|
| 摩擦系数 | 0.96 | 每帧速度衰减 4% |
| 反弹能量 | 0.75 | 撞墙后保留 75% 速度 |
| 最大速度 | 25 px/frame | 释放时速度上限 |
| 停止阈值 | 0.3 px/frame | 低于此速度停止动画 |
| 倾斜系数 | 0.4 | vx → 角度映射 |
| 倾斜限幅 | ±20° | 拖拽时最大倾斜 |
| 释放初始角度 | vx × 0.5, ±30° | 释放时初始偏移 |
| lerp 因子 | 0.3 | 倾斜平滑过渡 |

## CSS 要点

```css
#sakana-drag-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 130px;
  height: 150px;
  z-index: 9999;
  cursor: grab;
  touch-action: none;    /* 禁止浏览器默认触摸行为 */
  user-select: none;
}
```

## 事件绑定

```javascript
widget.addEventListener('mousedown', onPointerDown);
widget.addEventListener('touchstart', onPointerDown, { passive: false });
document.addEventListener('mousemove', onPointerMove);  // document 上监听，防止拖出控件丢失
document.addEventListener('touchmove', onPointerMove, { passive: false });
document.addEventListener('mouseup', onPointerUp);
document.addEventListener('touchend', onPointerUp);
```

**注意**：move/up 必须绑定到 `document` 而非 `widget`，否则鼠标移出控件后事件丢失。`passive: false` 允许 `preventDefault()` 阻止页面滚动。

## 当前实现复盘：窗口外快速释放

上面的代码片段是早期方案示例，当前网站的实际实现以 `app.js` 为准：使用 Pointer Events、`setPointerCapture()` 和时间戳采样。参数和事件生命周期已经经过一次窗口外快速释放问题的实测修正。

### 1. 拖拽生命周期必须幂等收尾

快速拖动到浏览器窗口外后，浏览器不保证一定先产生组件上的 `pointerup`。可能到达的事件包括：

- `pointerup`
- `pointercancel`
- `lostpointercapture`
- `window` 级 `pointerup` / `pointercancel`
- `window.blur`
- `document.visibilitychange`（页面隐藏）

这些事件必须统一进入一个 `finishDrag()`，并由 `isDragging` 守卫保证只执行一次。收尾顺序应保持稳定：

1. 先结束拖拽状态并移除 `dragging` 样式。
2. 尝试释放 pointer capture；capture 可能已经被浏览器隐式释放，因此要捕获异常。
3. 将当前位置重新 clamp 到当前视口。
4. 计算释放速度、设置角色初始弹簧状态，再启动平移回弹。

不要仅依赖 `mouseleave`：它不能可靠表示指针流已经结束，也不能覆盖触摸、触控笔和窗口失焦。

### 2. 速度采样要有最后有效值兜底

释放速度使用最近时间窗口内的 `{ x, y, t }` 样本计算，并统一换算为 60fps 基准的 px/frame。快速拖出窗口时，可能只有 `pointerdown` 一个样本，或者最后的 `pointermove` 没有机会参与窗口速度计算。

因此释放链应遵循：

```text
样本数 >= 2  -> 最近时间窗口首尾速度
样本数 < 2   -> pointermove 阶段保存的最后有效 vx/vy
两者都无效   -> 0，再由低速释放逻辑补一个轻微姿态
```

最终速度必须经过 `maxVelocity` 限制。fallback 不能覆盖有效的窗口样本，否则会让正常释放速度失真。

### 3. 平移回弹和角色摇摆必须分离

这是本次问题的核心。拖到边缘时，为了避免组件整屏飞行，会对朝向墙壁的法向平移速度做吸收；但这个吸收只应该作用于组件的 `left/top` 平移速度：

```text
真实甩动速度 charVx/charVy -> 角色初始 r/y
边缘吸收后的 vx/vy         -> 组件整体回弹
```

如果直接用吸收后的速度设置角色角度，贴边快速释放时初始角度会接近零，看起来像没有摇摆。当前实现通过 `applyEdgeAbsorb()` 同时返回两套速度：平移速度保守回弹，角色速度保留真实方向并受角度上限限制。

释放给 Sakana 内部弹簧时只设置初始位移，不额外注入角速度：

```javascript
state.r = clamp(charVx * charLeanFactor, -charLeanMax, charLeanMax);
state.y = clamp(charVy * charSwayFactor, -charSwayMax, charSwayMax);
state.w = 0;
state.t = 0;
state.i = swingTimeStep;
state.d = swingDamping;
sakana._lastRunUnix = Date.now();
sakana._running = true;
sakana._run();
```

这样组件先产生轻微的空间回弹，角色则从明确的初始角度进入阻尼弹簧摇摆。低速释放不能把 `r/y/w/t` 全部清零；如果当前姿态也接近零，应补一个很小的初始姿态，避免 `_run()` 立即满足停止条件。

### 4. 边界处理要同时修正位置和速度

每次拖动、释放、窗口缩放和动画帧都要按当前 `innerWidth/innerHeight` 与组件尺寸重新计算边界。碰撞处理不能只反转速度：

```javascript
nextLeft = Math.max(0, Math.min(maxLeft, nextLeft));
```

位置先被钳回边界，再根据碰撞前速度方向反弹。否则在高刷新率、窗口缩小或一次位移跨过边界时，组件可能穿透墙面或在墙边反复抖动。`requestAnimationFrame` 中应使用真实 `dt` 对摩擦和位移做归一化。

### 5. 初始化与视觉验收也有时序要求

Sakana 通过 CDN 异步加载，不能用固定等待时间判断页面已经可测。验收脚本至少应同时确认：

- `document.readyState === 'complete'`
- `#sakana-drag-widget canvas` 存在
- `window.sakanaInstance` 存在
- 自定义拖拽已初始化

截图和交互测试应选择 URL 精确匹配项目页面的 CDP target，并固定桌面视口（本项目验收使用 `1280x900`）。点击测试要命中实际人偶图像，而不是组件外层的空白区域，否则会把测试工具的时序或命中点问题误判成拖拽实现问题。

### 6. 验证清单

每次修改 Sakana 后至少检查：

- 从人偶图像快速拖向四个边缘，组件不越界。
- 在视口外释放，组件不消失、不跳回、不持续跟随，`dragging` 最终为 `false`。
- 释放后组件有轻微平移回弹，角色有可见且方向正确的初始角度。
- 触发 `pointercancel`、`lostpointercapture`、窗口失焦和页面隐藏后，状态只收尾一次。
- 在 60Hz、120Hz、144Hz 物理模拟下，轨迹和碰撞结果大致一致。
- 执行 `npm run check` 与 `git diff --check`，再用真实视口截图复核页面。

本次问题的纯函数覆盖位于 `scripts/sakana-physics-check.js` 的“释放链（fallback 与角色初始状态）”测试段，包含单采样 fallback、边缘速度分离、初始角度方向和多事件幂等收尾。

### 7. reasonix 协作经验

reasonix 的任务可能在已经完成文件修改和测试后，继续停留在内部总结或工具收尾阶段。外层终端等待超时会表现为退出码 `124`，这表示等待包装器超时，不等同于代码修改失败。

正确做法是先检查工作树和 diff，再独立运行测试和浏览器验收；确认落盘结果后再决定是否延长等待或重新调用。代理输出不能替代本地测试、真实视口截图和实际指针交互验收。

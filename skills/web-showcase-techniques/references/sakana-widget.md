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

# Pretext 文字绕球动画

动态文字排版系统：文字实时绕开移动的圆形障碍物（orbs）流动。

## 核心算法

### 1. 圆-矩形碰撞检测（Circle-Rect Collision）

判断圆形障碍物是否与文字行（水平条带）相交，计算被遮挡的水平区间。

```javascript
function circleIntervalForBand(orb, bandTop, bandBottom) {
  // 垂直方向不相交
  if (bandTop >= orb.y + orb.r || bandBottom <= orb.y - orb.r) return null;

  // 计算 orb 中心到条带的最小垂直距离
  const minDy = orb.y >= bandTop && orb.y <= bandBottom
    ? 0
    : orb.y < bandTop ? bandTop - orb.y : orb.y - bandBottom;

  if (minDy >= orb.r) return null;

  // 勾股定理：半弦长 = sqrt(r² - dy²)
  const halfWidth = Math.sqrt(orb.r * orb.r - minDy * minDy);

  return {
    left: orb.x - halfWidth - ORB_TEXT_GAP,
    right: orb.x + halfWidth + ORB_TEXT_GAP,
  };
}
```

### 2. 区间切割（Interval Carving）

从完整行宽中减去所有被遮挡区间，得到可用文字槽位。

```javascript
function carveTextLineSlots(base, blocked) {
  let slots = [base];
  for (const interval of blocked.sort((a, b) => a.left - b.left)) {
    const next = [];
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (interval.left > slot.left)
        next.push({ left: slot.left, right: interval.left });
      if (interval.right < slot.right)
        next.push({ left: interval.right, right: slot.right });
    }
    slots = next;
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT_WIDTH);
}
```

### 3. Canvas 字体校准

Canvas `measureText()` 与 DOM 渲染宽度不同，需要校准系数。

```javascript
function prepareRenderedText() {
  const probe = document.createElement('probe-span');
  probe.textContent = '测W0.';
  document.body.appendChild(probe);
  const renderedWidth = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);

  const canvasWidth = context.measureText('测W0.').width;
  const widthScale = renderedWidth / canvasWidth;

  graphemeWidths = graphemes.map(g => (
    Math.max(1, context.measureText(g).width * widthScale + letterSpacing)
  ));
}
```

### 4. 贪心字形打包

逐字形（grapheme）填充槽位，非按词换行。

```javascript
while (graphemeIndex < graphemes.length) {
  const nextWidth = graphemeWidths[graphemeIndex];
  if (textWidth + nextWidth > slotWidth) break;
  textWidth += nextWidth;
  graphemeIndex++;
}
```

### 5. 条件重排（性能优化）

只在 orb 移动超过 1px 时才触发昂贵的 DOM 重排。

```javascript
function orbNeedsTextSync() {
  return orbs.some((orb, i) => (
    Math.abs(orb.x - lastOrbPositions[i].x) >= 1 ||
    Math.abs(orb.y - lastOrbPositions[i].y) >= 1
  ));
}
```

## 物理模拟

- **速度驱动**：`orb.x += orb.vx * deltaSeconds`
- **墙碰撞**：速度反转 + 位置 clamp
- **delta 上限**：`Math.min(delta, 0.05)` 防止切后台后大幅跳跃
- **GPU 合成**：`transform: translate3d(x, y, 0)`

## 字形分割

```javascript
function splitGraphemes(text) {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)]
      .map(item => item.segment);
  }
  return Array.from(text); // fallback
}
```

## 拖拽交互

```javascript
function hitTest(p) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 < o.r * o.r) return o;
  }
  return null;
}
```

点击时从后往前检测（后渲染的在上层），命中后设置 `orb.dragging = true`。

## 关键常量

| 常量 | 值 | 用途 |
|------|---|------|
| `ORB_TEXT_GAP` | 1px | 文字与 orb 间距 |
| `MIN_SLOT_WIDTH` | 32px | 最小可用槽宽 |
| `TEXT_SYNC_THRESHOLD` | 1px | 触发重排的最小位移 |
| orb 半径 | `min(W,H) * 0.08` | 响应式大小 |
| orb 速度 | 12-18 px/s | 缓慢漂浮 |

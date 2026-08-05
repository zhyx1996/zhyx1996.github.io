# Pretext 文字绕球动画

动态文字排版系统：文字实时绕开移动的圆形障碍物（orbs）流动。参考实现：
<https://somnai-dreams.github.io/pretext-demos/the-editorial-engine.html>。

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

### 3. DOM 逐字形精确测量（替代 Canvas）

Canvas `measureText()` 与 DOM 渲染在字体回退（尤其 CJK）上存在系统性偏差，
直接用它做两端对齐会导致文字压到圆球。改为**一次性**用隐藏探针逐一测量
每个不同字形的真实 DOM 宽度并缓存；布局阶段 0 次 DOM 读取。

```javascript
const glyphWidthCache = new Map();

function measureGlyphWidths(glyphs) {
  const probe = document.createElement('span');
  probe.className = 'pretext-line';
  probe.style.visibility = 'hidden';
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.letterSpacing = '0'; // 测纯字形宽度，字距单独核算
  container.appendChild(probe);
  for (const glyph of glyphs) {
    probe.textContent = glyph;
    const width = probe.getBoundingClientRect().width;
    if (width > 0) glyphWidthCache.set(glyph, width);
  }
  probe.remove();
}

// 字形宽 = 纯字形宽 + 基础字距（CSS letter-spacing）
graphemeWidths = graphemes.map(g => Math.max(1, (glyphWidthCache.get(g) || 0) + baseLetterSpacing));
```

缓存按字体（`font` 字符串）为键，仅在字体变化时重建；resize 直接复用。

### 4. 贪心字形打包

逐字形（grapheme）填充槽位，非按词换行。每个槽位最多留一个字形的空隙。

```javascript
while (graphemeIndex < graphemes.length) {
  const nextWidth = graphemeWidths[graphemeIndex];
  if (textWidth + nextWidth > slotWidth) break;
  textWidth += nextWidth;
  graphemeIndex++;
}
```

### 5. 行左对齐 + 球固定留白（参照 demo）

参照 the-editorial-engine demo 的做法：行统一左对齐、左缘贴列边，字距恒定，
位置不随球移动额外调整（拖拽时文字稳定）。球两侧的间隙由固定的
`ORB_H_PAD` 兜底——右侧文字从「球右缘 + ORB_H_PAD」开始，左侧文字最迟
在「球左缘 − ORB_H_PAD」换行，两侧最小间隙相同、观感对称；贪心打包留下
的多余空隙（最多一字宽）是左对齐换行的自然结果。

```javascript
lines.push({
  left: slot.left,           // 恒为列起始边
  top: y,
  text: graphemes.slice(start, graphemeIndex).join(''),
});
```

圆球碰撞区额外加入垂直留白 `ORB_V_PAD`，避免行贴近球的上下边缘：

```javascript
function circleIntervalForBand(orb, bandTop, bandBottom) {
  const top = bandTop - ORB_V_PAD;
  const bottom = bandBottom + ORB_V_PAD;
  if (top >= orb.y + orb.r || bottom <= orb.y - orb.r) return null;
  const minDy = orb.y >= top && orb.y <= bottom
    ? 0
    : orb.y < top ? top - orb.y : orb.y - bottom;
  if (minDy >= orb.r) return null;
  const halfWidth = Math.sqrt(orb.r * orb.r - minDy * minDy);
  return {
    left: orb.x - halfWidth - ORB_H_PAD,
    right: orb.x + halfWidth + ORB_H_PAD,
  };
}
```

### 6. 条件重排（性能优化）

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
| `ORB_H_PAD` | 8px | 球与文字固定横向留白（左右相同，参照 demo 思路） |
| `ORB_V_PAD` | 4px | 球与文字纵向留白（避免行贴住球上下缘） |
| `MIN_SLOT_WIDTH_BASE` | 2.2（×字号） | 最小可用槽宽（相对字号） |
| `TEXT_SYNC_THRESHOLD` | 1px | 触发重排的最小位移 |
| `TEXT_PADDING` | 16px | 文字列左右留白 |
| `glyphWidthCache` | 按字体缓存的字形宽 | 精确测量，避免 Canvas 偏差 |
| `baseLetterSpacing` | CSS 基础字距 | 恒定，不随球伸缩 |
| orb 半径 | `min(W,H) * 0.08` | 响应式大小 |
| orb 速度 | 12-18 px/s | 缓慢漂浮 |

import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from './layout.js';

// ─── 配置 ────────────────────────────────────────────────────────
const TEXT = `聚焦计算机视觉、自动驾驶感知、并行计算与公开写作。围绕车道线检测、CUDA 并行加速、点云处理等方向持续实践，把实验结果沉淀为可复用的工程经验。`;
const FONT = '16px "Inter", "Noto Sans SC", system-ui, sans-serif';
const LINE_HEIGHT = 28;
const COLUMN_GAP = 40;
const FONT_COLOR = 'rgba(255, 255, 255, 0.92)';
const ACCENT = 'rgba(100, 220, 255, 0.85)';
const ACCENT_SOFT = 'rgba(100, 220, 255, 0.12)';

// ─── Canvas ─────────────────────────────────────────────────────
const canvas = document.getElementById('pretext-canvas');
const ctx = canvas.getContext('2d');
let dpr = window.devicePixelRatio || 1;
let W, H;

// ─── 缓存 prepared（只计算一次）────────────────────────────────
let prepared = null;
function getPrepared() {
    if (!prepared) prepared = prepareWithSegments(TEXT, FONT);
    return prepared;
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── 可拖拽障碍物 ───────────────────────────────────────────────
let orbs = [];
function initOrbs() {
  const r = Math.min(W, H) * 0.09;
  orbs = [
    { x: W * 0.35, y: H * 0.3, r, color: 'rgba(255, 120, 180, 0.85)', dragging: false, vx: 0, vy: 0 },
    { x: W * 0.65, y: H * 0.65, r: r * 1.3, color: 'rgba(100, 220, 255, 0.85)', dragging: false, vx: 0, vy: 0 },
    { x: W * 0.8, y: H * 0.25, r: r * 0.7, color: 'rgba(200, 160, 255, 0.85)', dragging: false, vx: 0, vy: 0 },
  ];
}

// ─── 文字布局 ───────────────────────────────────────────────────
function colWidth(startX, endX) {
  // 计算该列中所有障碍物占用的空间
  let left = startX;
  let right = endX;
  for (const orb of orbs) {
    if (orb.x - orb.r > startX && orb.x + orb.r < endX) {
      // 障碍物完全在列内：文字需要避让
    }
  }
  return endX - startX;
}

function flowText() {
  const prepared = getPrepared();
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  const padding = 30;
  const colW = (W - padding * 2 - COLUMN_GAP) / 2;
  const colLeft = [
    { start: padding, end: padding + colW },
    { start: padding + colW + COLUMN_GAP, end: W - padding },
  ];

  ctx.font = FONT;
  ctx.fillStyle = FONT_COLOR;
  ctx.textBaseline = 'top';

  for (let colIdx = 0; colIdx < 2; colIdx++) {
    const col = colLeft[colIdx];
    let y = LINE_HEIGHT * 1.5;
    const colBottom = H - 20;

    while (y < colBottom) {
      if (cursor.segmentIndex >= prepared.segments.length) break;

      const lineCY = y + LINE_HEIGHT / 2;

      // 收集当前行所有圆球遮挡区间
      const blocks = [];
      for (const orb of orbs) {
        const dy = lineCY - orb.y;
        if (Math.abs(dy) < orb.r) {
          const half = Math.sqrt(Math.max(0, orb.r * orb.r - dy * dy));
          const left = Math.max(col.start, orb.x - half);
          const right = Math.min(col.end, orb.x + half);
          if (left < right) blocks.push({ left, right });
        }
      }

      // 合并重叠区间
      blocks.sort((a, b) => a.left - b.left);
      const merged = [];
      for (const b of blocks) {
        if (merged.length > 0 && b.left <= merged[merged.length - 1].right) {
          merged[merged.length - 1].right = Math.max(merged[merged.length - 1].right, b.right);
        } else {
          merged.push({ ...b });
        }
      }

      // 构建可用区间列表（圆球之间的空隙）
      const segments = [];
      let segStart = col.start;
      for (const block of merged) {
        if (block.left > segStart) segments.push({ x: segStart, w: block.left - segStart });
        segStart = Math.max(segStart, block.right);
      }
      if (segStart < col.end) segments.push({ x: segStart, w: col.end - segStart });

      // 填充所有可用区间（环绕效果）
      let anyText = false;
      for (const seg of segments) {
        if (seg.w < 40) continue;
        if (cursor.segmentIndex >= prepared.segments.length) break;

        const range = layoutNextLineRange(prepared, cursor, seg.w - 4);
        if (range === null) break;
        const line = materializeLineRange(prepared, range);
        ctx.fillText(line.text, seg.x, y);
        cursor = range.end;
        anyText = true;
      }

      if (!anyText && merged.length > 0) {
        // 整行被遮挡，跳过
      }

      y += LINE_HEIGHT;
    }
  }
}

// ─── 渲染 ───────────────────────────────────────────────────────
function drawOrbs() {
  for (const orb of orbs) {
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT_SOFT;
    ctx.fill();
    ctx.strokeStyle = orb.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 圆心小点
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
  }
}

let needsRedraw = true;

function draw() {
  if (!needsRedraw) return;
  needsRedraw = false;
  ctx.clearRect(0, 0, W, H);
  drawOrbs();
  flowText();
}

function requestDraw() { needsRedraw = true; requestAnimationFrame(draw); }

// ─── 拖拽交互 ───────────────────────────────────────────────────
let dragOrb = null;

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: cx - r.left, y: cy - r.top };
}

function hitTest(p) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 < o.r * o.r) return o;
  }
  return null;
}

canvas.addEventListener('mousedown', e => {
  const p = getPos(e);
  dragOrb = hitTest(p);
  if (dragOrb) {
    dragOrb.dragging = true;
    canvas.style.cursor = 'grabbing';
    requestDraw();
  }
});

canvas.addEventListener('mousemove', e => {
  if (!dragOrb) {
    const p = getPos(e);
    canvas.style.cursor = hitTest(p) ? 'grab' : 'default';
    return;
  }
  const p = getPos(e);
  dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
  dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
  requestDraw();
});

canvas.addEventListener('mouseup', () => {
  if (dragOrb) { dragOrb.dragging = false; dragOrb = null; }
  canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave', () => {
  if (dragOrb) { dragOrb.dragging = false; dragOrb = null; }
  canvas.style.cursor = 'default';
});

// 触摸
canvas.addEventListener('touchstart', e => {
  const p = getPos(e);
  dragOrb = hitTest(p);
  if (dragOrb) { dragOrb.dragging = true; requestDraw(); }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (!dragOrb) return;
  e.preventDefault();
  const p = getPos(e);
  dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
  dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
  requestDraw();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  if (dragOrb) { dragOrb.dragging = false; dragOrb = null; }
});

// ─── 初始化 ──────────────────────────────────────────────────────
let initialized = false;
let resizeFramePending = false;

function init() {
  if (initialized) return;
  initialized = true;
  resize();
  initOrbs();
  canvas.style.cursor = "grab";
  requestDraw();
}

function requestResize() {
  if (resizeFramePending) return;
  resizeFramePending = true;
  requestAnimationFrame(() => {
    resizeFramePending = false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    initOrbs();
    requestDraw();
  });
}

window.addEventListener('resize', requestResize);
window.addEventListener('load', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') init();
// 兜底：如果 load 事件未触发（如外部资源阻塞），500ms 后强制执行
setTimeout(init, 500);



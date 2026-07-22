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
  prepared = getPrepared();
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  const padding = 30;
  const cols = 2;
  const colW = (W - padding * 2 - COLUMN_GAP) / cols;
  const positions = [
    { x: padding, availStart: padding, availEnd: padding + colW },
    { x: padding + colW + COLUMN_GAP, availStart: padding + colW + COLUMN_GAP, availEnd: W - padding },
  ];

  let y = LINE_HEIGHT * 1.5;
  let colIdx = 0;
  const colBottoms = [H - 20, H - 20];

  ctx.font = FONT;
  ctx.fillStyle = FONT_COLOR;
  ctx.textBaseline = 'top';

  while (cursor.segmentIndex < prepared.segments.length) {
    const pos = positions[colIdx];
    const yBottom = colBottoms[colIdx];
    if (y >= yBottom) {
      colIdx++;
      if (colIdx >= cols) break;
      y = LINE_HEIGHT * 1.5;
      continue;
    }

    // 计算当前行可用宽度（避让障碍物）
    let lineW = pos.availEnd - pos.availStart;
    const lineCY = y + LINE_HEIGHT / 2;

    for (const orb of orbs) {
      const dy = lineCY - orb.y;
      if (Math.abs(dy) < orb.r) {
        const half = Math.sqrt(Math.max(0, orb.r * orb.r - dy * dy));
        const orbLeft = orb.x - half;
        const orbRight = orb.x + half;

        // 障碍物与本行重叠
        if (orbLeft > pos.availStart && orbRight < pos.availEnd) {
          // 选择较宽的一侧
          const leftW = orbLeft - pos.availStart;
          const rightW = pos.availEnd - orbRight;
          if (leftW >= rightW && leftW > 80) {
            lineW = leftW - 8;
          } else if (rightW > 80) {
            lineW = rightW - 8;
            // 保持起点不变，文字只占右侧
          }
        } else if (orbLeft <= pos.availStart && orbRight > pos.availStart && orbRight < pos.availEnd) {
          // 障碍物遮挡左侧
          const newStart = orbRight + 8;
          if (pos.availEnd - newStart > 80) {
            lineW = pos.availEnd - newStart;
          }
        } else if (orbRight >= pos.availEnd && orbLeft > pos.availStart && orbLeft < pos.availEnd) {
          // 障碍物遮挡右侧
          lineW = orbLeft - pos.availStart - 8;
        } else if (orbLeft <= pos.availStart && orbRight >= pos.availEnd) {
          // 整行覆盖，跳过
          lineW = 0;
        }
      }
    }

    if (lineW > 60) {
      const range = layoutNextLineRange(prepared, cursor, lineW);
      if (range === null) break;
      const line = materializeLineRange(prepared, range);
      ctx.fillText(line.text, pos.availStart, y);
      cursor = range.end;
    }

    y += LINE_HEIGHT;
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

// ─── 自动浮动动画（空闲时圆球缓慢飘动）──────────────────────────
let lastInteraction = Date.now();
canvas.addEventListener('mousedown', () => lastInteraction = Date.now());
canvas.addEventListener('touchstart', () => lastInteraction = Date.now());

function autoFloat() {
  const idle = Date.now() - lastInteraction;
  if (idle > 3000) {
    // 3秒无交互后开始缓慢浮动
    orbs.forEach((orb, i) => {
      if (orb.dragging) return;
      const t = Date.now() * 0.0003 + i * 2.1;
      orb.x += Math.sin(t + i) * 0.3;
      orb.y += Math.cos(t * 0.7 + i) * 0.3;
      orb.x = Math.max(orb.r, Math.min(W - orb.r, orb.x));
      orb.y = Math.max(orb.r, Math.min(H - orb.r, orb.y));
    });
    requestDraw();
  }
  setTimeout(autoFloat, 33); // ~30fps idle
}
autoFloat();

// ─── 初始化 ──────────────────────────────────────────────────────
function init() { resize(); initOrbs(); canvas.style.cursor = "grab"; requestDraw(); }

window.addEventListener('resize', () => { resize(); initOrbs(); requestDraw(); });
window.addEventListener('load', init);
// 如果 DOM 已就绪则立即执行
if (document.readyState === 'interactive' || document.readyState === 'complete') init();



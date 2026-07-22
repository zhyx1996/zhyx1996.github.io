import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '/public/layout.js';

// ─── 配置 ────────────────────────────────────────────────────────
const TEXT = `聚焦计算机视觉、自动驾驶感知、并行计算与公开写作。围绕车道线检测、CUDA 并行加速、点云处理等方向持续实践，把实验结果沉淀为可复用的工程经验。`;
const FONT = '16px "Inter", "Noto Sans SC", system-ui, sans-serif';
const LINE_HEIGHT = 28;
const FONT_COLOR = 'rgba(255, 255, 255, 0.9)';
const ACCENT_COLOR = 'rgba(100, 200, 255, 0.8)';

// ─── Canvas 设置 ──────────────────────────────────────────────────
const canvas = document.getElementById('pretext-canvas');
const ctx = canvas.getContext('2d');
let dpr = window.devicePixelRatio || 1;
let width, height;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── 障碍物（可拖拽） ────────────────────────────────────────────
const obstacle = { x: 0, y: 0, r: 60, dragging: false };

function initObstacle() {
  obstacle.x = width * 0.7;
  obstacle.y = height * 0.5;
  obstacle.r = Math.min(width, height) * 0.12;
}

// ─── 文字布局 + 渲染 ─────────────────────────────────────────────
function getTextWidth(line) {
  ctx.font = FONT;
  return ctx.measureText(line).text.length * 8; // fallback
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  // 绘制障碍物
  ctx.beginPath();
  ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 使用 Pretext 布局文字
  const prepared = prepareWithSegments(TEXT, FONT);
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = LINE_HEIGHT;
  const padding = 20;
  const maxWidth = width - padding * 2;

  ctx.font = FONT;
  ctx.fillStyle = FONT_COLOR;
  ctx.textBaseline = 'top';

  while (y < height - LINE_HEIGHT) {
    // 计算当前行是否与障碍物相交
    const lineCenterY = y + LINE_HEIGHT / 2;
    const dy = lineCenterY - obstacle.y;
    const intersects = Math.abs(dy) < obstacle.r;

    let lineWidth = maxWidth;
    if (intersects) {
      // 障碍物在这一行：计算可用宽度
      const halfChord = Math.sqrt(Math.max(0, obstacle.r * obstacle.r - dy * dy));
      const obsLeft = obstacle.x - halfChord;
      const obsRight = obstacle.x + halfChord;

      // 文字从左侧开始，到障碍物前停止
      if (obsLeft > padding + 100) {
        lineWidth = obsLeft - padding - 10;
      } else {
        // 障碍物太靠左，文字从障碍物右侧开始
        lineWidth = maxWidth - (obsRight - padding) - 10;
        // 跳过这一行到障碍物右侧（简化处理）
        y += LINE_HEIGHT;
        continue;
      }
    }

    const range = layoutNextLineRange(prepared, cursor, lineWidth);
    if (range === null) break;

    const line = materializeLineRange(prepared, range);
    ctx.fillText(line.text, padding, y);

    cursor = range.end;
    y += LINE_HEIGHT;
  }
}

// ─── 拖拽交互 ────────────────────────────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', moveDrag);
canvas.addEventListener('mouseup', endDrag);
canvas.addEventListener('mouseleave', endDrag);
canvas.addEventListener('touchstart', startDrag, { passive: true });
canvas.addEventListener('touchmove', moveDrag, { passive: true });
canvas.addEventListener('touchend', endDrag);

function startDrag(e) {
  const pos = getPos(e);
  const dx = pos.x - obstacle.x;
  const dy = pos.y - obstacle.y;
  if (dx * dx + dy * dy < obstacle.r * obstacle.r) {
    obstacle.dragging = true;
    canvas.style.cursor = 'grabbing';
  }
}

function moveDrag(e) {
  if (!obstacle.dragging) return;
  e.preventDefault();
  const pos = getPos(e);
  obstacle.x = Math.max(obstacle.r, Math.min(width - obstacle.r, pos.x));
  obstacle.y = Math.max(obstacle.r, Math.min(height - obstacle.r, pos.y));
  requestAnimationFrame(draw);
}

function endDrag() {
  obstacle.dragging = false;
  canvas.style.cursor = 'grab';
}

// ─── 初始化 ──────────────────────────────────────────────────────
function init() {
  resize();
  initObstacle();
  canvas.style.cursor = 'grab';
  draw();
}

window.addEventListener('resize', () => { resize(); initObstacle(); draw(); });
init();

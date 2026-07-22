import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from './layout.js';

// ─── 配置 ────────────────────────────────────────────────────────
const TEXT = `聚焦计算机视觉、自动驾驶感知、并行计算与公开写作。公开仓库 15 个，获得 1 个 Star。正在赞助 2 个开发者：LizardByte、glenn-jocher。车道线与感知实验：持续整理传统视觉流程、深度学习方案与场景感知实验。并行计算与性能优化：围绕 CUDA、OpenMP 和图像/点云处理热点流程做性能优化。最新文章：记录GStreamer打开JPEG编码的视频时出现段错误的原因。CARLA中的坐标系与标准车辆坐标系转换。`;
const FONT = '16px "Inter", "Noto Sans SC", system-ui, sans-serif';
const LINE_HEIGHT = 26;
const MIN_SLOT_WIDTH = 60;

// ─── DOM 容器 ────────────────────────────────────────────────────
const container = document.getElementById('pretext-output');
let W, H, prepared;

// ─── 圆球（障碍物） ─────────────────────────────────────────────
let orbs = [];
function initOrbs() {
  const r = Math.min(W, H) * 0.08;
  orbs = [
    { x: W * 0.3, y: H * 0.35, r, color: '#FF78B8', dragging: false },
    { x: W * 0.7, y: H * 0.6, r: r * 1.2, color: '#00D4FF', dragging: false },
    { x: W * 0.5, y: H * 0.8, r: r * 0.8, color: '#7C83FF', dragging: false },
  ];
}

// ─── 切割可用区间 ────────────────────────────────────────────────
function carveSlots(baseLeft, baseRight, blocked) {
  let slots = [{ left: baseLeft, right: baseRight }];
  for (const iv of blocked) {
    const next = [];
    for (const s of slots) {
      if (iv.right <= s.left || iv.left >= s.right) { next.push(s); continue; }
      if (iv.left > s.left) next.push({ left: s.left, right: iv.left });
      if (iv.right < s.right) next.push({ left: iv.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT_WIDTH);
}

// ─── 渲染文字行 ──────────────────────────────────────────────────
function renderLines() {
  if (!prepared) prepared = prepareWithSegments(TEXT, FONT);
  container.innerHTML = '';

  const padding = 30;
  const colW = (W - padding * 2 - 40) / 2;
  const columns = [
    { left: padding, right: padding + colW },
    { left: padding + colW + 40, right: W - padding },
  ];

  let cursor = { segmentIndex: 0, graphemeIndex: 0 };

  for (const col of columns) {
    let y = LINE_HEIGHT;
    const colBottom = H - 20;

    while (y < colBottom && cursor.segmentIndex < prepared.segments.length) {
      const lineTop = y;
      const lineBottom = y + LINE_HEIGHT;
      const lineCY = (lineTop + lineBottom) / 2;

      // 收集当前行被圆球遮挡的区间
      const blocked = [];
      for (const orb of orbs) {
        const dy = Math.abs(lineCY - orb.y);
        if (dy < orb.r) {
          const dx = Math.sqrt(Math.max(0, orb.r * orb.r - dy * dy));
          blocked.push({ left: orb.x - dx, right: orb.x + dx });
        }
      }

      // 切割可用区间
      const slots = carveSlots(col.left, col.right, blocked);
      let lineUsed = false;

      for (const slot of slots) {
        if (cursor.segmentIndex >= prepared.segments.length) break;
        const w = slot.right - slot.left;
        const range = layoutNextLineRange(prepared, cursor, w - 4);
        if (!range) break;

        const line = materializeLineRange(prepared, range);
        if (!line.text.trim()) break;

        const el = document.createElement('div');
        el.className = 'pretext-line';
        el.style.left = slot.left + 'px';
        el.style.top = lineTop + 'px';
        el.style.width = w + 'px';
        el.textContent = line.text;
        container.appendChild(el);

        cursor = range.end;
        lineUsed = true;
      }

      if (!lineUsed && blocked.length > 0) {
        // 整行被遮挡，跳过
      }
      y += LINE_HEIGHT;
    }
  }
}

// ─── 拖拽交互 ────────────────────────────────────────────────────
let dragOrb = null;

function getPos(e) {
  const touch = e.touches ? e.touches[0] : e;
  const rect = container.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function hitTest(p) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 < o.r * o.r) return o;
  }
  return null;
}

container.addEventListener('mousedown', e => {
  const p = getPos(e);
  dragOrb = hitTest(p);
  if (dragOrb) { dragOrb.dragging = true; container.style.cursor = 'grabbing'; renderLines(); }
});

container.addEventListener('mousemove', e => {
  const p = getPos(e);
  if (!dragOrb) { container.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
  dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
  dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
  requestAnimationFrame(renderLines);
});

container.addEventListener('mouseup', () => {
  if (dragOrb) { dragOrb.dragging = false; dragOrb = null; }
  container.style.cursor = 'default';
});

// 触摸
container.addEventListener('touchstart', e => {
  const p = getPos(e);
  dragOrb = hitTest(p);
  if (dragOrb) { dragOrb.dragging = true; renderLines(); }
}, { passive: true });

container.addEventListener('touchmove', e => {
  if (!dragOrb) return;
  e.preventDefault();
  const p = getPos(e);
  dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
  dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
  requestAnimationFrame(renderLines);
}, { passive: false });

container.addEventListener('touchend', () => {
  if (dragOrb) { dragOrb.dragging = false; dragOrb = null; }
});

// ─── 圆球渲染 ────────────────────────────────────────────────────
function renderOrbs() {
  container.querySelectorAll('.pretext-orb').forEach(el => el.remove());
  for (const orb of orbs) {
    const el = document.createElement('div');
    el.className = 'pretext-orb';
    el.style.left = (orb.x - orb.r) + 'px';
    el.style.top = (orb.y - orb.r) + 'px';
    el.style.width = (orb.r * 2) + 'px';
    el.style.height = (orb.r * 2) + 'px';
    el.style.borderColor = orb.color;
    container.appendChild(el);
  }
}

let needsRender = false;
function render() {
  if (needsRender) return;
  needsRender = true;
  requestAnimationFrame(() => {
    needsRender = false;
    renderLines();
    renderOrbs();
  });
}

// ─── 初始化 ──────────────────────────────────────────────────────
function resize() {
  const rect = container.parentElement.getBoundingClientRect();
  W = rect.width; H = rect.height;
}

function init() {
  resize();
  initOrbs();
  prepared = prepareWithSegments(TEXT, FONT);
  renderLines();
  renderOrbs();
}

window.addEventListener('resize', () => { resize(); initOrbs(); render(); });
window.addEventListener('load', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') init();

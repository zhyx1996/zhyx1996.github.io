import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from './layout.js';

const TEXT = `聚焦计算机视觉、自动驾驶感知、并行计算与公开写作。公开仓库 15 个，获得 1 个 Star。正在赞助开发者：LizardByte、glenn-jocher。车道线与感知实验：持续整理传统视觉流程、深度学习方案与场景感知实验。并行计算与围绕 CUDA、OpenMP 和图像/点云处理热点流程做性能优化。最新文章：记录GStreamer打开JPEG编码的视频时出现段错误的原因。CARLA中的坐标系与标准车辆坐标系转换。`;
const FONT = '16px "Inter", "Noto Sans SC", system-ui, sans-serif';
const LINE_HEIGHT = 26;
const MIN_SLOT_WIDTH = 60;

const container = document.getElementById('pretext-output');
let W, H, prepared, orbs = [];
let orbElements = []; // 缓存 DOM 元素
let lastRenderTime = 0;
let renderPending = false;

function getPrepared() {
    if (!prepared) prepared = prepareWithSegments(TEXT, FONT);
    return prepared;
}

function resize() {
    const r = container.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
}

function initOrbs() {
    const r = Math.min(W, H) * 0.08;
    orbs = [
        { x: W * 0.3, y: H * 0.35, r, color: '#FF78B8', dragging: false, vx: 0.3, vy: 0.2 },
        { x: W * 0.7, y: H * 0.6, r: r * 1.2, color: '#00D4FF', dragging: false, vx: -0.2, vy: 0.3 },
        { x: W * 0.5, y: H * 0.8, r: r * 0.8, color: '#7C83FF', dragging: false, vx: 0.25, vy: -0.2 },
    ];
}

// ─── 文字渲染（节流） ────────────────────────────────────────────
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

function renderText() {
    container.querySelectorAll('.pretext-line').forEach(el => el.remove());
    const prepared = getPrepared();
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    const padding = 30;
    const colW = (W - padding * 2 - 40) / 2;
    const columns = [
        { start: padding, end: padding + colW },
        { start: padding + colW + 40, end: W - padding },
    ];
    for (const col of columns) {
        let y = LINE_HEIGHT * 1.5;
        const colBottom = H - 20;
        while (y < colBottom && cursor.segmentIndex < prepared.segments.length) {
            const lineCY = y + LINE_HEIGHT / 2;
            const blocks = [];
            for (const orb of orbs) {
                const dy = lineCY - orb.y;
                if (Math.abs(dy) < orb.r) {
                    const half = Math.sqrt(Math.max(0, orb.r * orb.r - dy * dy));
                    blocks.push({ left: orb.x - half, right: orb.x + half });
                }
            }
            blocks.sort((a, b) => a.left - b.left);
            const merged = [];
            for (const b of blocks) {
                if (merged.length && b.left <= merged[merged.length - 1].right) {
                    merged[merged.length - 1].right = Math.max(merged[merged.length - 1].right, b.right);
                } else merged.push({ ...b });
            }
            const segments = [];
            let segStart = col.start;
            for (const block of merged) {
                if (block.left > segStart) segments.push({ x: segStart, w: block.left - segStart });
                segStart = Math.max(segStart, block.right);
            }
            if (segStart < col.end) segments.push({ x: segStart, w: col.end - segStart });
            for (const seg of segments) {
                if (seg.w < MIN_SLOT_WIDTH) continue;
                if (cursor.segmentIndex >= prepared.segments.length) break;
                const range = layoutNextLineRange(prepared, cursor, seg.w - 4);
                if (!range) break;
                const line = materializeLineRange(prepared, range);
                if (!line.text.trim()) break;
                const el = document.createElement('div');
                el.className = 'pretext-line';
                el.style.left = seg.x + 'px';
                el.style.top = y + 'px';
                el.style.width = seg.w + 'px';
                el.textContent = line.text;
                container.appendChild(el);
                cursor = range.end;
            }
            y += LINE_HEIGHT;
        }
    }
}

// ─── 圆球渲染（CSS transform，GPU 加速）─────────────────────────
function createOrbElements() {
    orbElements = [];
    container.querySelectorAll('.pretext-orb').forEach(el => el.remove());
    for (const orb of orbs) {
        const el = document.createElement('div');
        el.className = 'pretext-orb';
        el.style.width = (orb.r * 2) + 'px';
        el.style.height = (orb.r * 2) + 'px';
        el.style.borderColor = orb.color;
        el.style.transform = `translate3d(${orb.x - orb.r}px, ${orb.y - orb.r}px, 0)`;
        container.appendChild(el);
        orbElements.push(el);
    }
    saveOrbPositions();
}

function updateOrbPositions() {
    for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        const el = orbElements[i];
        if (el && !orb.dragging) {
            el.style.transform = `translate3d(${orb.x - orb.r}px, ${orb.y - orb.r}px, 0)`;
        }
    }
}

// ─── 动画循环（仅移动圆球，不重绘文字）──────────────────────────
let animationId = null;
let lastTextRender = 0;
let lastOrbPositions = [];
const MOVE_THRESHOLD = 3; // 像素位移阈值，超过才重绘文字

function orbMovedSignificantly() {
    if (lastOrbPositions.length !== orbs.length) return true;
    for (let i = 0; i < orbs.length; i++) {
        const dx = Math.abs(orbs[i].x - lastOrbPositions[i].x);
        const dy = Math.abs(orbs[i].y - lastOrbPositions[i].y);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) return true;
    }
    return false;
}

function saveOrbPositions() {
    lastOrbPositions = orbs.map(o => ({ x: o.x, y: o.y }));
}

function animate() {
    const now = performance.now();
    
    // 圆球自动浮动（每帧都更新，但只用 CSS transform）
    for (const orb of orbs) {
        if (orb.dragging) continue;
        orb.x += orb.vx;
        orb.y += orb.vy;
        // 边界反弹
        if (orb.x - orb.r < 0 || orb.x + orb.r > W) { orb.vx *= -1; orb.x = Math.max(orb.r, Math.min(W - orb.r, orb.x)); }
        if (orb.y - orb.r < 0 || orb.y + orb.r > H) { orb.vy *= -1; orb.y = Math.max(orb.r, Math.min(H - orb.r, orb.y)); }
    }
    
    // 更新圆球位置（GPU 加速，不触发重排）
    updateOrbPositions();
    
    // 文字渲染：仅在圆球位移超过阈值时重绘（避免无意义的 DOM 操作）
    if (orbMovedSignificantly()) {
        renderText();
        saveOrbPositions();
        lastTextRender = now;
    }
    
    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (!animationId) animate();
}

function stopAnimation() {
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
}

// 页面隐藏时暂停动画，节省 CPU/GPU
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

// ─── 拖拽 ────────────────────────────────────────────────────────
let dragOrb = null;

function getPos(e) {
    const r = container.getBoundingClientRect();
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

container.addEventListener('mousedown', e => {
    dragOrb = hitTest(getPos(e));
    if (dragOrb) { dragOrb.dragging = true; container.style.cursor = 'grabbing'; }
});

container.addEventListener('mousemove', e => {
    const p = getPos(e);
    if (!dragOrb) { container.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
    dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
    dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
    // 拖拽时实时更新圆球位置
    const idx = orbs.indexOf(dragOrb);
    if (idx >= 0 && orbElements[idx]) {
        orbElements[idx].style.transform = `translate3d(${dragOrb.x - dragOrb.r}px, ${dragOrb.y - dragOrb.r}px, 0)`;
    }
});

container.addEventListener('mouseup', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } container.style.cursor = 'default'; });
container.addEventListener('mouseleave', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } container.style.cursor = 'default'; });

container.addEventListener('touchstart', e => {
    dragOrb = hitTest(getPos(e));
    if (dragOrb) { dragOrb.dragging = true; }
}, { passive: true });

container.addEventListener('touchmove', e => {
    if (!dragOrb) return;
    e.preventDefault();
    const p = getPos(e);
    dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
    dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
    const idx = orbs.indexOf(dragOrb);
    if (idx >= 0 && orbElements[idx]) {
        orbElements[idx].style.transform = `translate3d(${dragOrb.x - dragOrb.r}px, ${dragOrb.y - dragOrb.r}px, 0)`;
    }
}, { passive: false });

container.addEventListener('touchend', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } });

// ─── 初始化 ──────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); initOrbs(); createOrbElements(); renderText(); }, 200); });

function init() { resize(); initOrbs(); prepared = getPrepared(); createOrbElements(); renderText(); startAnimation(); }
window.addEventListener('load', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') init();

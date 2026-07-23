import { prepareWithSegments, layoutNextLine } from './layout.js';

const TEXT = `公开仓库 15 个，主要围绕计算机视觉、自动驾驶感知、并行计算与公开写作。lane2seq 做实时车道检测，结合 Canny/Hough 变换、CLAHE、HLS 等传统流程与 Lane2Seq-ViT 序列生成模型，并用 ENet 分割在 TuSimple 和 LLAMAS 数据集上训练与验证。pcl 仓库给 PCL 的 BoundaryEstimation 加了 OMP 并行加速，提升点云边界估计速度。GStreamer 仓库整理 RTSP 推流、自定义 SEI 注入、Carla 多相机管理与 pyinstaller 打包 exe 的完整踩坑记录。auto_calib_v2 在 PJLab-ADG/SensorsCalibration 的 lidar2camera 方案上做改进，方便自动驾驶多传感器联合标定。stars 仓库收集关注过的有意思项目。维护的 gkd 订阅用于广告过滤与规则分享。Jupyter 笔记记录车道检测实验的迭代过程。近期也在看 BEV 感知、Occupancy 估计与端到端自动驾驶方向。`;

const FONT = '16px "Inter", "Noto Sans SC", system-ui, sans-serif';
const LINE_HEIGHT = 26;

const container = document.getElementById('pretext-output');
let W, H, prepared, graphemes = [], graphemeWidths = [], orbs = [];
let orbElements = [];
let lastRenderTime = 0;
let renderPending = false;

function getPrepared() {
    if (!prepared) {
        prepared = prepareWithSegments(TEXT, FONT);
        // Manually split into individual characters for CJK
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = FONT;
        graphemes = [];
        graphemeWidths = [];
        for (const char of TEXT) {
            graphemes.push(char);
            graphemeWidths.push(ctx.measureText(char).width);
        }
    }
    return prepared;
}

function resize() {
    const r = container.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
}

function initOrbs() {
    const r = Math.min(W, H) * 0.08;
    orbs = [
        { x: W * 0.3, y: H * 0.35, r, color: '#D97706', dragging: false, vx: 0.3, vy: 0.2 },
        { x: W * 0.7, y: H * 0.6, r: r * 1.2, color: '#0D9488', dragging: false, vx: -0.2, vy: 0.3 },
        { x: W * 0.5, y: H * 0.8, r: r * 0.8, color: '#B45309', dragging: false, vx: 0.25, vy: -0.2 },
    ];
}

// Calculate available slots by subtracting blocked regions
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
    return slots.filter(s => s.right - s.left >= 20);
}

function renderText() {
    container.querySelectorAll('.pretext-line').forEach(el => el.remove());
    getPrepared();
    
    const padding = 30;
    const colStart = padding;
    const colEnd = W - padding;
    const colWidth = colEnd - colStart;
    
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    
    for (let y = LINE_HEIGHT * 1.5; y < H - 20 && cursor.segmentIndex < prepared.segments.length; y += LINE_HEIGHT) {
        const bandTop = y;
        const bandBottom = y + LINE_HEIGHT;
        
        // Calculate blocked regions for this line (circle-rectangle intersection)
        const blocked = [];
        for (const orb of orbs) {
            // Find the minimum distance from orb center to the band
            const minDy = orb.y >= bandTop && orb.y <= bandBottom ? 0 
                : orb.y < bandTop ? bandTop - orb.y 
                : orb.y - bandBottom;
            if (minDy >= orb.r) continue;
            const maxDx = Math.sqrt(Math.max(0, orb.r * orb.r - minDy * minDy));
            blocked.push({ left: orb.x - maxDx, right: orb.x + maxDx });
        }
        
        // Carve slots from available space
        const slots = carveSlots(colStart, colEnd, blocked);
        if (slots.length === 0) continue;
        
        // Sort slots by left position (left to right)
        slots.sort((a, b) => a.left - b.left);
        
        // Fill each slot with text
        for (const slot of slots) {
            if (cursor.segmentIndex >= prepared.segments.length) break;
            const slotWidth = slot.right - slot.left;
            if (slotWidth < 20) continue;
            
            const line = layoutNextLine(prepared, cursor, slotWidth);
            if (!line || !line.text.trim()) break;
            
            const el = document.createElement('div');
            el.className = 'pretext-line';
            el.style.left = slot.left + 'px';
            el.style.top = y + 'px';
            el.style.width = slotWidth + 'px';
            el.textContent = line.text;
            container.appendChild(el);
            cursor = line.end;
        }
    }
}

// ─── 圆球渲染（CSS transform，GPU 加速）─────────────────────────
let orbsLayer;
function createOrbElements() {
    orbElements = [];
    orbsLayer.querySelectorAll('.pretext-orb').forEach(el => el.remove());
    for (const orb of orbs) {
        const el = document.createElement('div');
        el.className = 'pretext-orb';
        el.style.width = (orb.r * 2) + 'px';
        el.style.height = (orb.r * 2) + 'px';
        el.style.borderColor = orb.color;
        el.style.transform = `translate3d(${orb.x - orb.r}px, ${orb.y - orb.r}px, 0)`;
        orbsLayer.appendChild(el);
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
    const r = orbsLayer.getBoundingClientRect();
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

function attachDragEvents() {
    orbsLayer.addEventListener('mousedown', e => {
        dragOrb = hitTest(getPos(e));
        if (dragOrb) { dragOrb.dragging = true; orbsLayer.style.cursor = 'grabbing'; }
    });
    orbsLayer.addEventListener('mousemove', e => {
        const p = getPos(e);
        if (!dragOrb) { orbsLayer.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
        dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
        dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
        const idx = orbs.indexOf(dragOrb);
        if (idx >= 0 && orbElements[idx]) {
            orbElements[idx].style.transform = `translate3d(${dragOrb.x - dragOrb.r}px, ${dragOrb.y - dragOrb.r}px, 0)`;
        }
    });
    orbsLayer.addEventListener('mouseup', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } orbsLayer.style.cursor = 'default'; });
    orbsLayer.addEventListener('mouseleave', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } orbsLayer.style.cursor = 'default'; });
    orbsLayer.addEventListener('touchstart', e => {
        dragOrb = hitTest(getPos(e));
        if (dragOrb) { dragOrb.dragging = true; }
    }, { passive: true });
    orbsLayer.addEventListener('touchmove', e => {
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
    orbsLayer.addEventListener('touchend', () => { if (dragOrb) { dragOrb.dragging = false; dragOrb = null; } });
}

// ─── 初始化 ──────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); initOrbs(); prepared = null; graphemes = []; graphemeWidths = []; createOrbElements(); renderText(); }, 200); });

function init() {
    orbsLayer = document.getElementById('pretext-orbs');
    resize(); initOrbs(); prepared = getPrepared(); createOrbElements(); renderText(); attachDragEvents(); startAnimation();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { setTimeout(init, 100); });
} else {
    setTimeout(init, 100);
}

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

// Check if a character at position (x, y) collides with any orb
function collidesWithOrb(x, y, w, h) {
    for (const orb of orbs) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(x, Math.min(orb.x, x + w));
        const closestY = Math.max(y, Math.min(orb.y, y + h));
        const dx = orb.x - closestX;
        const dy = orb.y - closestY;
        if (dx * dx + dy * dy < orb.r * orb.r) {
            return true;
        }
    }
    return false;
}

function renderText() {
    container.querySelectorAll('.pretext-line').forEach(el => el.remove());
    getPrepared();
    
    const padding = 30;
    const colStart = padding;
    const colEnd = W - padding;
    const colWidth = colEnd - colStart;
    
    let graphemeIndex = 0;
    
    for (let y = LINE_HEIGHT * 1.5; y < H - 20 && graphemeIndex < graphemes.length; y += LINE_HEIGHT) {
        let x = colStart;
        let lineText = '';
        
        while (x < colEnd && graphemeIndex < graphemes.length) {
            const gw = graphemeWidths[graphemeIndex];
            const graphemeLeft = x;
            const graphemeRight = x + gw;
            const graphemeTop = y;
            const graphemeBottom = y + LINE_HEIGHT;
            
            // Check if this grapheme collides with any orb
            if (collidesWithOrb(graphemeLeft, graphemeTop, gw, LINE_HEIGHT)) {
                // Skip this position (leave empty space for the orb)
                x += gw;
            } else if (graphemeRight > colEnd) {
                // Grapheme doesn't fit in the remaining space, move to next line
                break;
            } else {
                // Place the grapheme
                lineText += graphemes[graphemeIndex];
                x += gw;
                graphemeIndex++;
            }
        }
        
        if (lineText) {
            const el = document.createElement('div');
            el.className = 'pretext-line';
            el.style.left = colStart + 'px';
            el.style.top = y + 'px';
            el.style.width = colWidth + 'px';
            el.textContent = lineText;
            container.appendChild(el);
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

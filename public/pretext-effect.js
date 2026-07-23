const TEXT = `公开仓库 15 个，主要围绕计算机视觉、自动驾驶感知、并行计算与公开写作。lane2seq 做实时车道检测，结合 Canny/Hough 变换、CLAHE、HLS 等传统流程与 Lane2Seq-ViT 序列生成模型，并用 ENet 分割在 TuSimple 和 LLAMAS 数据集上训练与验证。pcl 仓库给 PCL 的 BoundaryEstimation 加了 OMP 并行加速，提升点云边界估计速度。GStreamer 仓库整理 RTSP 推流、自定义 SEI 注入、Carla 多相机管理与 pyinstaller 打包 exe 的完整踩坑记录。auto_calib_v2 在 PJLab-ADG/SensorsCalibration 的 lidar2camera 方案上做改进，方便自动驾驶多传感器联合标定。stars 仓库收集关注过的有意思项目。维护的 gkd 订阅用于广告过滤与规则分享。Jupyter 笔记记录车道检测实验的迭代过程。近期也在看 BEV 感知、Occupancy 估计与端到端自动驾驶方向。`;

const DEFAULT_LINE_HEIGHT = 24;
const ORB_TEXT_GAP = 1;

const container = document.getElementById('pretext-output');
let W, H, graphemes = [], graphemeWidths = [], orbs = [];
let lineHeight = DEFAULT_LINE_HEIGHT;
let fontSize = 13;
let orbElements = [];

function splitGraphemes(text) {
    if (typeof Intl.Segmenter === 'function') {
        return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)]
            .map(item => item.segment);
    }
    return Array.from(text);
}

function measureRenderedText() {
    const probe = document.createElement('span');
    probe.className = 'pretext-line';
    probe.style.visibility = 'hidden';
    probe.style.width = 'auto';
    probe.textContent = '测';
    container.appendChild(probe);

    const style = getComputedStyle(probe);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontParts = [
        style.fontStyle !== 'normal' ? style.fontStyle : '',
        style.fontWeight,
        style.fontSize,
        style.fontFamily
    ].filter(Boolean);
    ctx.font = fontParts.join(' ');

    lineHeight = Number.parseFloat(style.lineHeight) || DEFAULT_LINE_HEIGHT;
    fontSize = Number.parseFloat(style.fontSize) || 13;
    const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
    graphemes = splitGraphemes(TEXT);
    graphemeWidths = graphemes.map(grapheme => Math.max(0, ctx.measureText(grapheme).width + letterSpacing));
    probe.remove();
}

function ensureTextMetrics() {
    if (!graphemes.length) measureRenderedText();
}

function resize() {
    const r = container.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
}

function initOrbs() {
    const r = Math.min(W, H) * 0.08;
    orbs = [
        { x: W * 0.3, y: H * 0.35, r, color: '#D97706', dragging: false, vx: 18, vy: 12 },
        { x: W * 0.7, y: H * 0.6, r: r * 1.2, color: '#0D9488', dragging: false, vx: -12, vy: 18 },
        { x: W * 0.5, y: H * 0.8, r: r * 0.8, color: '#B45309', dragging: false, vx: 15, vy: -12 },
    ];
}

function renderText() {
    container.querySelectorAll('.pretext-line').forEach(el => el.remove());
    ensureTextMetrics();
    
    const padding = 30;
    const colStart = padding;
    const colEnd = W - padding;
    let graphemeIndex = 0;
    
    for (let y = lineHeight * 1.5; y < H - 20 && graphemeIndex < graphemes.length; y += lineHeight) {
        let x = colStart;
        let segmentStart = x;
        let segmentText = '';
        let segmentWidth = 0;
        const segments = [];
        const glyphTop = y + Math.max(0, (lineHeight - fontSize) / 2);
        const glyphBottom = glyphTop + fontSize;

        const flushSegment = () => {
            if (!segmentText) return;
            segments.push({ left: segmentStart, width: segmentWidth, text: segmentText });
            segmentText = '';
            segmentWidth = 0;
        };
        
        while (x < colEnd && graphemeIndex < graphemes.length) {
            const gw = Math.max(graphemeWidths[graphemeIndex], 1);
            const charLeft = x;
            const charRight = x + gw;
            
            // Check if this character collides with any orb
            let collides = false;
            for (const orb of orbs) {
                const collisionRadius = orb.r + ORB_TEXT_GAP;
                const closestX = Math.max(charLeft, Math.min(orb.x, charRight));
                const closestY = Math.max(glyphTop, Math.min(orb.y, glyphBottom));
                const dx = orb.x - closestX;
                const dy = orb.y - closestY;
                if (dx * dx + dy * dy < collisionRadius * collisionRadius) {
                    collides = true;
                    break;
                }
            }
            
            if (collides) {
                // Preserve the skipped position by ending the current DOM segment.
                flushSegment();
                x += gw;
            } else if (charRight > colEnd) {
                flushSegment();
                break;
            } else {
                if (!segmentText) segmentStart = x;
                segmentText += graphemes[graphemeIndex];
                x += gw;
                segmentWidth = x - segmentStart;
                graphemeIndex++;
            }
        }
        flushSegment();
        
        for (const segment of segments) {
            const el = document.createElement('div');
            el.className = 'pretext-line';
            el.style.left = segment.left + 'px';
            el.style.top = y + 'px';
            el.style.width = Math.min(segment.width + 1, colEnd - segment.left) + 'px';
            el.textContent = segment.text;
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

// 圆球持续移动；文字最多落后 1px 就在同一动画帧内同步重排。
let animationId = null;
let lastAnimationTime = null;
let lastOrbPositions = [];
const TEXT_SYNC_THRESHOLD = 1;

function orbNeedsTextSync() {
    if (lastOrbPositions.length !== orbs.length) return true;
    return orbs.some((orb, index) => (
        Math.abs(orb.x - lastOrbPositions[index].x) >= TEXT_SYNC_THRESHOLD
        || Math.abs(orb.y - lastOrbPositions[index].y) >= TEXT_SYNC_THRESHOLD
    ));
}

function saveOrbPositions() {
    lastOrbPositions = orbs.map(orb => ({ x: orb.x, y: orb.y }));
}

function animate(now) {
    if (lastAnimationTime === null) lastAnimationTime = now;
    const deltaSeconds = Math.min((now - lastAnimationTime) / 1000, 0.05);
    lastAnimationTime = now;

    for (const orb of orbs) {
        if (orb.dragging) continue;
        orb.x += orb.vx * deltaSeconds;
        orb.y += orb.vy * deltaSeconds;
        if (orb.x - orb.r < 0 || orb.x + orb.r > W) {
            orb.vx *= -1;
            orb.x = Math.max(orb.r, Math.min(W - orb.r, orb.x));
        }
        if (orb.y - orb.r < 0 || orb.y + orb.r > H) {
            orb.vy *= -1;
            orb.y = Math.max(orb.r, Math.min(H - orb.r, orb.y));
        }
    }

    updateOrbPositions();
    if (orbNeedsTextSync()) {
        renderText();
        saveOrbPositions();
    }
    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationId !== null) return;
    lastAnimationTime = null;
    animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationId === null) return;
    cancelAnimationFrame(animationId);
    animationId = null;
    lastAnimationTime = null;
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
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
    const finishDrag = () => {
        if (dragOrb) {
            dragOrb.dragging = false;
            dragOrb = null;
            renderText();
            saveOrbPositions();
        }
        orbsLayer.style.cursor = 'default';
    };
    orbsLayer.addEventListener('mouseup', finishDrag);
    orbsLayer.addEventListener('mouseleave', finishDrag);
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
    orbsLayer.addEventListener('touchend', finishDrag);
}

// ─── 初始化 ──────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); initOrbs(); graphemes = []; graphemeWidths = []; createOrbElements(); renderText(); }, 200); });

function init() {
    orbsLayer = document.getElementById('pretext-orbs');
    resize(); initOrbs(); ensureTextMetrics(); createOrbElements(); renderText(); attachDragEvents(); startAnimation();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { setTimeout(init, 100); });
} else {
    setTimeout(init, 100);
}

import { layoutNextLine, prepareWithSegments } from './layout.js';

const TEXT = `公开仓库 15 个，主要围绕计算机视觉、自动驾驶感知、并行计算与公开写作。lane2seq 做实时车道检测，结合 Canny/Hough 变换、CLAHE、HLS 等传统流程与 Lane2Seq-ViT 序列生成模型，并用 ENet 分割在 TuSimple 和 LLAMAS 数据集上训练与验证。pcl 仓库给 PCL 的 BoundaryEstimation 加了 OMP 并行加速，提升点云边界估计速度。GStreamer 仓库整理 RTSP 推流、自定义 SEI 注入、Carla 多相机管理与 pyinstaller 打包 exe 的完整踩坑记录。auto_calib_v2 在 PJLab-ADG/SensorsCalibration 的 lidar2camera 方案上做改进，方便自动驾驶多传感器联合标定。stars 仓库收集关注过的有意思项目。维护的 gkd 订阅用于广告过滤与规则分享。Jupyter 笔记记录车道检测实验的迭代过程。近期也在看 BEV 感知、Occupancy 估计与端到端自动驾驶方向。`;

const DEFAULT_LINE_HEIGHT = 24;
const ORB_TEXT_GAP = 1;
const MIN_SLOT_WIDTH = 32;

const container = document.getElementById('pretext-output');
let W, H, prepared, orbs = [];
let lineHeight = DEFAULT_LINE_HEIGHT;
let fontSize = 13;
let orbElements = [];
const lineElements = [];

function prepareRenderedText() {
    const probe = document.createElement('span');
    probe.className = 'pretext-line';
    probe.style.visibility = 'hidden';
    probe.textContent = '测';
    container.appendChild(probe);

    const style = getComputedStyle(probe);
    const fontParts = [
        style.fontStyle !== 'normal' ? style.fontStyle : '',
        style.fontWeight,
        style.fontSize,
        style.fontFamily
    ].filter(Boolean);
    const font = fontParts.join(' ');

    lineHeight = Number.parseFloat(style.lineHeight) || DEFAULT_LINE_HEIGHT;
    fontSize = Number.parseFloat(style.fontSize) || 13;
    const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
    prepared = prepareWithSegments(TEXT, font, { letterSpacing });
    probe.remove();
}

function ensureTextMetrics() {
    if (!prepared) prepareRenderedText();
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

function circleIntervalForBand(orb, bandTop, bandBottom) {
    if (bandTop >= orb.y + orb.r || bandBottom <= orb.y - orb.r) return null;
    const minDy = orb.y >= bandTop && orb.y <= bandBottom
        ? 0
        : orb.y < bandTop ? bandTop - orb.y : orb.y - bandBottom;
    if (minDy >= orb.r) return null;
    const halfWidth = Math.sqrt(orb.r * orb.r - minDy * minDy);
    return {
        left: orb.x - halfWidth - ORB_TEXT_GAP,
        right: orb.x + halfWidth + ORB_TEXT_GAP,
    };
}

function carveTextLineSlots(base, blocked) {
    let slots = [base];
    for (const interval of blocked.sort((a, b) => a.left - b.left)) {
        const next = [];
        for (const slot of slots) {
            if (interval.right <= slot.left || interval.left >= slot.right) {
                next.push(slot);
                continue;
            }
            if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left });
            if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right });
        }
        slots = next;
    }
    const minimumWidth = Math.max(MIN_SLOT_WIDTH, fontSize * 2);
    return slots.filter(slot => slot.right - slot.left >= minimumWidth);
}

function syncTextLines(lines) {
    while (lineElements.length < lines.length) {
        const element = document.createElement('span');
        element.className = 'pretext-line';
        container.appendChild(element);
        lineElements.push(element);
    }

    for (let index = 0; index < lineElements.length; index++) {
        const element = lineElements[index];
        const line = lines[index];
        if (!line) {
            element.style.display = 'none';
            continue;
        }
        element.style.display = '';
        if (element.textContent !== line.text) element.textContent = line.text;
        const left = `${Math.round(line.left)}px`;
        const top = `${Math.round(line.top)}px`;
        if (element.style.left !== left) element.style.left = left;
        if (element.style.top !== top) element.style.top = top;
    }
}

function renderText() {
    ensureTextMetrics();

    const padding = 30;
    const colStart = padding;
    const colEnd = W - padding;
    const lines = [];
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let textExhausted = false;

    for (let y = lineHeight * 1.5; y + lineHeight < H - 20 && !textExhausted; y += lineHeight) {
        const blocked = [];
        for (const orb of orbs) {
            const interval = circleIntervalForBand(orb, y, y + lineHeight);
            if (interval) blocked.push(interval);
        }

        const slots = carveTextLineSlots({ left: colStart, right: colEnd }, blocked);
        for (const slot of slots) {
            const line = layoutNextLine(prepared, cursor, slot.right - slot.left);
            if (!line) {
                textExhausted = true;
                break;
            }
            cursor = line.end;
            if (!line.text) continue;
            lines.push({ left: slot.left, top: y, text: line.text });
        }
    }

    syncTextLines(lines);
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
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resize();
        initOrbs();
        prepared = null;
        createOrbElements();
        renderText();
    }, 200);
});

async function init() {
    orbsLayer = document.getElementById('pretext-orbs');
    if (document.fonts?.ready) await document.fonts.ready;
    resize(); initOrbs(); ensureTextMetrics(); createOrbElements(); renderText(); attachDragEvents(); startAnimation();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { setTimeout(init, 100); });
} else {
    setTimeout(init, 100);
}

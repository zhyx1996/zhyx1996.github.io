const TEXT = `视觉输入      感知结果      并行计算      实践记录`;

const DEFAULT_LINE_HEIGHT = 24;
const container = document.getElementById('pretext-output');
let W, H, graphemes = [], graphemeWidths = [], orbs = [];
let lineHeight = DEFAULT_LINE_HEIGHT;
let fontSize = 13;
let orbElements = [];
const lineElements = [];

function splitGraphemes(text) {
    if (typeof Intl.Segmenter === 'function') {
        return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)]
            .map(item => item.segment);
    }
    return Array.from(text);
}

function prepareRenderedText() {
    const calibrationText = '测W0.';
    const probe = document.createElement('span');
    probe.className = 'pretext-line';
    probe.style.visibility = 'hidden';
    probe.textContent = calibrationText;
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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;
    // Canvas and DOM fallback fonts can differ slightly, so calibrate once
    // against the rendered probe before using cached grapheme widths.
    const canvasCalibrationWidth = context.measureText(calibrationText).width;
    const renderedCalibrationWidth = probe.getBoundingClientRect().width;
    const widthScale = canvasCalibrationWidth > 0
        ? renderedCalibrationWidth / canvasCalibrationWidth
        : 1;
    graphemes = splitGraphemes(TEXT);
    graphemeWidths = graphemes.map(grapheme => (
        Math.max(1, context.measureText(grapheme).width * widthScale + letterSpacing)
    ));
    probe.remove();
}

function ensureTextMetrics() {
    if (!graphemes.length) prepareRenderedText();
}

function resize() {
    const r = container.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    const maxOrbR = Math.min(W, H) * 0.08 * 1.2;
    container.style.padding = maxOrbR + 'px';
}

function initOrbs() {
    const r = Math.min(W, H) * 0.08;
    orbs = [
        { x: W * 0.3, y: H * 0.35, r, color: '#D97706', dragging: false, vx: 18, vy: 12 },
        { x: W * 0.7, y: H * 0.6, r: r * 1.2, color: '#0D9488', dragging: false, vx: -12, vy: 18 },
        { x: W * 0.5, y: H * 0.8, r: r * 0.8, color: '#B45309', dragging: false, vx: 15, vy: -12 },
    ];
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
    const lines = [
        { left: 24, top: Math.max(78, H * 0.28), text: '视觉输入' },
        { left: Math.max(24, W * 0.54), top: Math.max(78, H * 0.28), text: '感知结果' },
        { left: 24, top: Math.min(H - lineHeight * 2.5, H * 0.7), text: '并行计算' },
        { left: Math.max(24, W * 0.54), top: Math.min(H - lineHeight * 2.5, H * 0.7), text: '实践记录' },
    ];
    syncTextLines(lines.filter(line => line.left + line.text.length * fontSize < W - 18));
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
        el.style.boxShadow = `0 0 18px 4px ${orb.color}22, inset 0 0 12px 2px ${orb.color}18`;
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

// 标签与小球互不重叠：小球避开四个标签矩形（留白），小球之间互相弹开。
function getLabelBoxes() {
    const boxes = [];
    for (const el of lineElements) {
        if (!el || el.style.display === 'none' || !el.textContent) continue;
        boxes.push({
            left: parseFloat(el.style.left) || 0,
            top: parseFloat(el.style.top) || 0,
            width: el.offsetWidth || el.textContent.length * fontSize,
            height: lineHeight,
        });
    }
    return boxes;
}

function resolveCollisions() {
    const pad = 10; // 标签周围留白
    const boxes = getLabelBoxes();
    for (const orb of orbs) {
        if (orb.dragging) continue;
        for (const box of boxes) {
            const minX = box.left - orb.r - pad;
            const maxX = box.left + box.width + orb.r + pad;
            const minY = box.top - orb.r - pad;
            const maxY = box.top + box.height + orb.r + pad;
            if (orb.x <= minX || orb.x >= maxX || orb.y <= minY || orb.y >= maxY) continue;
            const overlapLeft = orb.x - minX;
            const overlapRight = maxX - orb.x;
            const overlapTop = orb.y - minY;
            const overlapBottom = maxY - orb.y;
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapLeft) {
                orb.x = minX - 0.5;
                orb.vx = -Math.abs(orb.vx);
            } else if (minOverlap === overlapRight) {
                orb.x = maxX + 0.5;
                orb.vx = Math.abs(orb.vx);
            } else if (minOverlap === overlapTop) {
                orb.y = minY - 0.5;
                orb.vy = -Math.abs(orb.vy);
            } else {
                orb.y = maxY + 0.5;
                orb.vy = Math.abs(orb.vy);
            }
        }
    }
    // 小球互斥（等质量弹性碰撞近似）
    for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];
        if (orb.dragging) continue;
        for (let j = i + 1; j < orbs.length; j++) {
            const other = orbs[j];
            if (other.dragging) continue;
            const dx = orb.x - other.x;
            const dy = orb.y - other.y;
            const dist = Math.hypot(dx, dy);
            const minDist = orb.r + other.r + 4;
            if (dist > 0 && dist < minDist) {
                const push = (minDist - dist) / 2;
                const ux = dx / dist;
                const uy = dy / dist;
                orb.x += ux * push;
                orb.y += uy * push;
                other.x -= ux * push;
                other.y -= uy * push;
                const v1n = orb.vx * ux + orb.vy * uy;
                const v2n = other.vx * ux + other.vy * uy;
                if (v1n > v2n) {
                    orb.vx += (v2n - v1n) * ux;
                    orb.vy += (v2n - v1n) * uy;
                    other.vx += (v1n - v2n) * ux;
                    other.vy += (v1n - v2n) * uy;
                }
            }
        }
    }
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
            orb.vy += (Math.random() - 0.5) * 4;
        }
        if (orb.y - orb.r < 0 || orb.y + orb.r > H) {
            orb.vy *= -1;
            orb.y = Math.max(orb.r, Math.min(H - orb.r, orb.y));
            orb.vx += (Math.random() - 0.5) * 4;
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
    if (!shouldAnimate()) return;
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

function shouldAnimate() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
reducedMotionQuery.addEventListener?.('change', event => {
    if (event.matches) stopAnimation();
    else startAnimation();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAnimation();
    } else {
        // 仅在 hero 可见时恢复动画，避免后台无谓消耗
        const target = document.querySelector('.hero-side');
        if (target) {
            const rect = target.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight && shouldAnimate()) startAnimation();
        } else if (shouldAnimate()) {
            startAnimation();
        }
    }
});

// ─── 拖拽 ────────────────────────────────────────────────────────
let dragOrb = null;
let dragPointerId = null;

function getPos(e) {
    const r = orbsLayer.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitTest(p) {
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 < o.r * o.r) return o;
    }
    return null;
}

function attachDragEvents() {
    orbsLayer.addEventListener('pointerdown', e => {
        if (dragOrb || (e.pointerType === 'mouse' && e.button !== 0)) return;
        dragOrb = hitTest(getPos(e));
        if (!dragOrb) return;
        dragPointerId = e.pointerId;
        dragOrb.dragging = true;
        orbsLayer.style.cursor = 'grabbing';
        orbsLayer.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    });
    orbsLayer.addEventListener('pointermove', e => {
        if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
        const p = getPos(e);
        if (!dragOrb) { orbsLayer.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
        e.preventDefault();
        dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
        dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
        const idx = orbs.indexOf(dragOrb);
        if (idx >= 0 && orbElements[idx]) {
            orbElements[idx].style.transform = `translate3d(${dragOrb.x - dragOrb.r}px, ${dragOrb.y - dragOrb.r}px, 0)`;
        }
    });
    const finishDrag = e => {
        if (dragPointerId !== null && e?.pointerId !== dragPointerId) return;
        if (dragOrb) {
            dragOrb.dragging = false;
            dragOrb = null;
            renderText();
            saveOrbPositions();
        }
        if (dragPointerId !== null) orbsLayer.releasePointerCapture?.(dragPointerId);
        dragPointerId = null;
        orbsLayer.style.cursor = 'default';
    };
    orbsLayer.addEventListener('pointerup', finishDrag);
    orbsLayer.addEventListener('pointercancel', finishDrag);
    orbsLayer.addEventListener('lostpointercapture', finishDrag);
}

// ─── 初始化 ──────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resize();
        initOrbs();
        graphemes = [];
        graphemeWidths = [];
        createOrbElements();
        renderText();
    }, 200);
});

async function init() {
    orbsLayer = document.getElementById('pretext-orbs');
    if (!orbsLayer) return;
    if (!container) return;
    if (document.fonts?.ready) await document.fonts.ready;
    resize(); initOrbs(); ensureTextMetrics(); createOrbElements(); renderText(); attachDragEvents();
    initVisibilityControl();
}

// ─── 可见性控制：滚动出视口时暂停动画，节省 GPU ───────────────
function initVisibilityControl() {
    const target = document.querySelector('.hero-side');
    if ('IntersectionObserver' in window && target) {
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !document.hidden) {
                    if (shouldAnimate()) startAnimation();
                } else {
                    stopAnimation();
                }
            }
        }, { threshold: 0.01, rootMargin: '50px' });
        observer.observe(target);
    } else if (shouldAnimate()) {
        startAnimation();
    }
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { setTimeout(init, 100); });
} else {
    setTimeout(init, 100);
}

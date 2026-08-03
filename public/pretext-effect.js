const TEXT = `公开仓库围绕计算机视觉、自动驾驶感知、并行计算与公开写作。lane2seq 做实时车道检测，结合 Canny/Hough 变换、CLAHE、HLS 等传统流程与 Lane2Seq-ViT 序列生成模型，并用 ENet 分割在 TuSimple 和 LLAMAS 数据集上训练与验证。GStreamer-SEI 整理 RTSP 推流、自定义 SEI 注入、Carla 多相机管理与 pyinstaller 打包 exe 的完整踩坑记录。auto_calib_v2.0 在 PJLab-ADG/SensorsCalibration 的 lidar2camera 方案上做改进，方便自动驾驶多传感器联合标定。utils 收集常用脚本工具。lanenet-lane-detection 记录车道检测实验的迭代过程。维护多份 gkd 订阅用于广告过滤与规则分享。近期也在看 BEV 感知、Occupancy 估计与端到端自动驾驶方向。`;

const DEFAULT_LINE_HEIGHT = 24;
const ORB_TEXT_GAP = 1;
const MIN_SLOT_WIDTH_BASE = 2.2;

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
    const minimumWidth = fontSize * MIN_SLOT_WIDTH_BASE;
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

    const padding = 16;
    const colStart = padding;
    const colEnd = W - padding;
    const lines = [];
    let graphemeIndex = 0;

    for (let y = lineHeight * 1.5; y + lineHeight < H - 20 && graphemeIndex < graphemes.length; y += lineHeight) {
        const blocked = [];
        for (const orb of orbs) {
            const interval = circleIntervalForBand(orb, y, y + lineHeight);
            if (interval) blocked.push(interval);
        }

        const slots = carveTextLineSlots({ left: colStart, right: colEnd }, blocked);
        for (const slot of slots) {
            while (graphemeIndex < graphemes.length && /^\s$/u.test(graphemes[graphemeIndex])) {
                graphemeIndex++;
            }
            if (graphemeIndex >= graphemes.length) break;

            const slotWidth = slot.right - slot.left;
            const start = graphemeIndex;
            let textWidth = 0;
            // Pack graphemes directly instead of preserving whole words or
            // punctuation clusters, leaving at most one glyph of free space.
            while (graphemeIndex < graphemes.length) {
                const nextWidth = graphemeWidths[graphemeIndex];
                if (textWidth + nextWidth > slotWidth) break;
                textWidth += nextWidth;
                graphemeIndex++;
            }
            if (graphemeIndex === start) continue;
            lines.push({
                left: slot.left,
                top: y,
                text: graphemes.slice(start, graphemeIndex).join(''),
            });
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
// 拖动前小球的 inline transition；拖动期间置为 'none'，结束后恢复原值。
// 动态注入的 transition 会让 transform 按过渡动画渐变，pointermove 已写入
// 新 transform 但 getBoundingClientRect 仍停在旧位置，视觉上小球跟不上指针。
let dragOrbPrevTransition = null;

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
        const dragIdx = orbs.indexOf(dragOrb);
        const dragEl = dragIdx >= 0 ? orbElements[dragIdx] : null;
        if (dragEl) {
            dragOrbPrevTransition = dragEl.style.transition;
            dragEl.style.transition = 'none';
        }
        orbsLayer.style.cursor = 'grabbing';
        orbsLayer.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    });
    orbsLayer.addEventListener('pointermove', e => {
        if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
        const p = getPos(e);
        if (!dragOrb) { orbsLayer.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
        e.preventDefault();
        const prevX = dragOrb.x, prevY = dragOrb.y;
        dragOrb.x = Math.max(dragOrb.r, Math.min(W - dragOrb.r, p.x));
        dragOrb.y = Math.max(dragOrb.r, Math.min(H - dragOrb.r, p.y));
        const idx = orbs.indexOf(dragOrb);
        if (idx >= 0 && orbElements[idx]) {
            orbElements[idx].style.transform = `translate3d(${dragOrb.x - dragOrb.r}px, ${dragOrb.y - dragOrb.r}px, 0)`;
        }
        // 拖动中文字实时让位：坐标一变化就同步重排。
        // 不依赖 rAF 调度——rAF 在后台标签页 / CDP 自动化 / 动画循环停止
        // （prefers-reduced-motion）等环境下会被暂停或节流，导致拖动期间
        // 永远等不到下一帧回调；pointermove 本身按帧率派发，同步调用
        // renderText() 保证 pointerup 之前文字布局一定更新。
        // saveOrbPositions() 同步 lastOrbPositions，避免动画循环重复重排。
        if (dragOrb.x !== prevX || dragOrb.y !== prevY) {
            renderText();
            saveOrbPositions();
        }
    });
    const finishDrag = e => {
        if (dragPointerId !== null && e?.pointerId !== dragPointerId) return;
        if (dragOrb) {
            const dragIdx = orbs.indexOf(dragOrb);
            const dragEl = dragIdx >= 0 ? orbElements[dragIdx] : null;
            if (dragEl && dragOrbPrevTransition !== null) {
                // 恢复原 transition（原值为空字符串即清空 inline transition）
                dragEl.style.transition = dragOrbPrevTransition;
            }
            dragOrbPrevTransition = null;
            dragOrb.dragging = false;
            dragOrb = null;
            renderText();
            saveOrbPositions();
        }
        if (dragPointerId !== null && orbsLayer.hasPointerCapture?.(dragPointerId)) {
            orbsLayer.releasePointerCapture?.(dragPointerId);
        }
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

const TEXT = `基于 GitHub Pages 的个人主页，展示个人简介、公开仓库、Star 项目、博客文章，以及部分公开信息嵌入示例。由 AI 辅助设计与构建。页面结构：index.html 主页，含个人方向、近期关注、文章摘要、Steam 游戏、石蒜模拟器；projects.html 公开仓库展示；stars.html GitHub Stars 展示；articles.html 博客园文章展示；app.js 数据渲染与交互逻辑（API 集成、动画、拖拽）；styles.css 全站样式（含响应式断点）；public/pretext-effect.js 浮动小球动画引擎。技术特性：原生 HTML / CSS / JavaScript，无构建工具；Sakana Widget（石蒜模拟器）集成，支持鼠标/触摸拖拽；浮动小球弹跳动画，边界约束与拖拽；GitHub API 集成（仓库、Stars、个人信息）；Steam 游戏库展示；博客园文章聚合；响应式布局（桌面 / 平板 / 移动端）。本地预览：python -m http.server 8000。校验：node --check app.js。部署：提交到 main 分支后由 GitHub Pages 自动发布。`;

const DEFAULT_LINE_HEIGHT = 24;
// 参照 the-editorial-engine demo：hPad=14 / vPad=4，球周围固定横向/纵向
// 留白，左右两侧的最小间隙相同、观感对称，字距恒定、不随球伸缩。
const ORB_H_PAD = 14;
const ORB_V_PAD = 4;
const MIN_SLOT_WIDTH_BASE = 2.2;
const TEXT_PADDING = 16;

const container = document.getElementById('pretext-output');
let W, H, graphemes = [], graphemeWidths = [], orbs = [];
let lineHeight = DEFAULT_LINE_HEIGHT;
let fontSize = 13;
let baseLetterSpacing = 0;
let orbElements = [];
const lineElements = [];

function splitGraphemes(text) {
    if (typeof Intl.Segmenter === 'function') {
        return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)]
            .map(item => item.segment);
    }
    return Array.from(text);
}

// 逐字形 DOM 精确测量：Canvas measureText 与 DOM 渲染因字体回退差异
// 会有系统性偏差（尤其 CJK），导致两端对齐后文字压到圆球。这里改用
// 隐藏探针逐一测量每个「不同字形」的真实 DOM 宽度并缓存，一次性完成，
// 之后布局与对齐全部基于精确宽度，不再需要每帧 DOM 读取。
const glyphWidthCache = new Map();
let glyphFontKey = '';

function measureGlyphWidths(glyphs, font) {
    const probe = document.createElement('span');
    probe.className = 'pretext-line';
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.top = '0';
    probe.style.letterSpacing = '0';
    container.appendChild(probe);
    for (const glyph of glyphs) {
        probe.textContent = glyph;
        const width = probe.getBoundingClientRect().width;
        if (!(width > 0)) continue;
        glyphWidthCache.set(glyph, width);
    }
    probe.remove();
}

function prepareRenderedText() {
    const probe = document.createElement('span');
    probe.className = 'pretext-line';
    probe.style.visibility = 'hidden';
    probe.textContent = '测W0.';
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
    baseLetterSpacing = Number.parseFloat(style.letterSpacing) || 0;

    graphemes = splitGraphemes(TEXT);
    const uniqueGlyphs = [...new Set(graphemes)];
    if (font !== glyphFontKey) {
        glyphWidthCache.clear();
        glyphFontKey = font;
        measureGlyphWidths(uniqueGlyphs, font);
    } else {
        // 字体未变但可能有未测过的字形（理论不会发生，兜底）
        const missing = uniqueGlyphs.filter(g => !glyphWidthCache.has(g));
        if (missing.length) measureGlyphWidths(missing, font);
    }

    graphemeWidths = graphemes.map(grapheme => {
        const measured = glyphWidthCache.get(grapheme);
        return Math.max(1, (measured || 0) + baseLetterSpacing);
    });
    probe.remove();
}

function ensureTextMetrics() {
    if (!graphemes.length) prepareRenderedText();
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
    const top = bandTop - ORB_V_PAD;
    const bottom = bandBottom + ORB_V_PAD;
    if (top >= orb.y + orb.r || bottom <= orb.y - orb.r) return null;
    const minDy = orb.y >= top && orb.y <= bottom
        ? 0
        : orb.y < top ? top - orb.y : orb.y - bottom;
    if (minDy >= orb.r) return null;
    const halfWidth = Math.sqrt(orb.r * orb.r - minDy * minDy);
    return {
        left: orb.x - halfWidth - ORB_H_PAD,
        right: orb.x + halfWidth + ORB_H_PAD,
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

    const colStart = TEXT_PADDING;
    const colEnd = W - TEXT_PADDING;
    const textTop = lineHeight * 1.5;
    const textBottom = H - 20;
    const lines = [];
    let graphemeIndex = 0;

    for (let y = textTop; y + lineHeight < textBottom && graphemeIndex < graphemes.length; y += lineHeight) {
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
            // 参照 demo：行统一左对齐、左缘贴列边，字距恒定，不随球移动
            // 额外调整。球两侧由 ORB_H_PAD 保证固定最小间隙，观感对称。
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

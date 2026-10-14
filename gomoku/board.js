/**
 * 五子棋棋盘渲染 + 特效（Canvas）
 * 现代深色主题 + 棋型高亮 + 胜利动画
 */
const GomokuBoard = (() => {
  // ── 渲染缓存：避免每帧重复计算 ──
  let _cachedSize = null;     // 缓存 getBoundingClientRect 结果
  let _cachedSizeTime = 0;    // 上次缓存时间
  let _bgGradient = null;     // 缓存背景渐变
  let _bgGradientKey = '';    // 渐变缓存键（颜色+高度）
  let _cellIndexMap = null;   // 落子序号索引 Map（x,y → index），避免 O(n²) 查找
  let _cellIndexMapLen = 0;   // 上次构建时的 moveHistory 长度
  let _dirty = true;          // 脏标记：有状态变化才重绘
  let _animating = false;     // 有动画在播（粒子/彩带/弹入/脉冲）才持续渲染
  let _staticFrame = null;    // 静态帧计数：连续 N 帧无变化后暂停 rAF

  // 主题色
  const COLORS = {
    // 「棋院·夜」星夜·极光 —— 与 Godot 版 gomoku.gd 同源配色
    bgTop: '#0a0d18',          // 深空蓝黑（顶部）
    bgBottom: '#151b30',       // 蓝炭（底部）
    particle: '#4a7dd6',       // 背景漂浮光点（电光蓝）
    board: '#27314d',          // 深板岩棋盘
    boardEdge: '#3f5788',      // 棋盘外框（蓝钢）
    grid: '#3f5788',
    star: '#6f8fd0',
    coordText: '#6f86a8',
    black: '#0c0f16',          // 墨黑
    blackDark: '#05070c',
    blackCore: '#0a0908',
    blackRim: '#44536f',
    white: '#e9edf6',          // 瓷白
    whiteDark: 'rgba(184,196,216,0.5)',
    whiteRim: 'rgba(143,163,192,0.5)',
    whiteGloss: '#ffffff',
    shadow: 'rgba(0,0,0,0.4)',
    cyan: '#38bdf8',           // 电光青（主强调）
    magenta: '#a78bfa',        // 紫罗兰（次强调）
    gold: '#fbbf24',           // 琥珀金
    green: '#34d399',          // 翠绿（胜利）
    lastMove: '#38bdf8',
    winLine: '#34d399',
    threatRed: '#f87171',
  };

  let canvas, ctx;
  let boardData = null;      // 15x15 数组 0/1/2
  let lastMove = null;       // {x, y}
  let winningCells = [];     // [{x,y}]
  let threatCells = [];      // [{x,y}] 制胜棋型
  let threatType = '';       // open_four/double_four/four_three/double_three
  let attackCells = [];      // [{x,y}] 进攻棋型（延迟显示）
  let attackType = '';
  let attackTime = 0;        // performance.now() 毫秒
  let fxTime = 0;
  let cellSize = 40;
  let padding = 48;
  let moveHistory = [];      // 落子历史（用于序号）
  let showCoord = true;      // 显示坐标
  let showIndex = false;     // 显示落子序号
  let themeIndex = 0;        // 主题 0深色/1木质/2浅色
  let realtimeBest = null;   // {x,y} 思考中引擎当前最佳候选点
  let realtimeLost = [];     // [{x,y}] 思考中引擎已排除的点
  let forbidCells = [];      // [{x,y}] 禁手点（有禁手规则）

  // ── 与 Godot 版同步：背景光点 / 彩带 / 悬停幽灵子 / 落子弹入 ──
  let particles = [];        // 背景漂浮光点
  let confetti = [];         // 胜利彩带
  let hoverCell = null;      // 鼠标悬停格
  let turnPlayer = 1;        // 当前执子方（幽灵子颜色）
  let locked = false;        // AI 思考中 / 已分胜负（禁用悬停预览）
  let placeFx = -1;          // 最近落子的特效时钟
  let placeCell = null;      // 最近落子格
  let _prevLast = null;
  let _prevWinCount = 0;

  function getLogicalSize() {
    // 逻辑尺寸（CSS 像素）：canvas 已按 DPR 放大物理像素并用 ctx.setTransform 缩放，
    // 所有绘制/换算都应使用逻辑尺寸（= CSS 尺寸）。
    // 缓存 500ms：getBoundingClientRect 会强制 layout，每帧多次调用开销大。
    const now = performance.now();
    if (_cachedSize && now - _cachedSizeTime < 500) return _cachedSize;
    const rect = canvas.getBoundingClientRect();
    _cachedSize = { w: rect.width, h: rect.height };
    _cachedSizeTime = now;
    return _cachedSize;
  }

  // 强制刷新尺寸缓存（resize 时调用）
  function invalidateSize() { _cachedSize = null; }

  function init(canvasEl, size = 15) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    padding = 48;
    resize(size);
    spawnParticles();

    // 悬停幽灵棋子预览（对齐 Godot 版 _draw_hover）
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const c = screenToCell(e.clientX - rect.left, e.clientY - rect.top);
      const next = (c && boardData && boardData[c.y][c.x] === 0) ? c : null;
      const changed = (!next && hoverCell) ||
        (next && (!hoverCell || next.x !== hoverCell.x || next.y !== hoverCell.y));
      if (changed) { hoverCell = next; _dirty = true; }
    });
    canvas.addEventListener('pointerleave', () => { if (hoverCell) { hoverCell = null; _dirty = true; } });
  }

  // 背景漂浮光点（对应 Godot _spawn_bg_particles：40 颗电光蓝，缓慢上浮 + 呼吸闪烁）
  function spawnParticles() {
    const { w, h } = getLogicalSize();
    particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 12 - 6) / 60,
        vy: -(4 + Math.random() * 10) / 60,
        r: 1.0 + Math.random() * 1.4,
        alpha: 0.05 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // 胜利彩带（对应 Godot _spawn_confetti：金/青/紫/绿/红小色块飘落）
  function spawnConfetti() {
    const { w } = getLogicalSize();
    confetti = [];
    const cols = [COLORS.gold, COLORS.cyan, COLORS.magenta, COLORS.green, '#f87171'];
    for (let i = 0; i < 120; i++) {
      confetti.push({
        x: Math.random() * w,
        y: -Math.random() * 160 - 10,
        vx: (Math.random() * 72 - 36) / 60,
        vy: (40 + Math.random() * 70) / 60,
        g: (140 + Math.random() * 80) / 3600,
        size: 5 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() * 8 - 4) / 60,
        color: cols[i % cols.length],
      });
    }
  }

  function resize(size = 15) {
    if (!canvas) return;
    invalidateSize(); // 强制刷新缓存
    const { w, h } = getLogicalSize();
    cellSize = Math.min(
      (w - 2 * padding) / (size - 1),
      (h - 2 * padding) / (size - 1)
    );
    _bgGradient = null; // 高度可能变了，重建渐变
    _dirty = true;
  }

  function setBoard(b, last, winning, threat, ttype, atkCells, atkType, atkTime, rtBest, rtLost, forbid) {
    boardData = b;
    // 最近落子变化 → 记录弹入动画起点；胜利线首次出现 → 撒彩带（与 Godot 版一致）
    if (last && (!_prevLast || _prevLast.x !== last.x || _prevLast.y !== last.y)) {
      placeCell = last;
      placeFx = fxTime;
      _dirty = true;
    }
    _prevLast = last;
    if (winning && winning.length > 0 && _prevWinCount === 0) spawnConfetti();
    _prevWinCount = winning ? winning.length : 0;
    lastMove = last;
    winningCells = winning;
    threatCells = threat;
    threatType = ttype;
    attackCells = atkCells || [];
    attackType = atkType || '';
    attackTime = atkTime || 0;
    realtimeBest = rtBest || null;
    realtimeLost = rtLost || [];
    forbidCells = forbid || [];
    _dirty = true;
  }

  // 设置落子历史（用于序号显示）
  function setMoveHistory(history) {
    moveHistory = history || [];
    // 延迟重建索引（在 drawStones 用到时才建）
    _cellIndexMap = null;
  }

  // 构建 x,y → 序号的索引 Map（O(n) 一次，后续 O(1) 查找）
  function _getCellIndexMap() {
    if (_cellIndexMap && _cellIndexMapLen === moveHistory.length) return _cellIndexMap;
    _cellIndexMap = new Map();
    for (let i = 0; i < moveHistory.length; i++) {
      const m = moveHistory[i];
      if (m) _cellIndexMap.set(m.x + ',' + m.y, i + 1);
    }
    _cellIndexMapLen = moveHistory.length;
    return _cellIndexMap;
  }

  // 主题切换
  const THEMES = [
    { bgTop: '#0a0d18', bgBottom: '#151b30', board: '#27314d', grid: '#3f5788', star: '#6f8fd0', black: '#0c0f16', white: '#e9edf6' },
    { bgTop: '#2a1f14', bgBottom: '#1a120b', board: '#d4a156', grid: '#5b371b', star: '#3b2410', black: '#1f1f1f', white: '#f5efe2' },
    { bgTop: '#e8ecf3', bgBottom: '#d5dbe6', board: '#c9b28a', grid: '#6b5b3e', star: '#4a3d28', black: '#1a1a1a', white: '#ffffff' },
  ];
  function setTheme(idx) {
    themeIndex = idx;
    const t = THEMES[idx];
    if (!t) return;
    COLORS.bgTop = t.bgTop;
    COLORS.bgBottom = t.bgBottom;
    COLORS.board = t.board;
    COLORS.grid = t.grid;
    COLORS.star = t.star;
    COLORS.black = t.black;
    COLORS.white = t.white;
    _bgGradient = null; // 强制重建渐变缓存
    _dirty = true;
  }

  function setShowCoord(v) { showCoord = v; _dirty = true; }
  function setShowIndex(v) { showIndex = v; _dirty = true; }
  function setTurn(p) { turnPlayer = p; _dirty = true; }
  function setLocked(v) { locked = v; _dirty = true; }

  function cellToScreen(cell) {
    return { x: padding + cell.x * cellSize, y: padding + cell.y * cellSize };
  }

  // 判断当前是否有活跃动画需要持续渲染
  function hasActiveAnimation() {
    if (confetti.length > 0) return true;                          // 彩带
    if (placeFx >= 0 && (fxTime - placeFx) < 0.35) return true;    // 落子弹入
    if (particles.length > 0) return true;                         // 背景粒子
    if (realtimeBest) return true;                                 // AI 思考脉冲
    if (threatCells && threatCells.length > 0) return true;        // 威胁高亮脉冲
    if (attackCells && attackCells.length > 0 &&
        performance.now() - attackTime >= 2500 &&
        performance.now() - attackTime < 15000) return true;       // 进攻特效（有限时）
    if (winningCells && winningCells.length > 0) return true;      // 胜利光晕脉冲
    if (lastMove) return true;                                     // 最后落子脉冲
    return false;
  }

  function render(dt) {
    fxTime += dt;
    // 无变化且无动画时跳过绘制（省电省 CPU）
    if (!_dirty && !hasActiveAnimation()) {
      return false; // 通知调用者本帧未绘制
    }
    _dirty = false;
    drawBackground(dt);
    drawBoard();
    drawStones();
    drawHover();
    drawForbid();
    drawRealtime();
    drawAttack();
    drawThreatHighlight();
    drawOverlays();
    drawWinGlow();
    drawConfetti(dt);
    return true;
  }

  // 标记需要重绘（悬停等纯视觉变化时调用）
  function markDirty() { _dirty = true; }

  function drawBackground(dt) {
    const { w, h } = getLogicalSize();
    // 缓存渐变对象：颜色或高度变化时才重建
    const gk = COLORS.bgTop + '|' + COLORS.bgBottom + '|' + h;
    if (gk !== _bgGradientKey || !_bgGradient) {
      _bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      _bgGradient.addColorStop(0, COLORS.bgTop);
      _bgGradient.addColorStop(1, COLORS.bgBottom);
      _bgGradientKey = gk;
    }
    ctx.fillStyle = _bgGradient;
    ctx.fillRect(0, 0, w, h);

    // 漂浮光点（缓慢上浮 + 正弦呼吸，对应 Godot _draw_background）
    if (dt > 0) {
      for (const p of particles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
      }
    }
    for (const p of particles) {
      const glow = 0.5 + 0.5 * Math.sin(fxTime * 0.8 + p.phase);
      ctx.globalAlpha = p.alpha * (0.4 + 0.6 * glow);
      ctx.fillStyle = COLORS.particle;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBoard() {
    const n = boardData ? boardData.length : 15;
    const span = cellSize * (n - 1);
    const bx = padding - cellSize / 2;
    const by = padding - cellSize / 2;
    const bw = span + cellSize;

    // 外发光：电光青薄晕（对应 Godot draw_rect(grow 6, 青 0.08)）
    ctx.fillStyle = 'rgba(56,189,248,0.08)';
    ctx.fillRect(bx - 6, by - 6, bw + 12, bw + 12);

    // 底板 + 蓝钢边框
    ctx.fillStyle = COLORS.board;
    ctx.fillRect(bx, by, bw, bw);
    ctx.strokeStyle = COLORS.boardEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bw);

    // 网格线
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const off = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(padding + off, padding);
      ctx.lineTo(padding + off, padding + span);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, padding + off);
      ctx.lineTo(padding + span, padding + off);
      ctx.stroke();
    }

    // 星位（按棋盘大小动态计算）
    const stars = [];
    if (n >= 7) {
      const starPad = Math.floor(n / 5);
      const starCenter = Math.floor(n / 2);
      const far = n - 1 - starPad;
      stars.push([starPad, starPad], [far, starPad], [starPad, far], [far, far], [starCenter, starCenter]);
    }
    ctx.fillStyle = COLORS.star;
    for (const [sx, sy] of stars) {
      const p = cellToScreen({ x: sx, y: sy });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 坐标标注
    if (showCoord) {
      ctx.fillStyle = COLORS.coordText;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const letter = String.fromCharCode(65 + i);
        ctx.fillText(letter, padding + i * cellSize, padding - 20);
        ctx.fillText(String(i + 1), padding - 24, padding + i * cellSize);
      }
    }
  }

  function drawStones() {
    if (!boardData) return;
    const n = boardData.length;

    // 最近落子弹入动画（0.35s，0.4 → 1.0 ease-out cubic，同 Godot）
    let bounce = 1;
    if (placeFx >= 0 && placeCell) {
      const age = fxTime - placeFx;
      if (age < 0.35) {
        const t = age / 0.35;
        bounce = 0.4 + 0.6 * (1 - Math.pow(1 - t, 3));
      }
    }

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = boardData[y][x];
        if (v === 0) continue;
        const p = cellToScreen({ x, y });
        const isLast = placeCell && placeCell.x === x && placeCell.y === y && bounce < 1;
        const k = isLast ? bounce : 1;
        const r = cellSize * 0.42 * k;

        // 投影
        ctx.fillStyle = COLORS.shadow;
        ctx.beginPath();
        ctx.arc(p.x + 2.5 * k, p.y + 3 * k, r, 0, Math.PI * 2);
        ctx.fill();

        if (v === 1) {
          // 黑棋：墨黑主体 → 内芯深黑（右下偏移）→ 受光弧 + 细描边 + 小高光（Godot 同款层叠）
          ctx.fillStyle = COLORS.black;
          circleFill(p.x, p.y, r);
          ctx.fillStyle = COLORS.blackDark;
          circleFill(p.x + 2 * k, p.y + 3 * k, r * 0.70);
          ctx.fillStyle = COLORS.blackCore;
          circleFill(p.x + 1 * k, p.y + 2 * k, r * 0.42);
          ctx.strokeStyle = COLORS.blackRim;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, r - 1), 0, Math.PI * 2);
          ctx.stroke();
          // 顶部受光弧
          ctx.strokeStyle = 'rgba(90,107,140,0.25)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.86, -2.6, -0.9);
          ctx.stroke();
          // 小而柔和的高光点
          ctx.fillStyle = 'rgba(255,255,255,0.30)';
          circleFill(p.x - 4 * k, p.y - 5 * k, r * 0.14);
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          circleFill(p.x - 3 * k, p.y - 4 * k, r * 0.07);
        } else {
          // 白棋：瓷白主体 → 右下暖暗面 → 冷灰轮廓 → 大高光
          ctx.fillStyle = COLORS.white;
          circleFill(p.x, p.y, r);
          ctx.fillStyle = COLORS.whiteDark;
          circleFill(p.x + 2 * k, p.y + 3 * k, r * 0.78);
          ctx.strokeStyle = COLORS.whiteRim;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.1, r - 1), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          circleFill(p.x - 4 * k, p.y - 5 * k, r * 0.30);
        }

        // 落子序号（用预建索引 O(1) 查找，替代 findIndex O(n)）
        if (showIndex) {
          const idx = _getCellIndexMap().get(x + ',' + y) || 0;
          if (idx > 0) {
            ctx.fillStyle = v === 1 ? '#ffffff' : '#1f2937';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(idx), p.x, p.y + 1);
          }
        }
      }
    }
  }

  // 实心圆小工具
  const TWO_PI = Math.PI * 2;
  function circleFill(cx, cy, cr) {
    if (cr <= 0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TWO_PI);
    ctx.fill();
  }

  // 悬停幽灵棋子（半透明 + 电光青描边，对应 Godot _draw_hover）
  function drawHover() {
    if (!hoverCell || locked || !boardData) return;
    if (winningCells && winningCells.length > 0) return;
    const p = cellToScreen(hoverCell);
    const r = cellSize * 0.42;
    const col = turnPlayer === 1 ? COLORS.black : COLORS.white;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = col;
    circleFill(p.x, p.y, r);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(56,189,248,0.65)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 胜利彩带（旋转小色块下落，对应 Godot _update_particles/_draw_confetti）
  function drawConfetti(dt) {
    if (confetti.length === 0) return;
    const { h } = getLogicalSize();
    const kept = [];
    for (const c of confetti) {
      if (dt > 0) {
        c.vy += c.g * dt * 60;
        c.x += c.vx * dt * 60;
        c.y += c.vy * dt * 60;
        c.rot += c.spin * dt * 60;
      }
      if (c.y < h + 20) kept.push(c);
      const hw = c.size * 0.5, hh = c.size * 0.25;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.restore();
    }
    confetti = kept;
  }
  function drawForbid() {
    if (!forbidCells || forbidCells.length === 0) return;
    for (const c of forbidCells) {
      const p = cellToScreen(c);
      const r = cellSize * 0.32;
      ctx.strokeStyle = COLORS.threatRed;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y - r);
      ctx.lineTo(p.x + r, p.y + r);
      ctx.moveTo(p.x + r, p.y - r);
      ctx.lineTo(p.x - r, p.y + r);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawRealtime() {
    // 思考中引擎当前最佳候选点（金色脉冲环）
    if (realtimeBest) {
      const p = cellToScreen(realtimeBest);
      const pulse = 0.5 + 0.5 * Math.sin(fxTime * 8);
      ctx.strokeStyle = COLORS.gold;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, cellSize * 0.42 + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 引擎已排除的点（暗红小点）
    if (realtimeLost && realtimeLost.length > 0) {
      ctx.fillStyle = 'rgba(248,113,113,0.45)';
      for (const c of realtimeLost) {
        const p = cellToScreen(c);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawThreatHighlight() {
    if (!threatCells || threatCells.length === 0) return;
    let color = COLORS.threatRed;
    if (threatType === 'open_four') color = COLORS.gold;
    else if (threatType === 'double_four') color = COLORS.threatRed;
    else if (threatType === 'four_three') color = COLORS.threatRed;
    else if (threatType === 'double_three') color = '#fb923c';

    const pulse = 0.5 + 0.5 * Math.sin(fxTime * 6);
    for (const c of threatCells) {
      const p = cellToScreen(c);
      const r = cellSize * 0.42 + 3 + pulse * 4;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 进攻棋型（活三/冲四）延迟几秒后显示不明显的特效
  function drawAttack() {
    if (!attackCells || attackCells.length === 0) return;
    if (performance.now() - attackTime < 2500) return;
    const color = attackType === 'rushed_four' ? COLORS.magenta : COLORS.cyan;
    const pulse = 0.5 + 0.5 * Math.sin(fxTime * 3);
    for (const c of attackCells) {
      const p = cellToScreen(c);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.22 + 0.1 * pulse;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, cellSize * 0.42 + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawOverlays() {
    // 最后落子标记：小电光青点 + 细白环（对应 Godot _draw_overlays）
    if (lastMove) {
      const p = cellToScreen(lastMove);
      const pulse = 1 + 0.15 * Math.sin(fxTime * 5);
      ctx.fillStyle = COLORS.lastMove;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 胜利连线
    if (winningCells && winningCells.length >= 2) {
      const s = cellToScreen(winningCells[0]);
      const e = cellToScreen(winningCells[winningCells.length - 1]);
      ctx.strokeStyle = 'rgba(52,211,153,0.4)';
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.strokeStyle = COLORS.winLine;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      for (const p of [s, e]) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawWinGlow() {
    if (!winningCells || winningCells.length === 0) return;
    const alpha = 0.04 + 0.03 * Math.sin(fxTime * 2);
    const { w, h } = getLogicalSize();
    ctx.fillStyle = `rgba(52,211,153,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  function screenToCell(mx, my) {
    const n = boardData ? boardData.length : 15;
    const min = padding - cellSize / 2;
    const max = padding + cellSize * (n - 1) + cellSize / 2;
    if (mx < min || my < min || mx > max || my > max) return null;
    const x = Math.round((mx - padding) / cellSize);
    const y = Math.round((my - padding) / cellSize);
    if (x < 0 || y < 0 || x >= n || y >= n) return null;
    // 用平方距离代替 Math.hypot（避免开平方开销）
    const p = cellToScreen({ x, y });
    const ddx = mx - p.x, ddy = my - p.y;
    const maxDist = cellSize * 0.45;
    if (ddx * ddx + ddy * ddy > maxDist * maxDist) return null;
    return { x, y };
  }

  return { init, resize, setBoard, render, screenToCell, COLORS, cellToScreen, setTheme, setShowCoord, setShowIndex, setMoveHistory, setTurn, setLocked, markDirty, invalidateSize };
})();
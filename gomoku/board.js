/**
 * 五子棋棋盘渲染 + 特效（Canvas）
 * 现代深色主题 + 棋型高亮 + 胜利动画
 */
const GomokuBoard = (() => {
  // 主题色
  const COLORS = {
    bgTop: '#0b1120',
    bgBottom: '#1e1b2e',
    board: '#141a2c',
    boardEdge: '#2a3654',
    grid: '#3b4a6b',
    star: '#5b6b8c',
    black: '#2b3242',
    blackDark: '#161b26',
    blackGloss: '#8a9bb8',
    blackEdge: '#5a6a85',
    white: '#eef2ff',
    whiteGloss: '#ffffff',
    shadow: 'rgba(0,0,0,0.45)',
    cyan: '#22d3ee',
    magenta: '#e879f9',
    gold: '#fbbf24',
    green: '#34d399',
    lastMove: '#f472b6',
    winLine: '#34d399',
    threatRed: '#f87171',
  };

  let canvas, ctx;
  let boardData = null;      // 15x15 数组 0/1/2
  let lastMove = null;       // {x, y}
  let winningCells = [];     // [{x,y}]
  let threatCells = [];      // [{x,y}]
  let threatType = '';       // open_three/open_four/rushed_four/four_three
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

  function getLogicalSize() {
    // 逻辑尺寸（CSS 像素）：canvas 已按 DPR 放大物理像素并用 ctx.setTransform 缩放，
    // 所有绘制/换算都应使用逻辑尺寸（= CSS 尺寸）
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function init(canvasEl, size = 15) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    padding = 48;
    resize(size);
  }

  function resize(size = 15) {
    if (!canvas) return;
    const { w, h } = getLogicalSize();
    cellSize = Math.min(
      (w - 2 * padding) / (size - 1),
      (h - 2 * padding) / (size - 1)
    );
  }

  function setBoard(b, last, winning, threat, ttype, rtBest, rtLost, forbid) {
    boardData = b;
    lastMove = last;
    winningCells = winning;
    threatCells = threat;
    threatType = ttype;
    realtimeBest = rtBest || null;
    realtimeLost = rtLost || [];
    forbidCells = forbid || [];
  }

  // 设置落子历史（用于序号显示）
  function setMoveHistory(history) {
    moveHistory = history || [];
  }

  // 主题切换
  const THEMES = [
    { bgTop: '#0b1120', bgBottom: '#1e1b2e', board: '#141a2c', grid: '#3b4a6b', star: '#5b6b8c', black: '#2b3242', white: '#eef2ff' },
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
  }

  function setShowCoord(v) { showCoord = v; }
  function setShowIndex(v) { showIndex = v; }

  function cellToScreen(cell) {
    return { x: padding + cell.x * cellSize, y: padding + cell.y * cellSize };
  }

  function render(dt) {
    fxTime += dt;
    drawBackground();
    drawBoard();
    drawStones();
    drawForbid();
    drawRealtime();
    drawThreatHighlight();
    drawOverlays();
    drawWinGlow();
  }

  function drawBackground() {
    const { w, h } = getLogicalSize();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, COLORS.bgTop);
    grad.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawBoard() {
    const n = boardData ? boardData.length : 15;
    const span = cellSize * (n - 1);
    const bx = padding - cellSize / 2;
    const by = padding - cellSize / 2;
    const bw = span + cellSize;

    // 外发光
    ctx.save();
    ctx.shadowColor = 'rgba(34,211,238,0.15)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLORS.board;
    ctx.fillRect(bx, by, bw, bw);
    ctx.restore();

    // 边框
    ctx.strokeStyle = COLORS.boardEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bw);

    // 网格线
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1.2;
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
      ctx.fillStyle = '#7d8aa8';
      ctx.font = '11px monospace';
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
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = boardData[y][x];
        if (v === 0) continue;
        const p = cellToScreen({ x, y });
        const r = cellSize * 0.42;

        // 阴影
        ctx.fillStyle = COLORS.shadow;
        ctx.beginPath();
        ctx.arc(p.x + 2.5, p.y + 3, r, 0, Math.PI * 2);
        ctx.fill();

        if (v === 1) {
          // 黑棋：炭蓝灰主体 + 浅灰蓝描边 + 底部暗面 + 顶部高光，与深色背景明显区分
          const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.15, p.x, p.y, r);
          g.addColorStop(0, COLORS.blackGloss);
          g.addColorStop(0.4, COLORS.black);
          g.addColorStop(1, COLORS.blackDark);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          // 浅灰蓝描边，让轮廓从深色背景跳出
          ctx.strokeStyle = COLORS.blackEdge;
          ctx.lineWidth = 1.6;
          ctx.stroke();
          // 顶部高光
          ctx.fillStyle = COLORS.blackGloss;
          ctx.beginPath();
          ctx.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(p.x - r * 0.2, p.y - r * 0.28, r * 0.14, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 白棋
          const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.7, COLORS.white);
          g.addColorStop(1, '#b6c0d8');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(232,121,249,0.25)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // 高光
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(p.x - r * 0.25, p.y - r * 0.3, r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }

        // 落子序号
        if (showIndex) {
          const idx = moveHistory.findIndex(m => m && m.x === x && m.y === y) + 1;
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
    let color = COLORS.magenta;
    if (threatType === 'open_four') color = COLORS.gold;
    else if (threatType === 'rushed_four') color = COLORS.magenta;
    else if (threatType === 'four_three') color = COLORS.threatRed;
    else if (threatType === 'open_three') color = COLORS.cyan;

    const pulse = 0.5 + 0.5 * Math.sin(fxTime * 6);
    for (const c of threatCells) {
      const p = cellToScreen(c);
      const r = cellSize * 0.42 + 3 + pulse * 4;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2.5;
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

  function drawOverlays() {
    // 最后落子标记
    if (lastMove) {
      const p = cellToScreen(lastMove);
      const pulse = 1 + 0.3 * Math.sin(fxTime * 5);
      ctx.fillStyle = COLORS.lastMove;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
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
    const p = cellToScreen({ x, y });
    if (Math.hypot(mx - p.x, my - p.y) > cellSize * 0.45) return null;
    return { x, y };
  }

  return { init, resize, setBoard, render, screenToCell, COLORS, cellToScreen, setTheme, setShowCoord, setShowIndex, setMoveHistory };
})();

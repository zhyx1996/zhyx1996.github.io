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
    black: '#0f1420',
    blackGloss: '#3b4a6b',
    white: '#eef2ff',
    whiteGloss: '#ffffff',
    shadow: 'rgba(0,0,0,0.35)',
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

  function init(canvasEl, size = 15) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    cellSize = Math.min(
      (canvas.width - 2 * padding) / (size - 1),
      (canvas.height - 2 * padding) / (size - 1)
    );
    // 保持 padding 与格子对齐
    padding = 48;
    resize(size);
  }

  function resize(size = 15) {
    if (!canvas) return;
    cellSize = Math.min(
      (canvas.width - 2 * padding) / (size - 1),
      (canvas.height - 2 * padding) / (size - 1)
    );
  }

  function setBoard(b, last, winning, threat, ttype) {
    boardData = b;
    lastMove = last;
    winningCells = winning;
    threatCells = threat;
    threatType = ttype;
  }

  function cellToScreen(cell) {
    return { x: padding + cell.x * cellSize, y: padding + cell.y * cellSize };
  }

  function render(dt) {
    fxTime += dt;
    drawBackground();
    drawBoard();
    drawStones();
    drawThreatHighlight();
    drawOverlays();
    drawWinGlow();
  }

  function drawBackground() {
    const w = canvas.width, h = canvas.height;
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

    // 星位
    const stars = n === 15
      ? [[3,3],[11,3],[7,7],[3,11],[11,11]]
      : [[Math.floor(n/2), Math.floor(n/2)]];
    ctx.fillStyle = COLORS.star;
    for (const [sx, sy] of stars) {
      const p = cellToScreen({ x: sx, y: sy });
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
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
          // 黑棋
          const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
          g.addColorStop(0, '#2a3654');
          g.addColorStop(0.5, COLORS.black);
          g.addColorStop(1, '#05070d');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          // 高光
          ctx.fillStyle = 'rgba(59,74,107,0.5)';
          ctx.beginPath();
          ctx.arc(p.x - r * 0.25, p.y - r * 0.3, r * 0.32, 0, Math.PI * 2);
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
    ctx.fillStyle = `rgba(52,211,153,${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  return { init, resize, setBoard, render, screenToCell, COLORS, cellToScreen };
})();

/**
 * 五子棋游戏主逻辑：整合引擎、棋盘、棋型检测、AI 对战
 */
const GomokuGame = (() => {
  const N = 15;
  const DIRS = [[1,0],[0,1],[1,1],[1,-1]];

  // 游戏状态
  let board = [];
  let currentPlayer = 1;   // 1=黑 2=白
  let winner = 0;          // 0/1/2/3(平)
  let moveCount = 0;
  let lastMove = null;
  let winningCells = [];
  let threatCells = [];
  let threatType = '';
  let aiThinking = false;

  // 配置
  let mode = 'pve';         // pve | pvp
  let humanColor = 1;       // 1=黑 2=白
  let aiDifficulty = 'medium'; // easy/medium/hard
  let engineReady = false;
  let enginePath = '/gomoku/build/';

  // 回调
  let onStateChange = null;

  const DIFFICULTY = {
    easy:   { strength: 30, timeout: 500 },
    medium: { strength: 70, timeout: 1500 },
    hard:   { strength: 100, timeout: 4000 },
  };

  function init(cb) {
    onStateChange = cb;
    resetBoard();
  }

  function resetBoard() {
    board = Array.from({ length: N }, () => Array(N).fill(0));
    currentPlayer = 1;
    winner = 0;
    moveCount = 0;
    lastMove = null;
    winningCells = [];
    threatCells = [];
    threatType = '';
    aiThinking = false;
    notify();
  }

  function notify() {
    if (onStateChange) onStateChange(getState());
  }

  function getState() {
    return {
      board, currentPlayer, winner, moveCount, lastMove, winningCells,
      threatCells, threatType, aiThinking, mode, humanColor, aiDifficulty, engineReady,
    };
  }

  // 启动引擎
  async function startEngine() {
    const path = enginePath;
    return new Promise((resolve) => {
      GomokuEngine.init((r) => {
        if (r.ok) {
          engineReady = true;
          sendInfo();
          notify();
          resolve(true);
        } else if (r.pos) {
          onEngineMove(r.pos);
        } else if (r.error) {
          console.error('[engine error]', r.error);
          resolve(false);
        } else if (r.msg) {
          console.log('[engine]', r.msg);
        } else if (r.bestline || r.depth || r.eval || r.winrate) {
          // 分析信息（用于分析面板，暂存）
          if (r.bestline) window.__lastBestline = r.bestline;
          if (r.depth) window.__lastDepth = r.depth;
          if (r.eval !== undefined) window.__lastEval = r.eval;
          if (r.winrate !== undefined) window.__lastWinrate = r.winrate;
          if (onAnalysisUpdate) onAnalysisUpdate();
        }
      }, path);
    });
  }

  function sendInfo() {
    const d = DIFFICULTY[aiDifficulty];
    GomokuEngine.sendCommand('INFO RULE 0');          // 无禁手
    GomokuEngine.sendCommand('INFO STRENGTH ' + d.strength);
    GomokuEngine.sendCommand('INFO TIMEOUT_TURN ' + d.timeout);
    GomokuEngine.sendCommand('INFO SHOW_DETAIL 2');
    GomokuEngine.sendCommand('INFO MAX_DEPTH 100');
  }

  function sendBoard(immediateThink) {
    let cmd = immediateThink ? 'BOARD' : 'YXBOARD';
    // 收集所有棋子，按落子顺序（这里用棋盘扫描，side 交替）
    const moves = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (board[y][x] !== 0) moves.push([x, y, board[y][x]]);
    // side: 1=self 2=oppo，AI 执 aiColor
    const aiColor = 3 - humanColor;
    for (const [x, y, c] of moves) {
      const side = c === aiColor ? 1 : 2;
      cmd += ` ${x},${y},${side}`;
    }
    cmd += ' DONE';
    GomokuEngine.sendCommand(cmd);
  }

  function startNewGame() {
    resetBoard();
    if (mode === 'pve') {
      GomokuEngine.sendCommand('START ' + N);
      sendInfo();
      // AI 先手
      if (humanColor === 2) {
        aiThinking = true;
        notify();
        GomokuEngine.sendCommand('BEGIN');
      } else {
        notify();
      }
    } else {
      notify();
    }
  }

  function onEngineMove(pos) {
    aiThinking = false;
    if (winner !== 0) return;
    if (!pos || pos[0] < 0 || pos[1] < 0) return;
    const x = pos[0], y = pos[1];
    if (board[y][x] !== 0) return;
    placeStone(x, y);
  }

  // 玩家点击落子
  function playerClick(x, y) {
    if (winner !== 0) return false;
    if (mode === 'pve') {
      if (aiThinking || currentPlayer !== humanColor) return false;
    }
    if (board[y][x] !== 0) return false;
    placeStone(x, y);
    return true;
  }

  function placeStone(x, y) {
    board[y][x] = currentPlayer;
    lastMove = { x, y };
    moveCount++;

    const five = checkFive(x, y, currentPlayer);
    if (five) {
      winner = currentPlayer;
      winningCells = five;
      threatCells = [];
      threatType = '';
    } else if (moveCount >= N * N) {
      winner = 3;
    } else {
      const prev = currentPlayer;
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      detectThreat(x, y, prev);
    }

    notify();

    // AI 回合
    if (winner === 0 && mode === 'pve' && currentPlayer === (3 - humanColor)) {
      aiThinking = true;
      notify();
      // 用 BOARD 命令同步局面让 AI 思考
      setTimeout(() => {
        sendBoard(false);
        GomokuEngine.sendCommand('YXNBEST 1');
      }, 50);
    }
  }

  function checkFive(x, y, p) {
    for (const [dx, dy] of DIRS) {
      const line = [{ x, y }];
      let cx = x + dx, cy = y + dy;
      while (inBoard(cx, cy) && board[cy][cx] === p) { line.push({ x: cx, y: cy }); cx += dx; cy += dy; }
      cx = x - dx; cy = y - dy;
      while (inBoard(cx, cy) && board[cy][cx] === p) { line.unshift({ x: cx, y: cy }); cx -= dx; cy -= dy; }
      if (line.length >= 5) return line;
    }
    return null;
  }

  function countLine(x, y, dx, dy, p) {
    let total = 1, open = 0;
    let cx = x + dx, cy = y + dy;
    while (inBoard(cx, cy) && board[cy][cx] === p) { total++; cx += dx; cy += dy; }
    if (inBoard(cx, cy) && board[cy][cx] === 0) open++;
    cx = x - dx; cy = y - dy;
    while (inBoard(cx, cy) && board[cy][cx] === p) { total++; cx -= dx; cy -= dy; }
    if (inBoard(cx, cy) && board[cy][cx] === 0) open++;
    return { total, open };
  }

  function detectThreat(x, y, p) {
    let openFour = false, rushedFour = false, openThree = false;
    for (const [dx, dy] of DIRS) {
      const { total, open } = countLine(x, y, dx, dy, p);
      if (total >= 5) continue;
      if (total === 4) {
        if (open === 2) openFour = true;
        else rushedFour = true;
      } else if (total === 3 && open === 2) {
        openThree = true;
      }
    }
    if (openFour && openThree) threatType = 'four_three';
    else if (openFour) threatType = 'open_four';
    else if (rushedFour && openThree) threatType = 'four_three';
    else if (rushedFour) threatType = 'rushed_four';
    else if (openThree) threatType = 'open_three';
    else threatType = '';

    threatCells = threatType ? collectThreatCells(x, y, p) : [];
  }

  function collectThreatCells(x, y, p) {
    const cells = [];
    for (const [dx, dy] of DIRS) {
      const line = [{ x, y }];
      let cx = x + dx, cy = y + dy;
      while (inBoard(cx, cy) && board[cy][cx] === p) { line.push({ x: cx, y: cy }); cx += dx; cy += dy; }
      cx = x - dx; cy = y - dy;
      while (inBoard(cx, cy) && board[cy][cx] === p) { line.unshift({ x: cx, y: cy }); cx -= dx; cy -= dy; }
      if (line.length >= 3) for (const c of line) if (!cells.find(k => k.x === c.x && k.y === c.y)) cells.push(c);
    }
    return cells;
  }

  function inBoard(x, y) { return x >= 0 && y >= 0 && x < N && y < N; }

  function setMode(m) { mode = m; startNewGame(); }
  function setHumanColor(c) { humanColor = c; startNewGame(); }
  function setDifficulty(d) { aiDifficulty = d; if (engineReady) sendInfo(); startNewGame(); }

  // 分析面板回调
  let onAnalysisUpdate = null;
  function setAnalysisCallback(cb) { onAnalysisUpdate = cb; }

  function getAnalysis() {
    return {
      depth: window.__lastDepth || 0,
      eval: window.__lastEval || '-',
      winrate: window.__lastWinrate || null,
      bestline: window.__lastBestline || [],
    };
  }

  return {
    init, startEngine, startNewGame, playerClick, getState,
    setMode, setHumanColor, setDifficulty, setAnalysisCallback, getAnalysis,
    N,
  };
})();

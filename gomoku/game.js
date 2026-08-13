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

  // 引擎配置（对齐 Godot 版）
  let rule = 0;             // 0 无禁手 / 1 标准 / 2 有禁手
  let strength = 70;
  let timeoutTurn = 1500;   // 毫秒
  let threads = 1;
  let maxDepth = 100;
  let showDetail = 2;
  let cautionFactor = 3;    // 选点范围 0~5
  let hashSize = 128;       // MiB
  let nbest = 1;            // 多点分析数

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
        } else if (r.bestline || r.depth || r.eval || r.winrate || r.speed || r.totalnodes || r.nodes) {
          // 分析信息（用于分析面板，暂存）
          if (r.bestline) window.__lastBestline = r.bestline;
          if (r.depth) window.__lastDepth = r.depth;
          if (r.eval !== undefined) window.__lastEval = r.eval;
          if (r.winrate !== undefined) window.__lastWinrate = r.winrate;
          if (r.speed !== undefined) window.__lastSpeed = r.speed;
          if (r.totalnodes !== undefined) window.__lastNodes = r.totalnodes;
          else if (r.nodes !== undefined) window.__lastNodes = r.nodes;
          if (onAnalysisUpdate) onAnalysisUpdate();
        }
      }, path);
    });
  }

  function sendInfo() {
    GomokuEngine.sendCommand('INFO RULE ' + rule);
    GomokuEngine.sendCommand('INFO STRENGTH ' + strength);
    GomokuEngine.sendCommand('INFO TIMEOUT_TURN ' + timeoutTurn);
    GomokuEngine.sendCommand('INFO THREAD_NUM ' + threads);
    GomokuEngine.sendCommand('INFO MAX_DEPTH ' + maxDepth);
    GomokuEngine.sendCommand('INFO SHOW_DETAIL ' + showDetail);
    GomokuEngine.sendCommand('INFO CAUTION_FACTOR ' + cautionFactor);
    GomokuEngine.sendCommand('INFO HASH_SIZE ' + hashSize);
  }

  // 设置单项配置并下发引擎
  function setConfig(key, value) {
    if (key === 'rule') rule = value;
    else if (key === 'strength') strength = value;
    else if (key === 'timeoutTurn') timeoutTurn = value;
    else if (key === 'threads') threads = value;
    else if (key === 'maxDepth') maxDepth = value;
    else if (key === 'showDetail') showDetail = value;
    else if (key === 'cautionFactor') cautionFactor = value;
    else if (key === 'hashSize') hashSize = value;
    else if (key === 'nbest') nbest = value;
    else if (key === 'thinkIndex') { thinkIndex = value; return; }
    if (engineReady) sendInfo();
  }

  // 分析当前局面（nbest 多点分析）
  function analyze() {
    if (!engineReady) return;
    const aiColor = 3 - humanColor;
    GomokuEngine.sendCommand('START ' + N);
    let cmd = 'BOARD';
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = board[y][x];
        if (v === 0) continue;
        const side = v === aiColor ? 1 : 2;
        cmd += ` ${x},${y},${side}`;
      }
    cmd += ' DONE';
    GomokuEngine.sendCommand(cmd);
    GomokuEngine.sendCommand('YXNBEST ' + nbest);
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
  function setDifficulty(d) {
    aiDifficulty = d;
    strength = DIFFICULTY[d].strength;
    timeoutTurn = DIFFICULTY[d].timeout;
    if (engineReady) sendInfo();
    startNewGame();
  }

  // 分析面板回调
  let onAnalysisUpdate = null;
  function setAnalysisCallback(cb) { onAnalysisUpdate = cb; }

  let thinkIndex = 1;  // 0快/1中/2慢/3分析

  function getConfig(key) {
    if (key === 'rule') return rule;
    if (key === 'cautionFactor') return cautionFactor;
    if (key === 'nbest') return nbest;
    if (key === 'thinkIndex') return thinkIndex;
    if (key === 'timeoutTurn') return timeoutTurn;
    return null;
  }

  // 悔棋（撤销最后 1~2 步）
  function undo() {
    // 需要落子历史，这里简化：清空最后一步
    if (moveCount === 0 || aiThinking) return;
    // 人机模式撤两步（AI+玩家），双人撤一步
    let steps = mode === 'pve' ? 2 : 1;
    while (steps-- > 0 && moveCount > 0) {
      if (lastMove) {
        board[lastMove.y][lastMove.x] = 0;
        moveCount--;
      }
      // 重新找最后一步（简化：从棋盘反向找）
      lastMove = null;
      for (let y = N - 1; y >= 0 && !lastMove; y--)
        for (let x = N - 1; x >= 0; x--)
          if (board[y][x] !== 0) { lastMove = { x, y }; break; }
      // 切换回玩家
      currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
    winner = 0;
    winningCells = [];
    threatCells = [];
    threatType = '';
    notify();
  }

  function getAnalysis() {
    return {
      depth: window.__lastDepth || 0,
      eval: window.__lastEval || '-',
      winrate: window.__lastWinrate || null,
      bestline: window.__lastBestline || [],
      speed: window.__lastSpeed || 0,
      nodes: window.__lastNodes || 0,
    };
  }

  return {
    init, startEngine, startNewGame, playerClick, getState,
    setMode, setHumanColor, setDifficulty, setConfig, analyze, undo, getConfig,
    setAnalysisCallback, getAnalysis,
    N,
  };
})();

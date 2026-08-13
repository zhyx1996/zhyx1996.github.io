/**
 * 五子棋游戏主逻辑：整合引擎、棋盘、棋型检测、AI 对战
 */
const GomokuGame = (() => {
  let N = 15;             // 棋盘大小（可变 5~22）
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
  let moveHistory = [];

  // 分析状态（实时候选点 / 禁手 / MultiPV）
  let realtimeBest = null;  // 思考中引擎当前最佳候选点 {x,y}
  let realtimeLost = [];    // 思考中引擎已排除的点
  let forbidCells = [];     // 禁手点（有禁手规则）
  let pvList = [];          // MultiPV 列表（每项 {depth,eval,winrate,bestline,nodes,speed}）
  let curPv = 1;

  // 配置
  let mode = 'pve';         // pve | pvp
  let humanColor = 1;       // 1=黑 2=白
  let aiDifficulty = 'medium'; // easy/medium/hard
  let engineReady = false;
  let engineThreaded = false;  // 引擎是否运行在多线程模式（决定 THREAD_NUM 取值）
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
  let pondering = false;    // 后台思考
  let threadsOverride = 0;  // 手动线程数（0=自动）
  let aiBlack = false;      // AI 执黑
  let aiWhite = false;      // AI 执白

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
    moveHistory = [];
    realtimeBest = null;
    realtimeLost = [];
    forbidCells = [];
    pvList = [];
    curPv = 1;
    notify();
  }

  function notify() {
    if (onStateChange) onStateChange(getState());
  }

  function getState() {
    return {
      board, currentPlayer, winner, moveCount, lastMove, winningCells,
      threatCells, threatType, aiThinking, mode, humanColor, aiDifficulty, engineReady,
      realtimeBest, realtimeLost, forbidCells, aiBlack, aiWhite,
    };
  }

  // 启动引擎
  async function startEngine() {
    const path = enginePath;
    return new Promise((resolve) => {
      GomokuEngine.init((r) => {
        if (r.ok) {
          engineReady = true;
          engineThreaded = r.threads === true;
          threads = computeThreads();
          sendInfo();
          notify();
          resolve(true);
        } else if (r.pos) {
          onEngineMove(r.pos);
        } else if (r.realtime) {
          // 实时候选点：BEST=当前最佳，LOST=已排除（引擎坐标 [x,y] 归一化为 {x,y}）
          const pos = r.realtime.pos && { x: r.realtime.pos[0], y: r.realtime.pos[1] };
          if (r.realtime.type === 'BEST') { realtimeBest = pos; realtimeLost = []; }
          else if (r.realtime.type === 'LOST' && pos) realtimeLost.push(pos);
          notify();
        } else if (r.forbid) {
          forbidCells = (r.forbid || []).map(p => ({ x: p[0], y: p[1] }));
          notify();
        } else if (r.numpv) {
          curPv = r.numpv;
        } else if (r.error) {
          console.error('[engine error]', r.error);
          resolve(false);
        } else if (r.msg) {
          console.log('[engine]', r.msg);
        } else if (r.bestline || r.depth || r.eval !== undefined || r.winrate !== undefined || r.speed || r.totalnodes || r.nodes) {
          // 分析信息（按 NUMPV 索引累积为 MultiPV 列表）
          const e = pvEntry(curPv);
          if (r.depth) e.depth = r.depth;
          if (r.eval !== undefined) e.eval = r.eval;
          if (r.winrate !== undefined) e.winrate = r.winrate;
          if (r.bestline) e.bestline = r.bestline;
          if (r.speed !== undefined) e.speed = r.speed;
          if (r.totalnodes !== undefined) e.nodes = r.totalnodes;
          else if (r.nodes !== undefined) e.nodes = r.nodes;
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
    // Rapfi 的 INFO HASH_SIZE 单位为 KB（见 gomoku-calculator 源码：hashSize(MB) * 1024）
    GomokuEngine.sendCommand('INFO HASH_SIZE ' + (hashSize * 1024));
    GomokuEngine.sendCommand('INFO PONDERING ' + (pondering ? 1 : 0));
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
    else if (key === 'pondering') pondering = !!value;
    else if (key === 'threadsOverride') { threadsOverride = value; threads = computeThreads(); }
    else if (key === 'thinkIndex') { thinkIndex = value; return; }
    if (engineReady) sendInfo();
    if (key === 'rule' && engineReady) requestForbid();
  }

  // 计算实际线程数：手动优先，否则多线程用一半核心，单线程固定 1
  function computeThreads() {
    if (threadsOverride > 0) return threadsOverride;
    return engineThreaded
      ? Math.max(1, Math.floor((window.navigator.hardwareConcurrency || 4) / 2))
      : 1;
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

  // 判断某颜色是否由 AI 落子（AI 执黑/执白开关优先，其次人机模式的 AI 方）
  function aiPlays(player) {
    if (aiBlack && player === 1) return true;
    if (aiWhite && player === 2) return true;
    if (mode === 'pve') return player === (3 - humanColor);
    return false;
  }

  // 请求禁手点（有禁手规则时引擎通过 YXSHOWFORBID 输出 FORBID）
  function requestForbid() {
    if (!engineReady) return;
    forbidCells = [];
    if (rule !== 2) return;
    sendBoard(false);
    GomokuEngine.sendCommand('YXSHOWFORBID');
  }

  function startNewGame() {
    resetBoard();
    if (mode === 'pve' || aiBlack || aiWhite) {
      GomokuEngine.sendCommand('START ' + N);
      sendInfo();
      if (aiPlays(1)) {
        aiThinking = true;
        notify();
        GomokuEngine.sendCommand('BEGIN');
      } else {
        notify();
        requestForbid();
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
    if (aiThinking || aiPlays(currentPlayer)) return false;
    if (board[y][x] !== 0) return false;
    placeStone(x, y);
    return true;
  }

  function placeStone(x, y) {
    board[y][x] = currentPlayer;
    lastMove = { x, y };
    moveCount++;
    moveHistory.push({ x, y });

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
    if (winner === 0 && aiPlays(currentPlayer)) {
      aiThinking = true;
      notify();
      // 用 BOARD 命令同步局面让 AI 思考
      setTimeout(() => {
        sendBoard(false);
        GomokuEngine.sendCommand('YXNBEST 1');
      }, 50);
    } else if (winner === 0) {
      // 轮到人下，刷新禁手点显示
      requestForbid();
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

  // 设置棋盘大小
  function setBoardSize(size) {
    const sizes = [5, 9, 11, 13, 15, 17, 19];
    N = size;
    resetBoard();
    if (mode === 'pve' && engineReady) {
      GomokuEngine.sendCommand('START ' + N);
      sendInfo();
    }
    notify();
  }
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
    if (key === 'threads') return threads;
    if (key === 'threadsOverride') return threadsOverride;
    if (key === 'hashSize') return hashSize;
    if (key === 'strength') return strength;
    if (key === 'pondering') return pondering;
    if (key === 'aiBlack') return aiBlack;
    if (key === 'aiWhite') return aiWhite;
    return null;
  }

  // 悔棋（撤销最后 1~2 步，按落子历史栈精确回退，与 Godot 版一致）
  function undo() {
    if (moveCount === 0 || aiThinking) return;
    // 人机模式撤两步（AI+玩家），双人/观战撤一步
    const steps = mode === 'pve' ? 2 : 1;
    let n = Math.min(steps, moveHistory.length);
    while (n-- > 0) {
      const cell = moveHistory.pop();
      if (cell) {
        board[cell.y][cell.x] = 0;
        moveCount--;
        currentPlayer = currentPlayer === 1 ? 2 : 1;
      }
    }
    lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
    winner = 0;
    winningCells = [];
    threatCells = [];
    threatType = '';
    realtimeBest = null;
    realtimeLost = [];
    forbidCells = [];
    notify();
  }

  function pvEntry(i) {
    if (!pvList[i]) pvList[i] = {};
    return pvList[i];
  }

  function setAiBlack(v) { aiBlack = !!v; startNewGame(); }
  function setAiWhite(v) { aiWhite = !!v; startNewGame(); }

  function getAnalysis() {
    // 整理 MultiPV 列表（过滤空项，按 NUMPV 排序）
    const pvs = [];
    for (let i = 0; i < pvList.length; i++) {
      if (pvList[i] && pvList[i].bestline) pvs.push({ index: i, ...pvList[i] });
    }
    pvs.sort((a, b) => a.index - b.index);
    const best = pvs[0] || {};
    return {
      depth: best.depth || 0,
      eval: best.eval ?? '-',
      winrate: best.winrate ?? null,
      bestline: best.bestline || [],
      speed: best.speed || 0,
      nodes: best.nodes || 0,
      pvs,
    };
  }

  return {
    init, startEngine, startNewGame, playerClick, getState,
    setMode, setHumanColor, setDifficulty, setConfig, analyze, undo, getConfig,
    setBoardSize, setAnalysisCallback, getAnalysis,
    setAiBlack, setAiWhite, requestForbid,
    get N() { return N; },
    get moveHistory() { return moveHistory; },
  };
})();

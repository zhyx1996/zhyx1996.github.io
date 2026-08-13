/**
 * 五子棋 UI 整合：DOM 构建、事件绑定、动画循环
 */
(function () {
  const game = GomokuGame;
  const board = GomokuBoard;

  let canvas, ctx;
  let loadingEl, statusEl, winBannerEl;
  let analysisEl;
  let lastRenderTime = performance.now();
  let rafId = null;

  function init() {
    const container = document.getElementById('gm-native-root');
    if (!container) return;

    container.innerHTML = `
      <div class="gm-native">
        <div class="gm-native-board-panel">
          <canvas class="gm-native-canvas" id="gm-native-canvas" width="640" height="640"></canvas>
          <div class="gm-native-loading" id="gm-native-loading">
            <div class="gm-native-spinner"></div>
            <span>正在加载 Rapfi AI 引擎…（约 40MB，首次较慢）</span>
          </div>
          <div class="gm-native-win-banner" id="gm-native-win-banner"></div>
        </div>
        <div class="gm-native-side">
          <div class="gm-native-card">
            <h3>对局</h3>
            <div class="gm-native-status" id="gm-native-status"></div>
            <div class="gm-native-controls">
              <button class="gm-native-btn" id="gm-btn-mode">模式：人机对战</button>
              <button class="gm-native-btn" id="gm-btn-color">你执：黑棋（先手）</button>
              <button class="gm-native-btn" id="gm-btn-diff">AI 难度：中等</button>
              <button class="gm-native-btn" id="gm-btn-rule">规则：无禁手</button>
              <button class="gm-native-btn" id="gm-btn-think">思考：中等</button>
              <button class="gm-native-btn" id="gm-btn-cand">选点：较大</button>
              <button class="gm-native-btn" id="gm-btn-nbest">分析点：1</button>
              <button class="gm-native-btn" id="gm-btn-size">棋盘：15×15</button>
              <button class="gm-native-btn" id="gm-btn-theme">主题：深色</button>
              <button class="gm-native-btn" id="gm-btn-threads">线程：自动</button>
              <button class="gm-native-btn" id="gm-btn-hash">置换表：128MB</button>
              <button class="gm-native-btn" id="gm-btn-strength">棋力：70</button>
              <button class="gm-native-btn" id="gm-btn-pondering">后台思考：关</button>
              <div class="gm-native-row">
                <button class="gm-native-btn" id="gm-btn-aiblack">AI执黑：关</button>
                <button class="gm-native-btn" id="gm-btn-aiwhite">AI执白：关</button>
              </div>
              <div class="gm-native-row">
                <button class="gm-native-btn" id="gm-btn-coord">坐标：开</button>
                <button class="gm-native-btn" id="gm-btn-index">序号：关</button>
              </div>
              <div class="gm-native-row">
                <button class="gm-native-btn gm-primary" id="gm-btn-undo">↶ 悔棋</button>
                <button class="gm-native-btn gm-primary" id="gm-btn-restart">↻ 新局</button>
              </div>
            </div>
          </div>
          <div class="gm-native-card">
            <h3>实时分析</h3>
            <div class="gm-native-analysis" id="gm-native-analysis">
              <div class="gm-kv"><span>深度</span><b>-</b></div>
              <div class="gm-kv"><span>估值</span><b>-</b></div>
              <div class="gm-kv"><span>胜率</span><b>-</b></div>
              <div class="gm-kv"><span>速度</span><b>-</b></div>
              <div class="gm-kv"><span>节点</span><b>-</b></div>
              <div class="gm-kv"><span>最佳线</span><b>-</b></div>
            </div>
          </div>
        </div>
      </div>
    `;

    canvas = document.getElementById('gm-native-canvas');
    loadingEl = document.getElementById('gm-native-loading');
    statusEl = document.getElementById('gm-native-status');
    winBannerEl = document.getElementById('gm-native-win-banner');
    analysisEl = document.getElementById('gm-native-analysis');

    // 初始化棋盘尺寸（正确测量可用宽度 + DPR 适配）
    resizeCanvas();

    board.init(canvas, game.N);

    // 事件绑定：pointer 事件统一鼠标/触屏
    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    document.getElementById('gm-btn-mode').addEventListener('click', () => {
      const cur = game.getState().mode;
      game.setMode(cur === 'pve' ? 'pvp' : 'pve');
    });
    document.getElementById('gm-btn-color').addEventListener('click', () => {
      const cur = game.getState().humanColor;
      game.setHumanColor(cur === 1 ? 2 : 1);
    });
    document.getElementById('gm-btn-diff').addEventListener('click', () => {
      const order = ['easy', 'medium', 'hard'];
      const cur = game.getState().aiDifficulty;
      const next = order[(order.indexOf(cur) + 1) % 3];
      game.setDifficulty(next);
    });
    document.getElementById('gm-btn-restart').addEventListener('click', () => {
      game.startNewGame();
    });
    document.getElementById('gm-btn-undo').addEventListener('click', () => {
      game.undo();
    });

    // 设置循环切换（规则/思考时间/选点范围/nbest）
    const ruleNames = ['无禁手', '标准（禁长连）', '有禁手'];
    document.getElementById('gm-btn-rule').addEventListener('click', () => {
      const cur = game.getConfig('rule');
      const next = (cur + 1) % 3;
      game.setConfig('rule', next);
      updateButtons();
    });

    const thinkNames = ['快速', '中等', '慢速', '分析'];
    const thinkTimeouts = [300, 1500, 5000, 10000];
    document.getElementById('gm-btn-think').addEventListener('click', () => {
      const cur = game.getConfig('thinkIndex');
      const next = (cur + 1) % 4;
      game.setConfig('thinkIndex', next);
      game.setConfig('timeoutTurn', thinkTimeouts[next]);
      updateButtons();
    });

    const candNames = ['小范围', '较小', '中等', '较大', '大范围', '全盘'];
    document.getElementById('gm-btn-cand').addEventListener('click', () => {
      const cur = game.getConfig('cautionFactor');
      const next = (cur + 1) % 6;
      game.setConfig('cautionFactor', next);
      updateButtons();
    });

    document.getElementById('gm-btn-nbest').addEventListener('click', () => {
      const cur = game.getConfig('nbest');
      const next = cur >= 4 ? 1 : cur + 1;
      game.setConfig('nbest', next);
      updateButtons();
    });

    // 棋盘大小 / 主题 / 显示选项
    let uiState = { theme: 0, showCoord: true, showIndex: false };
    document.getElementById('gm-btn-size').addEventListener('click', () => {
      const sizes = [5, 9, 11, 13, 15, 17, 19];
      const cur = game.N;
      const idx = sizes.indexOf(cur);
      const next = sizes[(idx + 1) % sizes.length];
      game.setBoardSize(next);
      board.resize(next);
      updateButtons();
    });
    document.getElementById('gm-btn-theme').addEventListener('click', () => {
      uiState.theme = (uiState.theme + 1) % 3;
      board.setTheme(uiState.theme);
      const themeNames = ['深色', '木质', '浅色'];
      document.getElementById('gm-btn-theme').textContent = '主题：' + themeNames[uiState.theme];
      updateButtons();
    });
    document.getElementById('gm-btn-coord').addEventListener('click', () => {
      uiState.showCoord = !uiState.showCoord;
      board.setShowCoord(uiState.showCoord);
      document.getElementById('gm-btn-coord').textContent = '坐标：' + (uiState.showCoord ? '开' : '关');
      updateButtons();
    });
    document.getElementById('gm-btn-index').addEventListener('click', () => {
      uiState.showIndex = !uiState.showIndex;
      board.setShowIndex(uiState.showIndex);
      document.getElementById('gm-btn-index').textContent = '序号：' + (uiState.showIndex ? '开' : '关');
      updateButtons();
    });

    // 线程 / 置换表 / 棋力 / 后台思考 / AI执黑白（补齐原版设置项）
    const threadOpts = [0, 1, 2, 4, 8];
    document.getElementById('gm-btn-threads').addEventListener('click', () => {
      const cur = game.getConfig('threadsOverride');
      const idx = threadOpts.indexOf(cur);
      const next = threadOpts[(idx + 1) % threadOpts.length];
      game.setConfig('threadsOverride', next);
      updateButtons();
    });

    const hashOpts = [128, 256, 512];
    document.getElementById('gm-btn-hash').addEventListener('click', () => {
      const cur = game.getConfig('hashSize');
      const idx = hashOpts.indexOf(cur);
      const next = hashOpts[(idx + 1) % hashOpts.length];
      game.setConfig('hashSize', next);
      updateButtons();
    });

    const strengthOpts = [30, 50, 70, 85, 100];
    document.getElementById('gm-btn-strength').addEventListener('click', () => {
      const cur = game.getConfig('strength');
      const idx = strengthOpts.indexOf(cur);
      const next = strengthOpts[(idx + 1) % strengthOpts.length];
      game.setConfig('strength', next);
      updateButtons();
    });

    document.getElementById('gm-btn-pondering').addEventListener('click', () => {
      const next = !game.getConfig('pondering');
      game.setConfig('pondering', next);
      updateButtons();
    });

    document.getElementById('gm-btn-aiblack').addEventListener('click', () => {
      game.setAiBlack(!game.getConfig('aiBlack'));
      updateButtons();
    });
    document.getElementById('gm-btn-aiwhite').addEventListener('click', () => {
      game.setAiWhite(!game.getConfig('aiWhite'));
      updateButtons();
    });

    // 窗口尺寸变化时重算棋盘
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        board.resize(game.N);
      }, 150);
    });

    // 初始化游戏 + 引擎
    game.init(onState);
    game.setAnalysisCallback(updateAnalysis);

    // 启动引擎（异步）
    game.startEngine().then((ok) => {
      if (ok) {
        loadingEl.style.display = 'none';
        game.startNewGame();
        updateButtons();
      } else {
        loadingEl.innerHTML = '<span>引擎加载失败，请检查网络或刷新重试。</span>';
      }
    }).catch((e) => {
      loadingEl.innerHTML = '<span>引擎加载异常：' + e.message + '</span>';
    });

    // 动画循环
    function frame(t) {
      const dt = (t - lastRenderTime) / 1000;
      lastRenderTime = t;
      board.render(dt);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function resizeCanvas() {
    const container = document.getElementById('gm-native-root');
    if (!container || !canvas) return;
    const dpr = window.devicePixelRatio || 1;

    // 测量实际可用宽度：容器的布局宽度（getBoundingClientRect 而非 clientWidth，
    // 避免 flex-wrap 下内容撑大导致的测量失真），并 clamp 到视口可用宽度
    const containerRect = container.getBoundingClientRect();
    // 视口可用宽度 = 视口宽 - 页面左右 padding（.main 移动端 20px 各，桌面也类似）
    const viewportW = window.innerWidth;
    const availW = Math.min(containerRect.width, viewportW - 8);
    // 棋盘最大 640，移动端占满可用宽度
    const cssSize = Math.max(240, Math.floor(Math.min(availW, 640)));

    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);

    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onCanvasPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    // 用 CSS 尺寸换算（canvas 物理像素已按 DPR 放大，坐标用 CSS 像素）
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = board.screenToCell(mx, my);
    if (!cell) return;
    game.playerClick(cell.x, cell.y);
  }

  function onState(s) {
    // 更新棋盘渲染数据
    board.setBoard(s.board, s.lastMove, s.winningCells, s.threatCells, s.threatType,
      s.realtimeBest, s.realtimeLost, s.forbidCells);
    board.setMoveHistory(game.moveHistory);

    // 更新状态文字
    let txt = '';
    if (s.winner === 1) txt = '黑棋获胜！';
    else if (s.winner === 2) txt = '白棋获胜！';
    else if (s.winner === 3) txt = '平局';
    else if (s.aiThinking) txt = 'AI 思考中…';
    else txt = '轮到' + (s.currentPlayer === 1 ? '黑棋' : '白棋') + '落子';

    statusEl.textContent = txt;
    statusEl.className = 'gm-native-status' +
      (s.winner === 1 || s.winner === 2 ? ' gm-win' : '') +
      (s.aiThinking ? ' gm-thinking' : '');

    // 胜利横幅
    if ((s.winner === 1 || s.winner === 2)) {
      if (!winBannerEl.classList.contains('gm-show')) {
        winBannerEl.textContent = s.winner === 1 ? '黑棋获胜！' : '白棋获胜！';
        winBannerEl.classList.remove('gm-show');
        void winBannerEl.offsetWidth; // 触发重排
        winBannerEl.classList.add('gm-show');
      }
    } else {
      winBannerEl.classList.remove('gm-show');
    }

    // 更新按钮文字
    const modeBtn = document.getElementById('gm-btn-mode');
    const colorBtn = document.getElementById('gm-btn-color');
    const diffBtn = document.getElementById('gm-btn-diff');
    if (modeBtn) modeBtn.textContent = '模式：' + (s.mode === 'pve' ? '人机对战' : '双人对战');
    if (colorBtn) colorBtn.textContent = '你执：' + (s.humanColor === 1 ? '黑棋（先手）' : '白棋（后手）');
    if (diffBtn) {
      const names = { easy: '简单', medium: '中等', hard: '困难' };
      diffBtn.textContent = 'AI 难度：' + names[s.aiDifficulty];
    }
  }

  function updateButtons() {
    const ruleNames = ['无禁手', '标准（禁长连）', '有禁手'];
    const thinkNames = ['快速', '中等', '慢速', '分析'];
    const candNames = ['小范围', '较小', '中等', '较大', '大范围', '全盘'];
    const ruleBtn = document.getElementById('gm-btn-rule');
    const thinkBtn = document.getElementById('gm-btn-think');
    const candBtn = document.getElementById('gm-btn-cand');
    const nbestBtn = document.getElementById('gm-btn-nbest');
    if (ruleBtn) ruleBtn.textContent = '规则：' + ruleNames[game.getConfig('rule')];
    if (thinkBtn) thinkBtn.textContent = '思考：' + thinkNames[game.getConfig('thinkIndex')];
    if (candBtn) candBtn.textContent = '选点：' + candNames[game.getConfig('cautionFactor')];
    if (nbestBtn) nbestBtn.textContent = '分析点：' + game.getConfig('nbest');
    const sizeBtn = document.getElementById('gm-btn-size');
    if (sizeBtn) sizeBtn.textContent = '棋盘：' + game.N + '×' + game.N;
    const threadNames = ['自动', '1', '2', '4', '8'];
    const threadOpts = [0, 1, 2, 4, 8];
    const to = game.getConfig('threadsOverride');
    const ti = Math.max(0, threadOpts.indexOf(to));
    const tBtn = document.getElementById('gm-btn-threads');
    if (tBtn) tBtn.textContent = '线程：' + threadNames[ti] + '（实际' + game.getConfig('threads') + '）';
    const hBtn = document.getElementById('gm-btn-hash');
    if (hBtn) hBtn.textContent = '置换表：' + game.getConfig('hashSize') + 'MB';
    const sBtn = document.getElementById('gm-btn-strength');
    if (sBtn) sBtn.textContent = '棋力：' + game.getConfig('strength');
    const pBtn = document.getElementById('gm-btn-pondering');
    if (pBtn) pBtn.textContent = '后台思考：' + (game.getConfig('pondering') ? '开' : '关');
    const abBtn = document.getElementById('gm-btn-aiblack');
    if (abBtn) abBtn.textContent = 'AI执黑：' + (game.getConfig('aiBlack') ? '开' : '关');
    const awBtn = document.getElementById('gm-btn-aiwhite');
    if (awBtn) awBtn.textContent = 'AI执白：' + (game.getConfig('aiWhite') ? '开' : '关');
  }

  function updateAnalysis() {
    const a = game.getAnalysis();
    if (!analysisEl) return;
    let html = `
      <div class="gm-kv"><span>深度</span><b>${a.depth || '-'}</b></div>
      <div class="gm-kv"><span>估值</span><b>${a.eval ?? '-'}</b></div>
      <div class="gm-kv"><span>胜率</span><b>${a.winrate != null ? (a.winrate * 100).toFixed(1) + '%' : '-'}</b></div>
      <div class="gm-kv"><span>速度</span><b>${a.speed || '-'}</b></div>
      <div class="gm-kv"><span>节点</span><b>${a.nodes || '-'}</b></div>
    `;
    // MultiPV 多点分析：每条 PV 一行（估值/胜率/深度 + 最佳线）
    if (a.pvs && a.pvs.length > 0) {
      for (let i = 0; i < a.pvs.length && i < 5; i++) {
        const p = a.pvs[i];
        const meta = [];
        if (p.eval != null) meta.push(String(p.eval));
        if (p.winrate != null) meta.push((p.winrate * 100).toFixed(1) + '%');
        if (p.depth) meta.push('d' + p.depth);
        html += `<div class="gm-kv"><span>PV${i + 1}${meta.length ? ' ' + meta.join(' ') : ''}</span><b>${formatBestline(p.bestline)}</b></div>`;
      }
    } else {
      html += `<div class="gm-kv"><span>最佳线</span><b>-</b></div>`;
    }
    analysisEl.innerHTML = html;
  }

  function formatBestline(line) {
    if (!line || line.length === 0) return '-';
    return line.slice(0, 6).map(([x, y]) => {
      return String.fromCharCode(65 + x) + (15 - y);
    }).join(' ');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

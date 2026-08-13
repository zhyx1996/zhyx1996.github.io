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
              <button class="gm-native-btn gm-primary" id="gm-btn-restart">重新开始</button>
            </div>
          </div>
          <div class="gm-native-card">
            <h3>实时分析</h3>
            <div class="gm-native-analysis" id="gm-native-analysis">
              <div class="gm-kv"><span>深度</span><b>-</b></div>
              <div class="gm-kv"><span>估值</span><b>-</b></div>
              <div class="gm-kv"><span>胜率</span><b>-</b></div>
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

    // 适配 DPR
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.min(container.clientWidth - 20, 640);
    const size = Math.floor(cssW);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    // 重设 canvas 逻辑尺寸给 board.js（用 CSS 尺寸）
    canvas.width = size;
    canvas.height = size;

    board.init(canvas, game.N);

    // 事件绑定
    canvas.addEventListener('click', onCanvasClick);
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

    // 初始化游戏 + 引擎
    game.init(onState);
    game.setAnalysisCallback(updateAnalysis);

    // 启动引擎（异步）
    game.startEngine().then((ok) => {
      if (ok) {
        loadingEl.style.display = 'none';
        game.startNewGame();
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

  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = board.screenToCell(mx, my);
    if (!cell) return;
    game.playerClick(cell.x, cell.y);
  }

  function onState(s) {
    // 更新棋盘渲染数据
    board.setBoard(s.board, s.lastMove, s.winningCells, s.threatCells, s.threatType);

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

  function updateAnalysis() {
    const a = game.getAnalysis();
    if (!analysisEl) return;
    analysisEl.innerHTML = `
      <div class="gm-kv"><span>深度</span><b>${a.depth || '-'}</b></div>
      <div class="gm-kv"><span>估值</span><b>${a.eval || '-'}</b></div>
      <div class="gm-kv"><span>胜率</span><b>${a.winrate != null ? (a.winrate * 100).toFixed(1) + '%' : '-'}</b></div>
      <div class="gm-kv"><span>最佳线</span><b>${formatBestline(a.bestline)}</b></div>
    `;
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

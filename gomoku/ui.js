/**
 * 五子棋 UI 整合：DOM 构建、事件绑定、动画循环
 */
(function () {
  const game = GomokuGame;
  const board = GomokuBoard;

  let canvas, ctx;
  let loadingEl, statusEl, winBannerEl;
  let analysisEl, rematchBtn;
  let lastRenderTime = performance.now();
  let rafId = null;
  let lastMoveCount = 0;      // 用于检测落子播放音效
  let audioCtx = null;

  function init() {
    const container = document.getElementById('gm-native-root');
    if (!container) return;

    container.innerHTML = `
      <div class="gm-native">
        <div class="gm-native-board-panel">
          <canvas class="gm-native-canvas" id="gm-native-canvas" width="640" height="640"></canvas>
          <div class="gm-native-loading" id="gm-native-loading">
            <div class="gm-native-spinner"></div>
            <span>正在加载 Rapfi AI 引擎…</span>
            <div class="gm-progress"><div class="gm-progress-bar" id="gm-progress-bar"></div></div>
            <span class="gm-progress-text" id="gm-progress-text">正在从 GitHub 下载 NNUE 权重（约 40MB）…</span>
            <span class="gm-progress-hint">若长时间没有进度，请检查到 GitHub 的网络连通性（必要时开启代理）。</span>
          </div>
          <div class="gm-native-win-banner" id="gm-native-win-banner"></div>
          <button class="gm-rematch-btn" id="gm-rematch-btn" hidden>再来一局</button>
        </div>
        <div class="gm-native-side">
          <div class="gm-native-card gm-status-card">
            <div class="gm-native-status" id="gm-native-status"></div>
          </div>

          <div class="gm-native-card">
            <div class="gm-btn-grid gm-btn-grid-3">
              <button class="gm-native-btn" id="gm-btn-mode">模式：人机</button>
              <button class="gm-native-btn" id="gm-btn-color">你执：黑棋</button>
              <button class="gm-native-btn" id="gm-btn-diff">难度：中等</button>
            </div>
            <div class="gm-native-row gm-action-row">
              <button class="gm-native-btn gm-primary" id="gm-btn-undo">↶ 悔棋</button>
              <button class="gm-native-btn gm-primary" id="gm-btn-restart">↻ 新局</button>
            </div>
            <button class="gm-native-btn gm-settings-btn" id="gm-btn-settings">⚙ 设置</button>
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

      <div class="gm-modal" id="gm-settings-modal" hidden>
        <div class="gm-modal-overlay" data-gm-modal-close></div>
        <div class="gm-modal-dialog" role="dialog" aria-modal="true" aria-label="设置">
          <div class="gm-modal-head">
            <span class="gm-modal-title">设置</span>
            <button class="gm-modal-close" data-gm-modal-close aria-label="关闭">×</button>
          </div>
          <div class="gm-modal-body">
            <div class="gm-group-label">引擎</div>
            <div class="gm-btn-grid">
              <button class="gm-native-btn" id="gm-btn-rule">规则：无禁手</button>
              <button class="gm-native-btn" id="gm-btn-size">棋盘：15×15</button>
              <button class="gm-native-btn" id="gm-btn-think">思考：中等</button>
              <button class="gm-native-btn" id="gm-btn-cand">选点：较大</button>
              <button class="gm-native-btn" id="gm-btn-threads">线程：自动</button>
              <button class="gm-native-btn" id="gm-btn-hash">置换表：128MB</button>
              <button class="gm-native-btn" id="gm-btn-strength">棋力：70</button>
              <button class="gm-native-btn" id="gm-btn-pondering">后台思考：关</button>
            </div>
            <div class="gm-group-label">显示</div>
            <div class="gm-btn-grid">
              <button class="gm-native-btn" id="gm-btn-coord">坐标：开</button>
              <button class="gm-native-btn" id="gm-btn-index">序号：关</button>
              <button class="gm-native-btn" id="gm-btn-theme">主题：深色</button>
            </div>
            <div class="gm-group-label">AI 执子</div>
            <div class="gm-btn-grid">
              <button class="gm-native-btn" id="gm-btn-aiblack">AI执黑：关</button>
              <button class="gm-native-btn" id="gm-btn-aiwhite">AI执白：关</button>
            </div>
            <div class="gm-group-label">分析</div>
            <div class="gm-btn-grid">
              <button class="gm-native-btn gm-grid-full" id="gm-btn-nbest">分析点：1</button>
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
    rematchBtn = document.getElementById('gm-rematch-btn');

    // 初始化棋盘尺寸（正确测量可用宽度 + DPR 适配）
    resizeCanvas();

    board.init(canvas, game.N);

    // 再来一局按钮
    rematchBtn.addEventListener('click', () => {
      game.startNewGame();
      rematchBtn.hidden = true;
    });

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

    // 设置弹窗：打开 / 关闭
    const settingsModal = document.getElementById('gm-settings-modal');
    document.getElementById('gm-btn-settings').addEventListener('click', () => {
      settingsModal.hidden = false;
      updateButtons();
    });
    settingsModal.querySelectorAll('[data-gm-modal-close]').forEach((el) => {
      el.addEventListener('click', () => { settingsModal.hidden = true; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal && !settingsModal.hidden) settingsModal.hidden = true;
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
    game.setLoadingCallback(updateLoading);

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
    // 落子音效（玩家或 AI 落子时播放）
    if (s.moveCount > lastMoveCount) {
      playClick();
      lastMoveCount = s.moveCount;
    } else if (s.moveCount === 0) {
      lastMoveCount = 0;
    }

    // 更新棋盘渲染数据
    board.setBoard(s.board, s.lastMove, s.winningCells, s.threatCells, s.threatType,
      s.attackCells, s.attackType, s.attackTime,
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
        playWin();
        if (rematchBtn) rematchBtn.hidden = false;
      }
    } else {
      winBannerEl.classList.remove('gm-show');
      if (rematchBtn) rematchBtn.hidden = true;
    }

    // 更新按钮文字
    const modeBtn = document.getElementById('gm-btn-mode');
    const colorBtn = document.getElementById('gm-btn-color');
    const diffBtn = document.getElementById('gm-btn-diff');
    if (modeBtn) modeBtn.textContent = '模式：' + (s.mode === 'pve' ? '人机' : '双人');
    if (colorBtn) colorBtn.textContent = '你执：' + (s.humanColor === 1 ? '黑棋' : '白棋');
    if (diffBtn) {
      const names = { easy: '简单', medium: '中等', hard: '困难' };
      diffBtn.textContent = '难度：' + names[s.aiDifficulty];
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
    if (tBtn) tBtn.textContent = '线程：' + threadNames[ti];
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

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playClick() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  function playWin() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDur = 0.15;
      notes.forEach((freq, i) => {
        const t = ctx.currentTime + i * noteDur;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + noteDur);
      });
    } catch (e) {}
  }

  function updateLoading(progress) {
    const bar = document.getElementById('gm-progress-bar');
    const txt = document.getElementById('gm-progress-text');
    if (!bar || !txt) return;
    const pct = Math.max(0, Math.min(1, progress || 0));
    bar.style.width = (pct * 100).toFixed(0) + '%';
    txt.textContent = '正在从 GitHub 下载 NNUE 权重（约 40MB）… ' + (pct * 100).toFixed(0) + '%';
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

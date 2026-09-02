/**
 * Rapfi WASM 引擎桥（供 Godot 网页版通过 JavaScriptBridge 调用）。
 * 暴露 window.RapfiBridge：
 *   - load(basePath): 异步加载引擎（多线程优先，回退单线程/SIMD）
 *   - send(cmd): 发送一条 Piskvork 命令
 *   - poll(): 返回一条原始 stdout 行（无则返回 ""）
 *   - isReady(): 引擎是否就绪
 */
(function () {
  if (window.RapfiBridge) return;

  let engine = null;      // 多线程 Emscripten 实例
  let worker = null;      // 单线程 Worker
  let ready = false;
  let queue = [];         // 原始 stdout 行队列
  let threaded = false;

  // 引擎 stdout 回调：同步阻塞，到达即聚合（官方 gomoku-calculator 同款「回调即处理」）。
  // 不积压队列——积压会反向限速引擎；Godot 侧每帧 pollFrame 只读小快照，主线程占用趋近于零。
  function push(line) {
    if (!line) return;
    const s = String(line).trim();
    if (s !== '') aggregateLine(s);
  }

  // ---- 特性检测 ----
  function hasSAB() { try { new SharedArrayBuffer(1); return true; } catch (e) { return false; } }
  function hasSimd() {
    try {
      return WebAssembly.validate(new Uint8Array([
        0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
        0x01,0x05,0x01,0x60,0x00,0x01,0x7b,
        0x03,0x02,0x01,0x00,
        0x0a,0x16,0x01,0x14,0x00,
        0xfd,0x0c,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0x0b,
      ]));
    } catch (e) { return false; }
  }
  function hasRelaxedSimd() {
    try {
      return WebAssembly.validate(new Uint8Array([
        0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
        0x01,0x05,0x01,0x60,0x00,0x01,0x7b,
        0x03,0x02,0x01,0x00,
        0x0a,0x08,0x01,0x06,0x00,0xfd,0x100,0x00,0x0b,
      ]));
    } catch (e) { return false; }
  }
  function memArgs(shared, maxMB) {
    return { initial: 64 * (1024 * 1024 / 65536), maximum: maxMB * (1024 * 1024 / 65536), shared: shared };
  }
  function instantiateSharedMem() {
    let mb = 2048;
    while (mb > 512) {
      try { const m = new WebAssembly.Memory(memArgs(true, mb)); m.grow(1); return m; } catch (e) { mb /= 2; }
    }
    return new WebAssembly.Memory(memArgs(true, mb));
  }

  function locateFile(url, dir) {
    if (/^rapfi.*\.data$/.test(url)) url = 'rapfi.data';
    return dir + url;
  }

  function loadScript(url) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = res;
      s.onerror = () => rej(new Error('load failed: ' + url));
      document.head.appendChild(s);
    });
  }

  const WORKER_SRC = `
    var EngineInstance = null;
    self.onmessage = function (e) {
      var type = e.data.type, data = e.data.data;
      if (type === 'command') {
        if (EngineInstance) EngineInstance.sendCommand(data);
      } else if (type === 'engineScriptURL') {
        var engineURL = data.engineURL;
        var engineDirURL = engineURL.substring(0, engineURL.lastIndexOf('/') + 1);
        self.importScripts(engineURL);
        self.Rapfi({
          locateFile: function (url) { if (/^rapfi.*\\.data$/.test(url)) url = 'rapfi.data'; return engineDirURL + url; },
          onReceiveStdout: function (o) { self.postMessage({ type: 'stdout', data: o }); },
          onReceiveStderr: function (o) { self.postMessage({ type: 'stderr', data: o }); },
          onExit: function (c) { self.postMessage({ type: 'exit', data: c }); },
          setStatus: function (s) { self.postMessage({ type: 'status', data: s }); },
          wasmMemory: data.memoryArgs ? new WebAssembly.Memory(data.memoryArgs) : undefined,
        }).then(function (inst) { EngineInstance = inst; self.postMessage({ type: 'ready' }); });
      }
    };
  `;

  async function load(basePath) {
    if (ready) return;
    const abs = /^https?:/i.test(basePath)
      ? basePath
      : new URL(basePath, location.origin).href;

    const sThreads = hasSAB();
    const sSimd = hasSimd();
    const sRelaxed = sThreads && hasRelaxedSimd();

    let name;
    if (sThreads && sSimd) name = 'rapfi-multi-simd128' + (sRelaxed ? '-relaxed' : '');
    else if (sSimd) name = 'rapfi-single-simd128';
    else name = 'rapfi-single';
    const engineURL = abs + name + '.js';

    if (sThreads && sSimd) {
      await loadScript(engineURL);
      const dir = engineURL.substring(0, engineURL.lastIndexOf('/') + 1);
      engine = await self.Rapfi({
        locateFile: (u) => locateFile(u, dir),
        onReceiveStdout: push,
        onReceiveStderr: (o) => console.error('[Engine]', o),
        onExit: (c) => console.log('[Engine exit]', c),
        setStatus: () => {},
        wasmMemory: instantiateSharedMem(),
      });
      threaded = true;
      ready = true;
    } else {
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'stdout') push(data);
        else if (type === 'stderr') console.error('[Engine]', data);
        else if (type === 'ready') { ready = true; }
      };
      worker.postMessage({ type: 'engineScriptURL', data: { engineURL, memoryArgs: memArgs(false) } });
    }
  }

  function send(cmd) {
    if (typeof cmd !== 'string' || cmd.length === 0) return;
    // 新搜索开始：清实时候选点与旧分析快照（与 GDScript 落子/新搜索时清 _realtime_best、
    // _realtime_lost、_analysis_data、_pv_list 对齐——JS 快照不清的话下一手会应用旧 PV 槽）
    if (/^(TURN|BEGIN|BOARD|START|YXBOARD)\b/.test(cmd)) {
      if (snap.best !== null || snap.lost.length > 0) {
        snap.best = null;
        snap.lost = [];
        snap.lostRev++;
        snap.bestRev++;
      }
      // 清空分析快照（保留 ver 会触发 GDScript 增量跳过，这里直接清空让下一帧全量应用）
      snap.global = {};
      snap.pvs = [];
      curPv = 0;
    }
    if (threaded) { if (engine) engine.sendCommand(cmd); }
    else if (worker) { worker.postMessage({ type: 'command', data: cmd }); }
  }

  function poll() {
    return queue.length ? queue.shift() : '';
  }

  // pollAll(): 一次性取空队列（换行拼接）。跨语言边界逐行 eval 开销高，
  // 引擎 show_detail=2 时每秒数千行 INFO，批量读取可避免主线程秒级卡顿。
  function pollAll() {
    if (queue.length === 0) return ''
    const out = queue.join('\n')
    queue.length = 0
    return out
  }

  // ---- JS 侧聚合快照 ----
  // 引擎 stdout 回调是同步阻塞的：消费不及时会反向限速搜索（实测「不读输出」时引擎
  // 0 节点停摆）。而 Godot 跨语言边界逐行 eval 开销极高（show_detail=3 每秒数千行），
  // 所以这里在 JS 侧把队列解析成结构化快照，Godot 每帧只读一个很小的 JSON。
  // 快照结构对齐 gomoku.gd 的 _on_engine_analysis 语义：
  //   INFO PV i  → 切换当前 PV 槽位
  //   其余 INFO 键 → 写入该槽位 + global（与 GDScript「entry 与 _analysis_data 双写」一致）
  let snap = { ver: 0,
               global: {},
               pvs: [],
               moves: [],
               best: null, lost: [], lostRev: 0,
               forbid: [], forbidRev: 0,
               bestRev: 0 };
  let curPv = 0;

  function clearSnap() {
    snap = { ver: snap.ver, global: {}, pvs: [], moves: [],
             best: null, lost: [], lostRev: 0, forbid: [], forbidRev: 0, bestRev: 0 };
    queue.length = 0;
  }

  function ensurePv(i) {
    while (snap.pvs.length <= i) snap.pvs.push({});
    return snap.pvs[i];
  }

  function aggregateLine(line) {
    snap.ver++;
    const t = line.trim();
    if (!t || t === 'OK') return;
    let i = t.indexOf(' ');
    if (i === -1) {
      if (t === 'SWAP') { snap.moves.push('SWAP'); return; }
      const c = t.split(',');
      if (c.length === 2 && /^\d+$/.test(c[0].trim()) && /^\d+$/.test(c[1].trim()))
        snap.moves.push([+c[0], +c[1]]);
      return;
    }
    const head = t.substring(0, i);
    const tail = t.substring(i + 1).trim();
    if (head === 'MESSAGE') {
      if (tail.startsWith('REALTIME')) {
        const r = tail.split(' ');
        if (r.length >= 3) {
          const p = r[2].split(',');
          if (r[1] === 'BEST') { snap.best = [+p[0], +p[1]]; snap.bestRev++; }
          else if (r[1] === 'LOST') { snap.lost.push([+p[0], +p[1]]); snap.lostRev++; }
        }
      }
      return;
    }
    if (head === 'INFO') {
      const sp = tail.indexOf(' ');
      const keyRaw = sp === -1 ? tail : tail.substring(0, sp);
      const val = sp === -1 ? '' : tail.substring(sp + 1).trim();
      // 完全复刻 gomoku.gd _on_engine_analysis 的既有语义：
      // NUMPV 切换当前槽位（不落盘）；其余键双写「当前槽位 + 全局」。
      // 键名转小写——GDScript 面板读的是小写键（depth/eval/winrate/bestline…）
      const key = keyRaw.toLowerCase();
      if (key === 'numpv') { curPv = parseInt(val, 10) || 0; return; }
      let parsed = val;
      if (key === 'depth' || key === 'seldepth' || key === 'nodes' || key === 'totalnodes'
          || key === 'totaltime' || key === 'speed') parsed = parseInt(val, 10) || -1;
      else if (key === 'winrate') parsed = parseFloat(val);
      else if (key === 'bestline') parsed = (val.match(/\d+,\d+/g) || []).map(s => s.split(',').map(Number));
      snap.global[key] = parsed;
      ensurePv(curPv)[key] = parsed;
      return;
    }
    if (head === 'FORBID') {
      const pairs = tail.match(/.{4}/g) || [];
      for (const s of pairs) {
        const m = s.match(/(\d\d)(\d\d)/);
        if (m) snap.forbid.push([+m[1], +m[2]]);
      }
      snap.forbidRev++;
      return;
    }
  }

  // 每帧单次跨界调用：返回 {moves, snap} JSON（走法取走即清，快照保留）。
  // push 回调已即时聚合（官方「回调即处理」同款），这里只序列化小快照——
  // 主线程开销趋近于零，不再有队列积压反向限速引擎。
  function pollFrame() {
    queue.length = 0;
    const moves = snap.moves;
    snap.moves = [];
    return JSON.stringify({ moves: moves, snap: snap });
  }

  function isInt(v) { return /^\d+$/.test(String(v).trim()); }

  window.RapfiBridge = { load, send, poll, pollAll, pollFrame, resetSnapshot: clearSnap,
                         isReady: () => ready, isThreaded: () => threaded };
})();

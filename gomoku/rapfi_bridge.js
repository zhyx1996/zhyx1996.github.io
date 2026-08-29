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

  function push(line) {
    if (line && String(line).trim() !== '') queue.push(String(line));
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

  window.RapfiBridge = { load, send, poll, pollAll, isReady: () => ready, isThreaded: () => threaded };
})();

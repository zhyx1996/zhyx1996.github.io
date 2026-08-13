/**
 * 五子棋引擎封装（Rapfi WASM，自适应多线程/单线程）
 * 参考 gomoku-calculator 的 engine.js：优先多线程 + SIMD，检测不支持时回退单线程 Worker。
 * 纯原生实现，无框架依赖。
 */
const GomokuEngine = (() => {
  let engineInstance = null;   // 多线程模式的 Emscripten 实例
  let worker = null;           // 单线程模式的 Worker
  let dataLoaded = false;
  let callback = null;
  let supportThreads = false;

  // ---- 输出解析（透传给上层）----
  function onEngineStdout(output) {
    if (!callback) return;
    const i = output.indexOf(' ');
    if (i === -1) {
      if (output === 'OK') return;
      if (output === 'SWAP') { callback({ swap: true }); return; }
      const coord = output.split(',');
      callback({ pos: [+coord[0], +coord[1]] });
      return;
    }
    const head = output.substring(0, i);
    const tail = output.substring(i + 1);
    if (head === 'MESSAGE') {
      if (tail.startsWith('REALTIME')) {
        const r = tail.split(' ');
        if (r.length < 3) callback({ realtime: { type: r[1] } });
        else {
          const coord = r[2].split(',');
          callback({ realtime: { type: r[1], pos: [+coord[0], +coord[1]] } });
        }
      } else {
        callback({ msg: tail });
      }
    } else if (head === 'INFO') {
      const j = tail.indexOf(' ');
      const h2 = tail.substring(0, j);
      const t2 = tail.substring(j + 1);
      if (h2 === 'PV') callback({ multipv: t2 });
      else if (h2 === 'NUMPV') callback({ numpv: +t2 });
      else if (h2 === 'DEPTH') callback({ depth: +t2 });
      else if (h2 === 'SELDEPTH') callback({ seldepth: +t2 });
      else if (h2 === 'NODES') callback({ nodes: +t2 });
      else if (h2 === 'TOTALNODES') callback({ totalnodes: +t2 });
      else if (h2 === 'TOTALTIME') callback({ totaltime: +t2 });
      else if (h2 === 'SPEED') callback({ speed: +t2 });
      else if (h2 === 'EVAL') callback({ eval: t2 });
      else if (h2 === 'WINRATE') callback({ winrate: parseFloat(t2) });
      else if (h2 === 'BESTLINE')
        callback({ bestline: (t2.match(/\d+,\d+/g) || []).map(s => s.split(',').map(Number)) });
    } else if (head === 'FORBID') {
      callback({ forbid: (tail.match(/.{4}/g) || []).map(s => {
        const m = s.match(/(\d\d)(\d\d)/);
        return [+m[1], +m[2]];
      }) });
    } else if (head === 'ERROR') {
      callback({ error: tail });
    } else if (head.indexOf(',') !== -1) {
      const c1 = head.split(',');
      const c2 = tail.split(',');
      callback({ pos: [+c1[0], +c1[1]], pos2: [+c2[0], +c2[1]] });
    }
  }

  function onEngineStatus(status) {
    if (dataLoaded) return;
    if (status === 'Running...' || status === '') {
      dataLoaded = true;
      callback({ loading: { progress: 1.0 } });
    }
    const match = status.match(/\((\d+)\/(\d+)\)/);
    if (match) {
      const loaded = parseInt(match[1], 10), total = parseInt(match[2], 10);
      callback({ loading: { progress: total ? loaded / total : 0 } });
    }
  }

  // ---- 特性检测 ----
  function isSharedArrayBufferSupported() {
    try { new SharedArrayBuffer(1); return true; }
    catch (e) { return false; }
  }

  function isSimdSupported() {
    try {
      // 最小 SIMD 模块：() -> v128，函数体为 v128.const
      return WebAssembly.validate(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // \0asm + version
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,       // type: () -> v128
        0x03, 0x02, 0x01, 0x00,                         // func section
        0x0a, 0x16, 0x01, 0x14, 0x00,                   // code section: 1 func, body 20B
        0xfd, 0x0c,                                     // v128.const
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 16B immediate
        0x0b,                                           // end
      ]));
    } catch (e) { return false; }
  }

  function isRelaxedSimdSupported() {
    try {
      // relaxed SIMD：i8x16.relaxed_swizzle (0xfd 0x100)
      return WebAssembly.validate(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x08, 0x01, 0x06, 0x00, 0xfd, 0x100, 0x00, 0x0b,
      ]));
    } catch (e) { return false; }
  }

  // ---- 内存参数 ----
  function getWasmMemoryArgs(isShared, maxMB = 2048) {
    return {
      initial: 64 * (1024 * 1024 / 65536),
      maximum: maxMB * (1024 * 1024 / 65536),
      shared: isShared,
    };
  }

  function instantiateSharedWasmMemory() {
    let maxMB = 2048;
    while (maxMB > 512) {
      try {
        const mem = new WebAssembly.Memory(getWasmMemoryArgs(true, maxMB));
        mem.grow(1);
        return mem;
      } catch (e) { maxMB /= 2; }
    }
    return new WebAssembly.Memory(getWasmMemoryArgs(true, maxMB));
  }

  function locateFile(url, engineDirURL) {
    // 重定向 rapfi-*.data 到统一的 rapfi.data
    if (/^rapfi.*\.data$/.test(url)) url = 'rapfi.data';
    return engineDirURL + url;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('script load failed: ' + url));
      document.head.appendChild(s);
    });
  }

  // ---- 加载引擎（自适应）----
  async function init(callbackFn, basePath) {
    callback = callbackFn;
    dataLoaded = false;

    // 拼完整绝对 URL（Worker 从 blob 创建，importScripts 需要同源绝对地址）
    const absBase = /^https?:/i.test(basePath)
      ? basePath
      : new URL(basePath, location.origin).href;

    supportThreads = isSharedArrayBufferSupported();
    const supportSIMD = isSimdSupported();
    // relaxed SIMD 需在多线程下才有意义（引擎产物只有 -multi-simd128-relaxed 一种 relaxed 版）
    const supportRelaxed = supportThreads && isRelaxedSimdSupported();

    // 组合引擎文件名：与 gomoku-calculator 一致
    // 注意：无 SIMD 的多线程产物不存在，故「多线程但无 SIMD」回退单线程
    let engineName;
    if (supportThreads && supportSIMD) {
      engineName = 'rapfi-multi-simd128' + (supportRelaxed ? '-relaxed' : '');
    } else {
      engineName = 'rapfi-single';
    }
    const engineURL = absBase + engineName + '.js';

    if (supportThreads && supportSIMD) {
      // 多线程路径：主线程动态加载脚本 + 共享内存实例化
      await loadScript(engineURL);
      const engineDirURL = engineURL.substring(0, engineURL.lastIndexOf('/') + 1);
      engineInstance = await self.Rapfi({
        locateFile: (url) => locateFile(url, engineDirURL),
        onReceiveStdout: onEngineStdout,
        onReceiveStderr: (o) => console.error('[Engine]', o),
        onExit: (c) => console.log('[Engine exit]', c),
        setStatus: onEngineStatus,
        wasmMemory: instantiateSharedWasmMemory(),
      });
      dataLoaded = true;
      callback({ ok: true, threads: true });
    } else {
      // 单线程路径：Worker importScripts
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'stdout') onEngineStdout(data);
        else if (type === 'stderr') console.error('[Engine]', data);
        else if (type === 'exit') console.log('[Engine exit]', data);
        else if (type === 'status') onEngineStatus(data);
        else if (type === 'ready') { dataLoaded = true; callback({ ok: true, threads: false }); }
      };
      worker.onerror = (err) => {
        console.error('[Worker error]', err.message);
        callback({ error: '引擎加载失败：' + err.message });
      };
      worker.postMessage({
        type: 'engineScriptURL',
        data: { engineURL, memoryArgs: getWasmMemoryArgs(false) },
      });
    }
    return engineURL;
  }

  function sendCommand(cmd) {
    if (typeof cmd !== 'string' || cmd.length === 0) return;
    if (supportThreads) {
      if (engineInstance) engineInstance.sendCommand(cmd);
    } else if (worker) {
      worker.postMessage({ type: 'command', data: cmd });
    }
  }

  function stopThinking() {
    sendCommand('YXSTOP');
    return false;
  }

  // 单线程 Worker 的源码
  const WORKER_SOURCE = `
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
          locateFile: function (url) {
            if (/^rapfi.*\\.data$/.test(url)) url = 'rapfi.data';
            return engineDirURL + url;
          },
          onReceiveStdout: function (o) { self.postMessage({ type: 'stdout', data: o }); },
          onReceiveStderr: function (o) { self.postMessage({ type: 'stderr', data: o }); },
          onExit: function (c) { self.postMessage({ type: 'exit', data: c }); },
          setStatus: function (s) { self.postMessage({ type: 'status', data: s }); },
          wasmMemory: data.memoryArgs ? new WebAssembly.Memory(data.memoryArgs) : undefined,
        }).then(function (inst) {
          EngineInstance = inst;
          self.postMessage({ type: 'ready' });
        });
      }
    };
  `;

  return { init, sendCommand, stopThinking };
})();

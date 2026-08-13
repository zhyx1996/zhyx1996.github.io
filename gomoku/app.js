/**
 * 五子棋引擎封装（Rapfi WASM，单线程 Worker 实现）
 * 参考 gomoku-calculator 的 engine.js 协议，纯原生实现，无框架依赖。
 */
const GomokuEngine = (() => {
  let worker = null;
  let dataLoaded = false;
  let callback = null;

  // 输出解析回调（透传给上层）
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

  function getWasmMemoryArgs() {
    return {
      initial: 64 * (1024 * 1024 / 65536),
      maximum: 2048 * (1024 * 1024 / 65536),
      shared: false,
    };
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

  // 加载引擎（单线程 Worker）
  async function init(callbackFn, basePath) {
    callback = callbackFn;
    dataLoaded = false;

    // 拼完整绝对 URL（Worker 从 blob 创建，importScripts 需要同源绝对地址）
    let engineURL = basePath + 'rapfi-single.js';
    if (!/^https?:/i.test(engineURL)) {
      engineURL = new URL(engineURL, location.origin).href;
    }

    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));
    worker.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === 'stdout') onEngineStdout(data);
      else if (type === 'stderr') console.error('[Engine]', data);
      else if (type === 'exit') console.log('[Engine exit]', data);
      else if (type === 'status') onEngineStatus(data);
      else if (type === 'ready') { dataLoaded = true; callback({ ok: true }); }
    };
    worker.onerror = (err) => {
      console.error('[Worker error]', err.message);
      callback({ error: '引擎加载失败：' + err.message });
    };
    worker.postMessage({
      type: 'engineScriptURL',
      data: { engineURL, memoryArgs: getWasmMemoryArgs() },
    });
    return engineURL;
  }

  function sendCommand(cmd) {
    if (typeof cmd !== 'string' || cmd.length === 0) return;
    if (worker) worker.postMessage({ type: 'command', data: cmd });
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

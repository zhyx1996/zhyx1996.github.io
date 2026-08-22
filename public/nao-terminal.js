(function () {
  'use strict';

  var terminal = null;
  var fitAddon = null;
  var socket = null;
  var encoder = new TextEncoder();

  function setStatus(text, state) {
    var status = document.getElementById('nao-terminal-status');
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state || '';
  }

  function fitTerminal() {
    if (!terminal || !fitAddon) return;
    try { fitAddon.fit(); } catch (_) { /* hidden tab or zero-sized container */ }
  }

  function writeMenu(message) {
    if (!terminal) return;
    terminal.reset();
    terminal.write([
      '\x1b[2J\x1b[H',
      ' ## nethack.alt.org - official NAO server',
      ' ## Games are recorded for viewing and playback.',
      ' ##',
      ' ## ' + message,
      '',
      '             c) Connect',
      '',
      ' => '
    ].join('\r\n'));
  }

  function disconnect() {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    setStatus('未连接', 'idle');
    var button = document.getElementById('nao-connect');
    if (button) button.textContent = '连接 NAO';
    writeMenu('Not connected.');
  }

  function connect() {
    if (!terminal || (socket && socket.readyState < 2)) return;
    fitTerminal();
    setStatus('连接中…', 'connecting');
    var button = document.getElementById('nao-connect');
    if (button) button.textContent = '连接中…';

    var url = 'wss://www.alt.org/wstty-wss?c=' + terminal.cols + '&l=' + terminal.rows;
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    socket.onopen = function () {
      setStatus('已连接', 'connected');
      if (button) button.textContent = '断开连接';
      terminal.focus();
    };
    socket.onmessage = function (event) {
      if (event.data instanceof ArrayBuffer) {
        terminal.write(new Uint8Array(event.data));
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then(function (buffer) {
          terminal.write(new Uint8Array(buffer));
        });
      } else {
        terminal.write(String(event.data));
      }
    };
    socket.onerror = function () {
      setStatus('连接失败', 'error');
    };
    socket.onclose = function () {
      socket = null;
      setStatus('连接已关闭', 'idle');
      if (button) button.textContent = '重新连接';
      terminal.write('\r\n\x1b[31mConnection closed. Press c to reconnect.\x1b[0m\r\n');
    };
  }

  function init() {
    var mount = document.getElementById('nao-terminal');
    var button = document.getElementById('nao-connect');
    if (!mount) return;
    if (!window.Terminal || !window.FitAddon || !window.FitAddon.FitAddon) {
      setStatus('终端组件加载失败，请刷新或使用新窗口', 'error');
      return;
    }

    terminal = new window.Terminal({
      cursorBlink: true,
      convertEol: false,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 15,
      scrollback: 1500,
      theme: {
        background: '#000000',
        foreground: '#aaaaaa',
        cursor: '#eeeeee',
        selectionBackground: '#555555'
      }
    });
    fitAddon = new window.FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(mount);
    fitTerminal();
    writeMenu('Not connected.');

    terminal.onData(function (data) {
      if (!socket || socket.readyState >= WebSocket.CLOSING) {
        if (data.toLowerCase() === 'c') connect();
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        // NAO's hterm client sends raw terminal bytes. ASCII covers NetHack
        // commands; TextEncoder also keeps pasted UTF-8 input usable.
        socket.send(encoder.encode(data));
      }
    });

    if (button) {
      button.addEventListener('click', function () {
        if (socket && socket.readyState < WebSocket.CLOSING) disconnect();
        else connect();
      });
    }
    window.addEventListener('resize', fitTerminal);
    window.NaoTerminal = { fit: fitTerminal, connect: connect };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());

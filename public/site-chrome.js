/*!
 * site-chrome.js — 全站公共 UI 单一来源
 *
 * 注入：skip-link、滚动进度条、侧边栏(active 按 data-page 判定)、
 *       返回顶部、页脚、Sakana(data-sakana)、PageAgent(data-pageagent)、COI 清理。
 *
 * 页面接入方式：
 *   <body data-page="stars" data-sakana data-pageagent>
 *   <script src="/public/site-chrome.js" defer></script>   ← 必须位于 /app.js 之前
 *
 * 改导航/页脚只改此文件，无需同步各个页面。
 * 注意：本文件不带 ?v= 缓存版本号——GitHub Pages 对 HTML 引用的静态资源
 * 下发 max-age=600，10 分钟内全网自然更新，免去六页手动升版号的同步负担。
 */
(function () {
  'use strict';

  var body = document.body;
  var page = body.getAttribute('data-page');
  if (!page) return; // 未标注的页面（如 embed-demo）不做任何注入

  /* 0. COI service worker 清理（注销历史遗留的根作用域 coi worker） */
  var coi = document.createElement('script');
  coi.src = '/public/cleanup-coi-serviceworker.js';
  document.head.appendChild(coi);

  /* 1. 无障碍跳转链接 + 顶部阅读进度条 */
  body.insertAdjacentHTML('afterbegin',
    '<a href="#main-content" class="skip-link">跳到主要内容</a>' +
    '<div class="scroll-progress" id="scroll-progress"></div>');

  /* 2. 侧边栏：插为 .layout 的第一个子元素，active 由 data-page 决定 */
  var NAV = [
    { key: 'index',    href: '/index.html',    label: '首页' },
    { key: 'projects', href: '/projects.html', label: '仓库' },
    { key: 'stars',    href: '/stars.html',    label: '收藏' },
    { key: 'articles', href: '/articles.html', label: '文章' },
    { key: 'nethack',  href: '/nethack.html',  label: 'NetHack' },
    { key: 'gomoku',   href: '/gomoku.html',   label: '五子棋' }
  ];
  var layout = document.querySelector('.layout');
  if (layout && !layout.querySelector('aside.sidebar')) {
    layout.insertAdjacentHTML('afterbegin',
      '<aside class="sidebar">' +
        '<div class="sidebar-brand">' +
          '<span class="logo-mark">扶</span>' +
          '<span class="logo-text">摇接海</span>' +
        '</div>' +
        '<nav class="sidebar-nav" aria-label="主导航">' +
          NAV.map(function (item) {
            var active = item.key === page ? ' active' : '';
            return '<a class="nav-item' + active + '" href="' + item.href + '">' + item.label + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="sidebar-footer">' +
          '<a class="sidebar-meta" href="https://github.com/zhyx1996" target="_blank" rel="noreferrer">GitHub</a>' +
        '</div>' +
      '</aside>');
  }

  /* 3. 返回顶部 + 页脚（追加到 body 末尾，均为 fixed/常规流末尾，视觉位置不变） */
  body.insertAdjacentHTML('beforeend',
    '<button class="back-to-top" id="back-to-top" aria-label="返回顶部">↑</button>' +
    '<footer class="footer">' +
      '<div class="footer-inner">' +
        '<p class="footer-epigraph">北海虽赊，扶摇可接。</p>' +
        '<p>扶摇接海 · © 2026 · 用代码和文字记录实践</p>' +
        '<p class="footer-updated">最后更新：<span id="last-modified">—</span></p>' +
      '</div>' +
    '</footer>');

  /* 4. Sakana 看板娘（仅 data-sakana 页面；gomoku 无此组件） */
  if (body.hasAttribute('data-sakana')) {
    var sakanaCss = document.createElement('link');
    sakanaCss.rel = 'stylesheet';
    sakanaCss.href = 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.css';
    document.head.appendChild(sakanaCss);

    var sakanaMount = document.createElement('div');
    sakanaMount.id = 'sakana-drag-widget';
    body.appendChild(sakanaMount);

    window.initSakanaWidget = function () {
      if (window.__sakanaWidgetInitialized) return;
      window.__sakanaWidgetInitialized = true;
      // 初始晃动改为左右摆为主 + 一点点上下浮动，阻尼略增大（一丢丢）：
      // chisato 默认初始态是 r=1°/y=40px/d=0.99 —— 角度位移太小、垂直位移太大，
      // 打开页面时几乎只有上下抖动且迟迟不停；这里覆盖为 r=26°(水平±25px 主导)、
      // y=6px(轻微上下)、d=0.985(衰减更快一点)。setState 为官方公开 API。
      window.sakanaInstance = new SakanaWidget({ size: 120, character: 'chisato', draggable: false })
        .setState({ r: 26, y: 6, t: 0, w: 0, d: 0.985 })
        .mount('#sakana-drag-widget');
    };

    (function loadSakanaWithFallback() {
      var script = document.createElement('script');
      script.async = true;
      script.onload = function () { window.initSakanaWidget && window.initSakanaWidget(); };
      script.onerror = function () {
        var fallback = document.createElement('script');
        fallback.async = true;
        fallback.onload = function () { window.initSakanaWidget && window.initSakanaWidget(); };
        fallback.src = 'https://fastly.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.js';
        document.head.appendChild(fallback);
      };
      script.src = 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.js';
      document.head.appendChild(script);
    })();
  }

  /* 5. PageAgent：页内 AI 助手（showPanel=false 保持初始收起，由 app.js 的按钮接管开关）
     注意：这里用 data-pageagent（无连字符），不能写成 data-page-agent——
     否则会被 app.js initPageAgentPlacement 的 [data-page-agent] 选择器当成面板本体，
     把 <body> 定位成 fixed/340px 小盒子，整页被压成一列。 */
  if (body.hasAttribute('data-pageagent')) {
    var pageAgent = document.createElement('script');
    pageAgent.src = 'https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js?v=2&showPanel=false';
    pageAgent.crossOrigin = 'anonymous';
    document.body.appendChild(pageAgent);
  }
})();

// ── 扶摇接海 · 个人主页 — 主脚本 ──

const GITHUB_USERNAME = 'zhyx1996';
const ARTICLE_LAST_SYNC = '2026年8月1日 09:31';

// ── 文章数据（博客园同步）──
const articleFallback = [
  {
    date: '2026年6月30日',
    title: 'Windows 下用 Python + GStreamer 推 RTSP 流并注入 SEI，以及 pyinstaller 打包',
    url: 'https://www.cnblogs.com/fix-me/p/20968815',
    summary: 'Windows + Python + GStreamer + 打包的实战记录，涵盖环境安装、RTSP 推流、SEI 注入与 pyinstaller 打包的完整流程与踩坑经验。'
  },
  {
    date: '2026年5月28日',
    title: '123云盘报错：检测到本地通信被防火墙或 VPN 拦截',
    url: 'https://www.cnblogs.com/fix-me/p/20194105',
    summary: '排查 123 云盘因本地通信被防火墙或 VPN 拦截导致的报错问题，通过日志定位根因并给出解决方案。'
  },
  {
    date: '2026年4月23日',
    title: '记录 GStreamer 打开 JPEG 编码的视频时出现段错误的原因',
    url: 'https://www.cnblogs.com/fix-me/p/19914336',
    summary: '排查 OpenCV 与 GStreamer 在同一进程处理 JPEG/MJPEG 视频时触发段错误的问题，定位到 libjpeg 与 nvjpeg 解码链路冲突，并给出替代解码与转码方案。'
  },
  {
    date: '2026年4月17日',
    title: 'CARLA 中的坐标系与标准车辆坐标系转换',
    url: 'https://www.cnblogs.com/fix-me/p/19882892',
    summary: '梳理 CARLA 的左手坐标系、Y 轴朝右和 Z-Y-X 欧拉角约定，并总结与标准车辆坐标系之间的位置、姿态与符号转换关系。'
  }
];

function renderLatestArticle() {
  const container = document.getElementById('latest-article');
  if (!container || articleFallback.length === 0) return;
  const latest = articleFallback.slice(0, 3);
  container.innerHTML = latest.map((article) => {
    const url = article.url || article.link;
    const date = article.date || fmtDate(article.published_at);
    const isNew = isWithinDays(article.date || article.published_at, 45);
    const badge = isNew ? '<span class="article-new-badge">新</span>' : '';
    const articleClass = isNew ? 'article-card new-article' : 'article-card';
    return `
    <article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${escapeHtml(date)}</span>
      </div>
      <h3>${badge}<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.summary)}</p>
    </article>
  `}).join('');

  const countEl = document.getElementById('article-count');
  if (countEl) countEl.textContent = `${articleFallback.length} 篇`;

  // 添加"在博客园查看更多"链接
  const moreLink = document.createElement('a');
  moreLink.className = 'section-link';
  moreLink.href = 'https://www.cnblogs.com/fix-me/';
  moreLink.target = '_blank';
  moreLink.rel = 'noreferrer';
  moreLink.textContent = '在博客园查看更多文章 →';
  container.appendChild(moreLink);

  // 添加最后同步时间戳
  const syncDiv = document.createElement('div');
  syncDiv.className = 'article-sync-time';
  syncDiv.textContent = `最后同步：${ARTICLE_LAST_SYNC}`;
  container.appendChild(syncDiv);
}

function renderArticles() {
  const container = document.querySelector('.article-list');
  if (!container) return;

  container.innerHTML = articleFallback.map(article => {
    const url = article.url || article.link;
    const date = article.date || fmtDate(article.published_at);
    const isNew = isWithinDays(article.date || article.published_at, 45);
    const badge = isNew ? '<span class="article-new-badge">新</span>' : '';
    const articleClass = isNew ? 'article-card new-article' : 'article-card';
    return `
    <article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${escapeHtml(date)}</span>
      </div>
      <h3>${badge}<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.summary)}</p>
    </article>
  `}).join('');

  // 添加「查看更多」链接
  const moreLink = document.createElement('a');
  moreLink.className = 'section-link';
  moreLink.href = 'https://www.cnblogs.com/fix-me/';
  moreLink.target = '_blank';
  moreLink.rel = 'noreferrer';
  moreLink.textContent = '在博客园查看更多文章 →';
  container.appendChild(moreLink);

  // 更新文章计数
  const statNum = document.querySelector('.stat-num');
  if (statNum) statNum.textContent = articleFallback.length;
}

// ── 工具函数 ──
const fmtDate = (value) => {
  if (!value) return '暂无';
  try {
    const d = new Date(value);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return '暂无'; }
};

const parseChineseDate = (value) => {
  if (!value) return null;
  const m = String(value).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
};

const isWithinDays = (value, days) => {
  const d = parseChineseDate(value);
  if (!d) return false;
  const diff = Date.now() - d.getTime();
  return diff >= 0 && diff <= days * 86400000;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── 市场快照（实时数据）──
const PROXY = 'https://corsproxy.io/?';

// ── 市场快照缓存（5 分钟 TTL）──
const MARKET_CACHE_KEY = 'market_cache_v1';
const MARKET_CACHE_TTL = 5 * 60 * 1000;

function getCachedMarket() {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > MARKET_CACHE_TTL) return null;
    return data.market;
  } catch { return null; }
}

function setCachedMarket(rates, btcPrice, goldPrice) {
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({
      market: { rates, btcPrice, goldPrice },
      timestamp: Date.now()
    }));
  } catch { /* quota exceeded or private mode */ }
}

function renderMarketFacts(items) {
  return items.map((item, i) => `
    <div class="market-card" style="--market-delay:${(i * 0.08).toFixed(2)}s">
      <div class="label">${escapeHtml(item.label)}</div>
      <div class="value">${escapeHtml(item.value)}</div>
      ${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ''}
      ${item.change ? `<div class="change ${item.change.dir}">${escapeHtml(item.change.text)}</div>` : ''}
    </div>
  `).join('');
}

function buildForexFacts(rates) {
  if (!rates) return [];
  const items = [];
  if (rates.CNY) items.push({ label: 'USD/CNY', value: rates.CNY.toFixed(4), note: '实时汇率' });
  if (rates.SGD) items.push({ label: 'USD/SGD', value: rates.SGD.toFixed(4), note: '实时汇率' });
  if (rates.JPY) items.push({ label: 'USD/JPY', value: rates.JPY.toFixed(2), note: '实时汇率' });
  if (rates.EUR) items.push({ label: 'USD/EUR', value: rates.EUR.toFixed(4), note: '实时汇率' });
  return items;
}

function buildCryptoFacts(btcPrice) {
  const items = [];
  if (btcPrice) {
    items.push({ label: 'Bitcoin', value: `$${btcPrice.toLocaleString()}`, note: '实时价格' });
  }
  return items;
}

function buildGoldFacts(goldPrice) {
  const items = [];
  if (goldPrice) {
    items.push({ label: '黄金', value: `$${goldPrice.toLocaleString()}/盎司`, note: '实时价格' });
  }
  return items;
}

function renderMarket(rates, btcPrice, goldPrice) {
  const container = document.getElementById('market-grid');
  if (!container) return;
  const parts = [
    ...buildForexFacts(rates),
    ...buildCryptoFacts(btcPrice),
    ...buildGoldFacts(goldPrice),
  ];

  // 移除已有的更新时间戳，避免重复
  const existingUpdated = container.parentNode.querySelector('.market-updated');
  if (existingUpdated) existingUpdated.remove();

  if (parts.length === 0) {
    container.innerHTML = '<div class="market-card" style="grid-column:1/-1;text-align:center;"><div class="label">数据暂不可用</div><div class="value" style="font-size:13px;"><button type="button" id="market-retry" style="color:var(--accent);font-weight:500;background:none;border:none;padding:0;font:inherit;cursor:pointer;">点击重试 ↻</button></div></div>';
    const retryLink = document.getElementById('market-retry');
    if (retryLink) {
      retryLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadMarket();
      });
    }
  } else {
    container.innerHTML = renderMarketFacts(parts);
  }

  // 添加数据更新时间戳
  const updated = document.createElement('div');
  updated.className = 'market-updated';
  const now = new Date();
  updated.textContent = `更新于 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  container.parentNode.appendChild(updated);
}

function fetchWithTimeout(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(url)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function loadMarket() {
  const container = document.getElementById('market-grid');
  if (!container) return;

  // 优先展示缓存数据，减少等待时间
  const cached = getCachedMarket();
  if (cached) {
    renderMarket(cached.rates, cached.btcPrice, cached.goldPrice);
  }

  // 汇率 API（免费无需密钥）
  const fetchRates = async () => {
    try {
      const res = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) return null;
      const data = await res.json();
      return data.rates || null;
    } catch { return null; }
  };

  // Bitcoin 价格（CoinGecko，免费无需密钥）
  const fetchBtc = async () => {
    try {
      const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      if (!res.ok) return null;
      const data = await res.json();
      return data.bitcoin?.usd || null;
    } catch { return null; }
  };

  // 黄金价格（通过代理避开 CORS）
  const fetchGold = async () => {
    try {
      const res = await fetchWithTimeout(PROXY + encodeURIComponent('https://api.gold-api.com/price/XAU'));
      if (!res.ok) return null;
      const data = await res.json();
      return data.price || data[0]?.price || null;
    } catch { return null; }
  };

  const [rates, btcPrice, goldPrice] = await Promise.all([
    fetchRates(),
    fetchBtc(),
    fetchGold(),
  ]);

  if (rates || btcPrice || goldPrice) {
    setCachedMarket(rates, btcPrice, goldPrice);
    renderMarket(rates, btcPrice, goldPrice);
  } else if (!cached) {
    renderMarket(null, null, null);
  }
}

// ── Sakana 拖拽小球（物理弹跳）──
function initSakanaDrag() {
  const widget = document.getElementById('sakana-drag-widget');
  if (!widget) return;

  let isDragging = false;
  let vx = 0, vy = 0;
  let lastX, lastY, lastTime;
  let animId = null;
  let vxHistory = [];
  let vyHistory = [];
  // 用 left/top 定位
  let leftPos = 0, topPos = 0;
  let initialized = false;

  const setPos = (l, t) => {
    leftPos = l;
    topPos = t;
    widget.style.left = l + 'px';
    widget.style.top = t + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  };

  const getXY = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  // 拖拽时：根据速度倾斜人偶，平滑过渡防鬼畜
  let currentR = 0;
  const applyCharLean = () => {
    const sakana = window.sakanaInstance;
    if (!sakana) return;
    sakana._running = false;
    const targetR = Math.max(-25, Math.min(25, vx * 0.4));
    currentR += (targetR - currentR) * 0.3;
    sakana._state.r = currentR;
    sakana._draw();
  };

  const initPosition = () => {
    if (initialized) return;
    const rect = widget.getBoundingClientRect();
    leftPos = rect.left;
    topPos = rect.top;
    initialized = true;
  };

  const onPointerDown = (e) => {
    if (e.target.closest('.sakana-widget-ctrl')) return;
    const xy = getXY(e);
    isDragging = true;
    widget.classList.add('dragging');
    initPosition();
    const sakana = window.sakanaInstance;
    if (sakana) {
      sakana._running = false;
      currentR = sakana._state.r;
    }
    lastX = xy.x;
    lastY = xy.y;
    lastTime = Date.now();
    vx = 0;
    vy = 0;
    vxHistory = [];
    vyHistory = [];
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const xy = getXY(e);
    const now = Date.now();
    const dx = xy.x - lastX;
    const dy = xy.y - lastY;

    let newLeft = leftPos + dx;
    let newTop = topPos + dy;

    // 边界限制
    const widgetW = widget.offsetWidth;
    const widgetH = widget.offsetHeight;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    newLeft = Math.max(-widgetW * 0.5, Math.min(viewportW - widgetW * 0.5, newLeft));
    newTop = Math.max(-widgetH * 0.5, Math.min(viewportH - widgetH * 0.5, newTop));

    setPos(newLeft, newTop);
    applyCharLean();

    vxHistory.push(dx);
    vyHistory.push(dy);
    if (vxHistory.length > 5) vxHistory.shift();
    if (vyHistory.length > 5) vyHistory.shift();

    vx = dx;
    vy = dy;
    lastX = xy.x;
    lastY = xy.y;
    lastTime = now;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('dragging');

    if (vxHistory.length > 0) {
      let totalWeight = 0;
      let weightedVx = 0;
      let weightedVy = 0;
      for (let i = 0; i < vxHistory.length; i++) {
        const weight = i + 1;
        weightedVx += vxHistory[i] * weight;
        weightedVy += vyHistory[i] * weight;
        totalWeight += weight;
      }
      vx = weightedVx / totalWeight;
      vy = weightedVy / totalWeight;
    }

    const maxV = 25;
    vx = Math.max(-maxV, Math.min(maxV, vx));
    vy = Math.max(-maxV, Math.min(maxV, vy));

    // 释放时：根据拖动速度设置初始角度，w=0 让弹簧自然回弹
    // 原版 SakanaWidget 也是纯位移驱动，不额外设置角速度
    const sakana = window.sakanaInstance;
    if (sakana) {
      sakana._lastRunUnix = Date.now();
      sakana._state.r = Math.max(-25, Math.min(25, vx * 0.5));
      sakana._state.y = Math.max(-15, Math.min(15, vy * 0.3));
      sakana._state.w = 0;
      sakana._state.t = 0;
      sakana._running = true;
      sakana._run();
    }

    startBounce();
  };

  const startBounce = () => {
    if (animId) cancelAnimationFrame(animId);
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const widgetW = widget.offsetWidth;
    const widgetH = widget.offsetHeight;

    const bounce = () => {
      vx *= 0.96;
      vy *= 0.96;

      let nextLeft = leftPos + vx;
      let nextTop = topPos + vy;

      if (nextLeft <= 0) {
        nextLeft = 0;
        vx = Math.abs(vx) * 0.75;
      }
      if (nextLeft >= viewportW - widgetW) {
        nextLeft = viewportW - widgetW;
        vx = -Math.abs(vx) * 0.75;
      }
      if (nextTop <= 0) {
        nextTop = 0;
        vy = Math.abs(vy) * 0.75;
      }
      if (nextTop >= viewportH - widgetH) {
        nextTop = viewportH - widgetH;
        vy = -Math.abs(vy) * 0.75;
      }

      setPos(nextLeft, nextTop);

      if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) {
        const sakana = window.sakanaInstance;
        if (sakana) {
          sakana._state.r = 0;
          sakana._state.y = 0;
          sakana._draw();
        }
        currentR = 0;
        animId = null;
        return;
      }

      animId = requestAnimationFrame(bounce);
    };
    animId = requestAnimationFrame(bounce);
  };

  widget.addEventListener('mousedown', onPointerDown);
  widget.addEventListener('touchstart', onPointerDown, { passive: false });
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('mouseup', onPointerUp);
  document.addEventListener('touchend', onPointerUp);
}

// ── Steam 资料（解析个人主页 HTML）──
async function loadSteamProfile() {
  const container = document.getElementById('steam-profile');
  if (!container) return;

  const STEAM_ID64 = '76561198391062314';

  try {
    const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent('https://steamcommunity.com/profiles/' + STEAM_ID64 + '/')}`, 15000);
    if (!res.ok) throw new Error('fetch failed');
    const html = await res.text();

    const avatarMatch = html.match(/avatars\.cloudflare\.steamstatic\.com\/([a-f0-9]+)_full\.jpg/);
    const avatarUrl = avatarMatch ? `https://avatars.cloudflare.steamstatic.com/${avatarMatch[1]}_full.jpg` : '';
    const nameMatch = html.match(/actual_persona_name">([^<]+)</);
    const username = nameMatch ? nameMatch[1].trim() : '';
    const levelMatch = html.match(/friendPlayerLevelNum[^>]*>(\d+)</);
    const level = levelMatch ? levelMatch[1] : '';

    const badgeCounts = [...html.matchAll(/profile_count_link_total[^>]*>([^<]+)</g)].map(m => m[1].trim());
    const badgeLabels = [...html.matchAll(/count_link_label[^>]*>([^<]+)</g)].map(m => m[1].trim());
    const stats = {};
    badgeLabels.forEach((label, i) => { stats[label] = badgeCounts[i] || ''; });

    const names = [...html.matchAll(/class="game_name"><a[^>]*>([^<]+)<\/a>/g)].map(m => m[1]);
    const hours = [...html.matchAll(/总时数 ([\d.]+) 小时/g)].map(m => parseFloat(m[1]));
    const covers = [...html.matchAll(/game_capsule" src="([^"]+)"/g)].map(m => m[1]);

    const games = names.map((name, i) => ({
      name,
      hours: hours[i] || 0,
      cover: covers[i] || ''
    })).filter(g => g.name && g.hours > 0);

    const totalHours = games.reduce((sum, g) => sum + g.hours, 0);

    if (games.length === 0) {
      container.innerHTML = '<div class="steam-empty"><span>暂无游戏数据</span><a href="https://steamcommunity.com/profiles/76561198391062314/" target="_blank" rel="noreferrer">在 Steam 上查看 \u2192</a></div>';
      return;
    }

    container.innerHTML = `
      <div class="steam-profile-card">
        <div class="steam-header">
          <img class="steam-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(username)}" width="48" height="48">
          <div class="steam-id">
            <span class="steam-username">${escapeHtml(username)}</span>
            ${level ? `<span class="steam-level">Lv.${escapeHtml(level)}</span>` : ''}
          </div>
        </div>
        <div class="steam-stats">
          <span class="steam-stat">🎮 ${escapeHtml(stats['游戏'] || '-')} 款游戏</span>
          <span class="steam-stat">🏅 ${escapeHtml(stats['徽章'] || '-')} 枚徽章</span>
          <span class="steam-stat">⏱️ ${totalHours.toFixed(0)} 小时</span>
          <span class="steam-stat">👥 ${escapeHtml(stats['好友'] || '-')} 位好友</span>
        </div>
      </div>
      <div class="steam-games-list">
        ${games.map(g => `
          <div class="steam-game-card">
            <img class="steam-game-cover" src="${escapeHtml(g.cover)}" alt="${escapeHtml(g.name)}" loading="lazy" onerror="this.style.visibility='hidden';this.parentElement.style.background='var(--bg-inset)'">
            <div class="steam-game-info">
              <span class="steam-game-title">${escapeHtml(g.name)}</span>
              <span class="steam-game-hours">${g.hours.toFixed(1)} 小时</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch {
    container.innerHTML = '<div class="steam-empty"><span>无法加载游戏数据</span><a href="https://steamcommunity.com/profiles/76561198391062314/" target="_blank" rel="noreferrer">在 Steam 上查看 \u2192</a></div>';
  }
}

// ── 滚动进度条 ──
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) { bar.style.width = '0'; return; }
    const progress = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
    bar.style.width = progress + '%';
  }, { passive: true });
}

// ── 返回顶部 ──
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── 滚动动画 ──
function initScrollAnimations() {
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  sections.forEach(section => observer.observe(section));
}

// ── 页脚最后更新 ──
function initFooterUpdated() {
  const el = document.getElementById('last-modified');
  if (!el) return;
  try {
    const d = new Date(document.lastModified);
    el.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    el.textContent = '—';
  }
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  loadMarket();
  loadSteamProfile();
  renderArticles();
  renderLatestArticle();
  initScrollAnimations();
  initScrollProgress();
  initBackToTop();
  initFooterUpdated();

  // 市场快照刷新按钮
  const marketRefreshBtn = document.getElementById('market-refresh');
  if (marketRefreshBtn) {
    marketRefreshBtn.addEventListener('click', () => {
      marketRefreshBtn.classList.add('spinning');
      setTimeout(() => marketRefreshBtn.classList.remove('spinning'), 600);
      loadMarket();
    });
  }
  // Sakana widget 加载完成后初始化拖拽
  const checkSakana = setInterval(() => {
    const widget = document.getElementById('sakana-drag-widget');
    if (widget && widget.querySelector('canvas')) {
      clearInterval(checkSakana);
      initSakanaDrag();
    }
  }, 200);
  // 10秒后停止检查
  setTimeout(() => clearInterval(checkSakana), 10000);
});

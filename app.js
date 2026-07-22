// ── 扶摇接海 · 个人主页 — 主脚本 ──

const GITHUB_USERNAME = 'zhyx1996';

// ── 工具函数 ──
const fmtDate = (value) => {
  if (!value) return '暂无';
  try {
    const d = new Date(value);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return '暂无'; }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── 个人资料（GitHub）──
async function loadProfile() {
  // 新设计不再需要填充个人资料元素，保留函数以备将来使用
}

// ── 市场快照（实时数据）──
const PROXY = 'https://corsproxy.io/?';

function renderMarketFacts(items) {
  return items.map(item => `
    <div class="market-card">
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
  container.innerHTML = renderMarketFacts(parts);
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

  renderMarket(rates, btcPrice, goldPrice);
}

// ── Sakana 拖拽小球（物理弹跳）──
function initSakanaDrag() {
  const widget = document.getElementById('sakana-drag-widget');
  if (!widget) return;

  let isDragging = false;
  let vx = 0, vy = 0;
  let lastX, lastY, lastTime;
  let animId = null;
  // 用于记录最近几帧的速度，做加权平均
  let vxHistory = [];
  let vyHistory = [];

  const onPointerDown = (e) => {
    if (e.target.closest('.sakana-widget-ctrl')) return;
    isDragging = true;
    widget.classList.add('dragging');
    lastX = e.clientX;
    lastY = e.clientY;
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
    const now = Date.now();
    const dt = Math.max(1, now - lastTime);
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const rect = widget.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const widgetW = rect.width;
    const widgetH = rect.height;

    let newLeft = rect.left + dx;
    let newTop = rect.top + dy;

    // 限制拖拽范围（允许拖出半个身位）
    newLeft = Math.max(-widgetW * 0.5, Math.min(viewportW - widgetW * 0.5, newLeft));
    newTop = Math.max(-widgetH * 0.5, Math.min(viewportH - widgetH * 0.5, newTop));

    widget.style.left = newLeft + 'px';
    widget.style.top = newTop + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';

    // 计算瞬时速度（像素/帧）
    const instVx = dx;
    const instVy = dy;
    vxHistory.push(instVx);
    vyHistory.push(instVy);
    if (vxHistory.length > 5) vxHistory.shift();
    if (vyHistory.length > 5) vyHistory.shift();

    vx = instVx;
    vy = instVy;
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = now;
  };

  // 鼠标离开窗口时保持最后的速度
  const onPointerLeave = () => {
    if (!isDragging) return;
    // 不立即释放，让速度保持，这样拖出边界后还会反弹
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('dragging');

    // 使用加权平均速度（最近帧权重更高）
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

    // 限制最大速度
    const maxV = 25;
    vx = Math.max(-maxV, Math.min(maxV, vx));
    vy = Math.max(-maxV, Math.min(maxV, vy));

    startBounce();
  };

  const startBounce = () => {
    if (animId) cancelAnimationFrame(animId);
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const bounce = () => {
      const widgetW = widget.offsetWidth;
      const widgetH = widget.offsetHeight;
      let left = parseFloat(widget.style.left || 0);
      let top = parseFloat(widget.style.top || 0);

      // 摩擦
      vx *= 0.96;
      vy *= 0.96;

      left += vx;
      top += vy;

      let bounced = false;

      // 左边界
      if (left <= 0) {
        left = 0;
        vx = Math.abs(vx) * 0.75;
        bounced = true;
      }
      // 右边界
      if (left >= viewportW - widgetW) {
        left = viewportW - widgetW;
        vx = -Math.abs(vx) * 0.75;
        bounced = true;
      }
      // 上边界
      if (top <= 0) {
        top = 0;
        vy = Math.abs(vy) * 0.75;
        bounced = true;
      }
      // 下边界
      if (top >= viewportH - widgetH) {
        top = viewportH - widgetH;
        vy = -Math.abs(vy) * 0.75;
        bounced = true;
      }

      widget.style.left = left + 'px';
      widget.style.top = top + 'px';

      // 如果速度太小就停止
      if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) {
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
  document.addEventListener('mouseleave', onPointerLeave);
}

// ── Steam 资料（动态获取）──
async function loadSteamProfile() {
  const container = document.getElementById('steam-profile');
  if (!container) return;

  const STEAM_ID64 = '76561198391062314';
  const proxyUrl = 'https://corsproxy.io/?';
  const steamUrl = `https://steamcommunity.com/profiles/${STEAM_ID64}/?xml=1`;

  try {
    const res = await fetchWithTimeout(proxyUrl + encodeURIComponent(steamUrl));
    if (!res.ok) throw new Error('Steam API error');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    const steamID = xml.querySelector('steamID')?.textContent || '扶摇接海';
    const avatarFull = xml.querySelector('avatarFull')?.textContent || 'https://avatars.fastly.steamstatic.com/3669d88e971f3ff0da8b146fc370f67b6d0be705_full.jpg';
    const onlineState = xml.querySelector('onlineState')?.textContent || 'offline';
    const stateMessage = xml.querySelector('stateMessage')?.textContent || '';

    const isOnline = onlineState === 'online';
    const statusText = isOnline ? (stateMessage || '在线') : '离线';
    const profileUrl = `https://steamcommunity.com/profiles/${STEAM_ID64}/`;

    container.innerHTML = `
      <a href="${escapeHtml(profileUrl)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;gap:12px;">
        <img class="steam-avatar" src="${escapeHtml(avatarFull)}" alt="Steam avatar" width="64" height="64">
        <div>
          <strong>${escapeHtml(steamID)}</strong>
          <span style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${isOnline ? '#4ADE80' : '#888'}"></span>
            ${escapeHtml(statusText)}
          </span>
        </div>
      </a>
    `;
  } catch {
    // 失败时保持原有静态内容
  }
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

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadMarket();
  loadSteamProfile();
  initScrollAnimations();
  initBackToTop();
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

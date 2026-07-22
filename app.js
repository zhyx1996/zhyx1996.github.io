// ── 扶摇接海 · 个人主页 — 主脚本 ──

const GITHUB_USERNAME = 'zhyx1996';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}`;
const GOLD_API_BASE_URL = 'https://www.gold-api.com/api/XAU/USD';
const GOLD_LEGACY_API_URL = 'https://api.gold-api.com/price/XAU';

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

// ── 个人资料 ──
async function loadProfile() {
  const nameEl = document.getElementById('profile-name');
  const loginEl = document.getElementById('profile-login');
  const bioEl = document.getElementById('profile-bio');
  const avatarEl = document.getElementById('profile-avatar');

  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (nameEl) nameEl.textContent = data.name || GITHUB_USERNAME;
    if (loginEl) loginEl.textContent = '@' + data.login;
    if (bioEl) bioEl.textContent = data.bio || '围绕计算机视觉、自动驾驶感知、并行计算与公开写作做持续实践。';
    if (avatarEl && data.avatar_url) avatarEl.src = data.avatar_url;
  } catch {
    if (nameEl) nameEl.textContent = '扶摇接海';
    if (loginEl) loginEl.textContent = '@' + GITHUB_USERNAME;
  }
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

// ── Sakana 拖拽小球（限制在视口内 + 弹跳）──
function initSakanaDrag() {
  const widget = document.getElementById('sakana-drag-widget');
  if (!widget) return;

  let isDragging = false;
  let vx = 0, vy = 0; // 速度
  let lastX, lastY;
  let animId = null;

  const onPointerDown = (e) => {
    if (e.target.closest('.sakana-widget-ctrl')) return;
    isDragging = true;
    widget.classList.add('dragging');
    lastX = e.clientX;
    lastY = e.clientY;
    vx = 0;
    vy = 0;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const rect = widget.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const widgetW = rect.width;
    const widgetH = rect.height;

    // 计算新的 left/top
    let newLeft = rect.left + (e.clientX - lastX);
    let newTop = rect.top + (e.clientY - lastY);

    // 限制在视口内
    newLeft = Math.max(0, Math.min(viewportW - widgetW, newLeft));
    newTop = Math.max(0, Math.min(viewportH - widgetH, newTop));

    widget.style.left = newLeft + 'px';
    widget.style.top = newTop + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';

    // 计算速度（用于抛出时的惯性）
    vx = (e.clientX - lastX);
    vy = (e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('dragging');
    // 开始惯性 + 弹跳动画
    startBounce();
  };

  const startBounce = () => {
    if (animId) cancelAnimationFrame(animId);
    const bounce = () => {
      const rect = widget.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const widgetW = rect.width;
      const widgetH = rect.height;

      let left = parseFloat(widget.style.left || 0);
      let top = parseFloat(widget.style.top || 0);

      // 摩擦
      vx *= 0.95;
      vy *= 0.95;

      left += vx;
      top += vy;

      // 边界弹跳
      if (left <= 0) { left = 0; vx = -vx * 0.7; }
      if (left >= viewportW - widgetW) { left = viewportW - widgetW; vx = -vx * 0.7; }
      if (top <= 0) { top = 0; vy = -vy * 0.7; }
      if (top >= viewportH - widgetH) { top = viewportH - widgetH; vy = -vy * 0.7; }

      widget.style.left = left + 'px';
      widget.style.top = top + 'px';

      // 速度足够小时停止
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        animId = requestAnimationFrame(bounce);
      } else {
        animId = null;
      }
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

// ── Steam 资料（动态获取）──
async function loadSteamProfile() {
  const container = document.querySelector('.steam-card');
  if (!container) return;

  // Steam 自定义 URL ID（不是账号名）
  const STEAM_CUSTOM_ID = 'zhyx490991014';
  const proxyUrl = 'https://corsproxy.io/?';
  const steamUrl = `https://steamcommunity.com/id/${STEAM_CUSTOM_ID}/?xml=1`;

  try {
    const res = await fetchWithTimeout(proxyUrl + encodeURIComponent(steamUrl));
    if (!res.ok) throw new Error('Steam API error');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    const steamID = xml.querySelector('steamID')?.textContent || '扶摇接海';
    const steamID64 = xml.querySelector('steamID64')?.textContent || '';
    const avatarFull = xml.querySelector('avatarFull')?.textContent || 'https://avatars.fastly.steamstatic.com/3669d88e971f3ff0da8b146fc370f67b6d0be705_full.jpg';
    const onlineState = xml.querySelector('onlineState')?.textContent || 'offline';
    const stateMessage = xml.querySelector('stateMessage')?.textContent || '';
    const visibilityState = xml.querySelector('visibilityState')?.textContent || '3';

    const isOnline = onlineState === 'online';
    const statusText = isOnline ? (stateMessage || '在线') : '离线';
    const profileUrl = steamID64
      ? `https://steamcommunity.com/profiles/${steamID64}/`
      : `https://steamcommunity.com/id/${STEAM_CUSTOM_ID}/`;

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

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadMarket();
  loadSteamProfile();
  // Sakana widget 加载完成后初始化拖拽
  const checkSakana = setInterval(() => {
    const widget = document.getElementById('sakana-widget');
    if (widget && widget.querySelector('canvas')) {
      clearInterval(checkSakana);
      initSakanaDrag();
    }
  }, 200);
  // 10秒后停止检查
  setTimeout(() => clearInterval(checkSakana), 10000);
});

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

// ── Sakana 拖拽（限制在视口内）──
function initSakanaDrag() {
  const widget = document.getElementById('sakana-widget');
  if (!widget) return;

  // Sakana widget 是 fixed 定位，我们需要改为 absolute 或在容器内拖拽
  // 改为在 specimen-stage 内拖拽
  const stage = document.getElementById('sakana-stage');
  if (!stage) return;

  // 将 widget 改为 absolute 定位，限制在 stage 内
  widget.style.position = 'absolute';
  widget.style.bottom = 'auto';
  widget.style.right = 'auto';
  widget.style.left = '50%';
  widget.style.top = '50%';
  widget.style.transform = 'translate(-50%, -50%)';
  widget.style.cursor = 'grab';
  widget.style.transition = 'none';
  widget.style.zIndex = '1';

  let isDragging = false;
  let startX, startY, startLeft, startTop;
  const readoutX = document.getElementById('readout-x');
  const readoutY = document.getElementById('readout-y');

  const updateReadout = (left, top) => {
    if (readoutX) readoutX.textContent = Math.round(left);
    if (readoutY) readoutY.textContent = Math.round(top);
  };

  const onPointerDown = (e) => {
    // 不拦截控制按钮
    if (e.target.closest('.sakana-widget-ctrl')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    startLeft = rect.left - stageRect.left;
    startTop = rect.top - stageRect.top;
    widget.style.cursor = 'grabbing';
    widget.style.left = startLeft + 'px';
    widget.style.top = startTop + 'px';
    widget.style.transform = 'none';
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const stageRect = stage.getBoundingClientRect();
    const widgetW = widget.offsetWidth;
    const widgetH = widget.offsetHeight;
    // 限制在 stage 内
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    newLeft = Math.max(0, Math.min(stageRect.width - widgetW, newLeft));
    newTop = Math.max(0, Math.min(stageRect.height - widgetH, newTop));
    widget.style.left = newLeft + 'px';
    widget.style.top = newTop + 'px';
    updateReadout(newLeft, newTop);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    widget.style.cursor = 'grab';
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

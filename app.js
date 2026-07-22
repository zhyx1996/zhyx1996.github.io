// ── 扶摇接海 · 个人主页 — 主脚本 ──

// ── 配置 ──
const GITHUB_USERNAME = 'zhyx1996';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}`;
const GOLD_API_BASE_URL = 'https://www.gold-api.com/api/XAU/USD';
const GOLD_LEGACY_API_URL = 'https://api.gold-api.com/price/XAU';
const GOLD_DAILY_SERIES_URL = 'https://freegoldapi.com/data/latest.json';
const GOLD_TROY_OUNCE_GRAMS = 31.1034768;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const GAS92_PRICE_RANGE = { min: 5, max: 10 };
const GAS92_SUCCESS_CODES = new Set([0, 200, '0', '200']);

// ── 工具函数 ──
const fmtDate = (value) => {
  if (!value) return '暂无';
  try {
    const d = new Date(value);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return '暂无'; }
};

const safeText = (value, fallback = '暂无') => value || fallback;

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
    const res = await fetchWithTimeout(GITHUB_API);
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

// ── 市场快照 ──
const marketFallback = {
  usdCny: { rate: 7.25, note: '静态快照时间（2026-04-24）', source: '静态快照' },
  sgdCny: { rate: 5.55, note: '静态快照时间（2026-04-24）', source: '静态快照' },
  jpyPerCny: { rate: 20.85, note: '静态快照时间（2026-04-24）', source: '静态快照' },
  gold: { price: 3315.50, unit: 'USD/盎司', note: '静态快照时间（2026-04-24）', source: '静态快照' },
  btc: { price: 94500, unit: 'USD', note: '静态快照时间（2026-04-24）', source: '静态快照' },
  gas92: { cnyPerLiter: 8.51, note: '联网成功后展示全国92#汽油均价；当前为静态参考值', source: '静态快照（2026-04-24）' },
  asOf: '2026-04-24T00:00:00Z'
};

const renderMarketFacts = (items) => items.map(item => `
    <div class="market-card">
        <div class="label">${escapeHtml(item.label)}</div>
        <div class="value">${escapeHtml(item.value)}</div>
        ${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ''}
        ${item.change ? `<div class="change ${item.change.dir}">${escapeHtml(item.change.text)}</div>` : ''}
    </div>
`).join('');

function buildForexFacts(data) {
  const items = [];
  if (data.usdCny) {
    items.push({ label: 'USD/CNY', value: data.usdCny.rate.toFixed(4), note: data.usdCny.note });
  }
  if (data.sgdCny) {
    items.push({ label: 'SGD/CNY', value: data.sgdCny.rate.toFixed(4), note: data.sgdCny.note });
  }
  if (data.jpyPerCny) {
    items.push({ label: 'JPY/CNY', value: data.jpyPerCny.rate.toFixed(2), note: data.jpyPerCny.note });
  }
  return items;
}

function buildGoldFacts(data) {
  const items = [];
  if (data.gold) {
    items.push({
      label: '黄金',
      value: `$${data.gold.price.toLocaleString()}/盎司`,
      note: data.gold.note,
      change: data.gold.changePercent ? {
        dir: data.gold.changePercent >= 0 ? 'up' : 'down',
        text: `${data.gold.changePercent >= 0 ? '+' : ''}${data.gold.changePercent.toFixed(2)}%`
      } : null
    });
  }
  if (data.btc) {
    items.push({
      label: 'Bitcoin',
      value: `$${data.btc.price.toLocaleString()}`,
      note: data.btc.note
    });
  }
  return items;
}

function buildGasFacts(data) {
  const items = [];
  if (data.gas92) {
    items.push({
      label: '92#汽油',
      value: `¥${data.gas92.cnyPerLiter.toFixed(2)}/升`,
      note: data.gas92.note
    });
  }
  return items;
}

function renderMarket(data, statuses = {}) {
  const container = document.getElementById('market-grid');
  if (!container) return;

  const fxFacts = buildForexFacts(data);
  const goldFacts = buildGoldFacts(data);
  const gasFacts = buildGasFacts(data);

  container.innerHTML = `
    <div class="market-col">
      ${renderMarketFacts(fxFacts)}
    </div>
    <div class="market-col">
      ${renderMarketFacts(goldFacts)}
      ${renderMarketFacts(gasFacts)}
    </div>
  `;
}

function fetchWithTimeout(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(url)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function fetchGoldPrice() {
  const candidates = [
    { url: GOLD_API_BASE_URL, source: 'GoldAPI' },
    { url: GOLD_LEGACY_API_URL, source: 'GoldAPI Legacy' },
  ];

  for (const c of candidates) {
    try {
      const res = await fetchWithTimeout(c.url);
      if (!res.ok) continue;
      const data = await res.json();
      const price = data.price || data[0]?.price;
      if (price) return { price, source: c.source };
    } catch { continue; }
  }
  return null;
}

async function loadMarket() {
  const container = document.getElementById('market-grid');
  if (!container) return;

  // Render fallback first
  renderMarket(marketFallback);

  // Try to fetch live gold price
  const gold = await fetchGoldPrice();
  if (gold) {
    const updated = {
      ...marketFallback,
      gold: { ...marketFallback.gold, price: gold.price, note: `实时数据（${gold.source}）`, source: gold.source }
    };
    renderMarket(updated);
  }
}

// ── 主题切换 ──
const THEME_KEY = 'theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeToggle(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeToggle(next);
}

function updateThemeToggle(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Sakana Widget 拖拽 ──
function initSakanaDrag() {
  const widget = document.getElementById('sakana-widget');
  if (!widget) return;

  let isDragging = false;
  let startX, startY, startRight, startBottom;

  const onStart = (e) => {
    const target = e.touches ? e.touches[0] : e;
    if (target.target && target.target.closest && target.target.closest('.sakana-widget-ctrl')) return;
    isDragging = true;
    startX = target.clientX;
    startY = target.clientY;
    const rect = widget.getBoundingClientRect();
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;
    widget.style.transition = 'none';
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const target = e.touches ? e.touches[0] : e;
    const dx = target.clientX - startX;
    const dy = target.clientY - startY;
    const newRight = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, startRight - dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, startBottom - dy));
    widget.style.right = newRight + 'px';
    widget.style.bottom = newBottom + 'px';
  };

  const onEnd = () => {
    isDragging = false;
    widget.style.transition = '';
  };

  widget.addEventListener('mousedown', onStart);
  widget.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadProfile();
  loadMarket();
  initSakanaDrag();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
});

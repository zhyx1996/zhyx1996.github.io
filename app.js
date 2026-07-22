// ── 扶摇接海 · 个人主页 — 主脚本 ──

// ── 配置 ──
const GITHUB_USERNAME = 'zhyx1996';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}`;
const GOLD_API = 'https://www.gold-api.com/api/XAU/USD';

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

// ── 市场快照 ──
async function loadMarketSnap() {
  const el = document.getElementById('market-snap');
  if (!el) return;

  try {
    const res = await fetch(GOLD_API);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const price = data.price || data[0]?.price;
    if (price) {
      el.textContent = `$${price.toFixed(2)}/盎司`;
    } else {
      el.textContent = '数据暂不可用';
    }
  } catch {
    el.textContent = '数据暂不可用';
  }
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadMarketSnap();
});

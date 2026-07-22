// ── 扶摇接海 · 个人主页 — 主脚本 ──

// ── 配置 ──
const GITHUB_USERNAME = 'zhyx1996';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}`;
const GOLD_API = 'https://www.gold-api.com/api/XAU/USD';

// ── 博客园文章兜底数据（由 maintenance.js --sync 自动更新）──
const articleFallback = [
    {
        title: "Windows 下用 Python + GStreamer 推 RTSP 流并注入 SEI，以及pyinstaller打包",
        link: "https://www.cnblogs.com/fix-me/p/20968815",
        summary: "代码仓库：https://github.com/zhyx1996/GStreamer-SEI 网上 Windows + Python + GStreamer + 打包 的攻略比较少，踩了好多坑，简单记录一下。 1. 环境安装 有两种方式。 方式一：直接 pip 安装 需要 Python  3.8：",
        published_at: "2026-06-30T08:22:00Z",
        source: "博客园 · 扶摇接海"
    },
    {
        title: "123云盘报错：检测到本地通信被防火墙或vpn拦截",
        link: "https://www.cnblogs.com/fix-me/p/20194105",
        summary: "联系客服，查看日志C:\\ProgramData\\123SyncCloud\\Logs\\SyncCloud.MaintenanceServer.log [2026-05-26 13:10:32.632] [123SyncCloud_MaintenanceService] [error] process ",
        published_at: "2026-05-28T00:53:00Z",
        source: "博客园 · 扶摇接海"
    },
    {
        title: "记录 GStreamer 打开 JPEG 编码的视频时出现段错误的原因",
        link: "https://www.cnblogs.com/fix-me/p/19914336",
        summary: "问题现象 在 C++ 中，使用 gst_parse_launch 创建 GStreamer 管道，并通过 decodebin 解码 JPEG 编码的 .avi 视频时，程序会出现段错误，但没有其他明显报错信息。 排查结果 程序中同时使用了 OpenCV 的 VideoCapture 和 VideoW",
        published_at: "2026-04-23T03:47:00Z",
        source: "博客园 · 扶摇接海"
    },
    {
        title: "CARLA 中的坐标系与标准车辆坐标系转换",
        link: "https://www.cnblogs.com/fix-me/p/19882892",
        summary: "标准车辆坐标系 常见的车辆坐标系通常采用“前、左、上”的定义，也就是右手系。 在这种坐标系下，各轴对应的旋转正方向均为逆时针，符合右手系。 CARLA 坐标系 参考 CARLA 文档： CARLA 使用的是左手坐标系，其中 Y 轴指向右侧。 它的欧拉角同样按照 Z-Y-X 顺序、绕自身坐标轴依次旋转",
        published_at: "2026-04-17T05:47:00Z",
        source: "博客园 · 扶摇接海"
    }
];

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

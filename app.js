// ── 扶摇接海 · 个人主页 — 主脚本 ──

const GITHUB_USERNAME = 'zhyx1996';
const ARTICLE_LAST_SYNC = '2026年8月4日 18:40';

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
    title: '123SyncCloud 维护服务报错排查',
    url: 'https://www.cnblogs.com/fix-me/p/20194105',
    summary: '123SyncCloud 维护服务进程异常报错的排查过程，通过分析定位日志中的错误堆栈与服务状态。'
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
    const url = article.url || article.link || '#';
    const date = article.date || fmtDate(article.published_at);
    const isNew = isWithinDays(article.date || article.published_at, 45);
    const badge = isNew ? '<span class="article-new-badge">新</span>' : '';
    const articleClass = isNew ? 'article-card new-article' : 'article-card';
    const safeUrl = escapeHtml(url);
    const safeTitle = escapeHtml(article.title);
    const safeSummary = escapeHtml(article.summary);
    const safeDate = escapeHtml(date);
    return url && url !== '#'
      ? `<article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${safeDate}</span>
      </div>
      <h3>${badge}<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeTitle}</a></h3>
      <p>${safeSummary}</p>
    </article>`
      : `<article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${safeDate}</span>
      </div>
      <h3>${badge}${safeTitle}</h3>
      <p>${safeSummary}</p>
    </article>`;
  }).join('');

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
    const url = article.url || article.link || '#';
    const date = article.date || fmtDate(article.published_at);
    const isNew = isWithinDays(article.date || article.published_at, 45);
    const badge = isNew ? '<span class="article-new-badge">新</span>' : '';
    const articleClass = isNew ? 'article-card new-article' : 'article-card';
    const safeUrl = escapeHtml(url);
    const safeTitle = escapeHtml(article.title);
    const safeSummary = escapeHtml(article.summary);
    const safeDate = escapeHtml(date);
    return url && url !== '#'
      ? `<article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${safeDate}</span>
      </div>
      <h3>${badge}<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeTitle}</a></h3>
      <p>${safeSummary}</p>
    </article>`
      : `<article class="${articleClass}">
      <div class="article-meta">
        <span class="article-date">${safeDate}</span>
      </div>
      <h3>${badge}${safeTitle}</h3>
      <p>${safeSummary}</p>
    </article>`;
  }).join('');

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
  const articleTotal = document.getElementById('article-total');
  if (articleTotal) articleTotal.textContent = articleFallback.length;
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
// Gold API 和 CoinGecko 在国内访问情况不同：
// - Gold API (api.gold-api.com) 直连正常且支持 CORS，无需代理
// - CoinGecko (api.coingecko.com) 国内被墙，需要代理
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .then(res => { clearTimeout(timer); return res; })
    .catch(err => { clearTimeout(timer); throw err; });
}

let marketLoading = false;
async function loadMarket() {
  const container = document.getElementById('market-grid');
  if (!container) return;
  if (marketLoading) return;
  marketLoading = true;
  container.setAttribute('aria-busy', 'true');

  try {
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

    // Bitcoin 价格（CoinGecko，国内被墙时走代理）
    const fetchBtc = async () => {
      // 尝试直连
      try {
        const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', 5000);
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        return data.bitcoin?.usd || null;
      } catch {
        // 直连失败，尝试通过 CORS 代理
        try {
          const res = await fetchWithTimeout(PROXY + encodeURIComponent('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'), 10000);
          if (!res.ok) return null;
          const data = await res.json();
          return data.bitcoin?.usd || null;
        } catch { return null; }
      }
    };

    // 黄金价格（直连，API 支持 CORS *）
    const fetchGold = async () => {
      try {
        const res = await fetchWithTimeout('https://api.gold-api.com/price/XAU');
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
  } finally {
    marketLoading = false;
    container.setAttribute('aria-busy', 'false');
  }
}

// ── Sakana 拖拽小球（物理弹跳）──
// 物理参数：晃动更慢、幅度更大；平移与视觉摇摆分离；能量有上限防累积
const SAKANA_PHYSICS = {
  // 平移惯性
  friction: 0.982,         // 每帧速度保留率（原 0.96 → 晃动更持久、更慢）
  wallBounce: 0.5,         // 撞墙速度保留率（原 0.75 → 更沉稳、不抽搐）
  maxVelocity: 22,         // 最大初始速度（原 25 → 稍慢的初始动量）
  stopThreshold: 0.6,      // 停止阈值（原 0.3 → 更早停止微抖动）
  // 角色视觉摇摆
  charLeanFactor: 1.05,    // 释放时角色倾斜系数
  charSwayFactor: 0.68,    // 释放时角色垂直摆动系数
  charLeanMax: 44,         // 角色最大倾斜角度
  charSwayMax: 28,         // 角色最大垂直摆动
  // 撞墙角色反应
  wallLeanFactor: 1.65,    // 撞墙时角色倾斜系数
  wallSwayFactor: 0.9,     // 撞墙时角色垂直摆动系数
  // 能量控制
  maxBounces: 10,          // 最大碰撞次数限制
  bounceEnergyCap: 18,     // 碰撞后速度上限（防能量累积）
  dampingAfterMaxBounces: 0.9, // 超过最大碰撞后的额外阻尼
  // 时间归一化（消除设备/事件频率差异，统一到 60fps 基准）
  frameMs: 16.667,         // 1 帧时长基准（1000/60），速度与摩擦均换算到该基准
  velocitySampleWindowMs: 120, // 释放速度采样窗口（取窗口内首尾位移/时间）
  velocitySampleMax: 12,   // 最大采样点数（拖动期间循环覆盖旧样本）
  // Sakana 内部弹簧参数（_state.i 积分步长/摆动频率，_state.d 速度阻尼）
  swingTimeStep: 0.050,    // 内部 _state.i（默认 0.08，降低 → 更慢摆动）
  swingDamping: 0.9915,    // 内部 _state.d（默认 ~0.99，提高 → 衰减更慢）
};

// 纯函数：从带时间戳的指针采样中计算释放速度（时间归一化）。
// samples: [{ x, y, t }]（t 为 ms 时间戳，x/y 为 client 坐标）。
// 取「最近 velocitySampleWindowMs 窗口」内首尾样本的位移/时间，
// 换算为 60fps 基准的 px/frame，与事件采样频率无关（60Hz/120Hz 一致）。
function computeReleaseVelocity(samples, options) {
  const opts = Object.assign({
    sampleWindowMs: SAKANA_PHYSICS.velocitySampleWindowMs,
    frameMs: SAKANA_PHYSICS.frameMs
  }, options || {});
  if (!Array.isArray(samples) || samples.length < 2) return { vx: 0, vy: 0 };
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = 0; i < samples.length; i++) {
    if (last.t - samples[i].t <= opts.sampleWindowMs) {
      first = samples[i];
      break;
    }
  }
  const dt = last.t - first.t;
  if (!(dt > 0)) return { vx: 0, vy: 0 };
  return {
    vx: ((last.x - first.x) / dt) * opts.frameMs,
    vy: ((last.y - first.y) / dt) * opts.frameMs,
  };
}

// 纯函数：按真实经过时间施加摩擦（帧率归一化）。
// dtMs 为相邻动画帧的时间差；decay = friction^(dt/frameMs)，
// 使 60/120/144Hz 设备在同一真实时间内的速度衰减一致。
function applyFrameFriction(vx, vy, dtMs, options) {
  const opts = Object.assign({
    friction: SAKANA_PHYSICS.friction,
    frameMs: SAKANA_PHYSICS.frameMs
  }, options || {});
  const dt = Math.max(0, Math.min(dtMs, 100));
  const decay = Math.pow(opts.friction, dt / opts.frameMs);
  return { vx: vx * decay, vy: vy * decay };
}

// 纯函数：模拟弹跳物理（用于测试与调试）
// bounds: { width, height, widgetW, widgetH }
// options.dtMs: 每步真实时间（默认 frameMs，即 60fps 一帧，行为与历史一致）
function simulateSakanaBounce(initialVx, initialVy, bounds, options) {
  const physics = Object.assign({}, SAKANA_PHYSICS, options || {});
  const friction = physics.friction;
  const wallBounce = physics.wallBounce;
  const stopThreshold = physics.stopThreshold;
  const maxBounces = physics.maxBounces;
  const bounceEnergyCap = physics.bounceEnergyCap;
  const dampingAfterMaxBounces = physics.dampingAfterMaxBounces;
  const dtMs = physics.dtMs || physics.frameMs; // 每步真实时间（ms）
  const timeScale = dtMs / physics.frameMs;     // 位移缩放（60fps 下为 1）
  const width = bounds.width;
  const height = bounds.height;
  const widgetW = bounds.widgetW;
  const widgetH = bounds.widgetH;

  let vx = initialVx;
  let vy = initialVy;
  let x = 0;
  let y = 0;
  let bounces = 0;
  let maxAmplitudeX = 0;
  let maxAmplitudeY = 0;
  let frames = 0;
  let energy = Math.sqrt(vx * vx + vy * vy);

  while (frames < 1000) {
    const decay = Math.pow(friction, timeScale);
    vx *= decay;
    vy *= decay;

    let nextX = x + vx * timeScale;
    let nextY = y + vy * timeScale;
    let bounced = false;

    if (nextX <= 0 && vx < 0) {
      nextX = 0;
      vx = Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextX >= width - widgetW && vx > 0) {
      nextX = width - widgetW;
      vx = -Math.min(Math.abs(vx) * wallBounce, bounceEnergyCap);
      bounced = true;
    }

    if (nextY <= 0 && vy < 0) {
      nextY = 0;
      vy = Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
      bounced = true;
    } else if (nextY >= height - widgetH && vy > 0) {
      nextY = height - widgetH;
      vy = -Math.min(Math.abs(vy) * wallBounce, bounceEnergyCap);
      bounced = true;
    }

    if (bounced) {
      bounces++;
      if (bounces > maxBounces) {
        vx *= dampingAfterMaxBounces;
        vy *= dampingAfterMaxBounces;
      }
    }

    x = nextX;
    y = nextY;
    frames++;

    maxAmplitudeX = Math.max(maxAmplitudeX, Math.abs(x));
    maxAmplitudeY = Math.max(maxAmplitudeY, Math.abs(y));
    energy = Math.sqrt(vx * vx + vy * vy);

    if ((Math.abs(vx) < stopThreshold && Math.abs(vy) < stopThreshold) || bounces > maxBounces * 2) {
      break;
    }
  }

  return {
    frames: frames,
    durationSeconds: +(frames * dtMs / 1000).toFixed(2),
    bounces: bounces,
    maxAmplitudeX: +maxAmplitudeX.toFixed(1),
    maxAmplitudeY: +maxAmplitudeY.toFixed(1),
    finalEnergy: +energy.toFixed(2),
    settled: frames < 1000
  };
}

// 纯函数：根据速度计算角色摇摆状态（返回 r/y/w/t/i/d）
function computeCharState(vx, vy, physics) {
  physics = physics || SAKANA_PHYSICS;
  return {
    r: Math.max(-physics.charLeanMax, Math.min(physics.charLeanMax, vx * physics.charLeanFactor)),
    y: Math.max(-physics.charSwayMax, Math.min(physics.charSwayMax, vy * physics.charSwayFactor)),
    w: 0,
    t: 0,
    i: physics.swingTimeStep,
    d: physics.swingDamping
  };
}

// 纯函数：模拟 Sakana 内部弹簧方程（严格逐帧，无交叉耦合，rotate=0）
// 每帧：w = w - 2*r; r = r + w*i*1.2; w = w*d
//       t = t - 2*y; y = y + t*i*2;   t = t*d
function simulateSakanaSpring(initialR, initialY, initialW, initialT, physics, maxFrames) {
  physics = physics || SAKANA_PHYSICS;
  maxFrames = maxFrames || 600;
  var i = physics.swingTimeStep;
  var d = physics.swingDamping;

  var r = initialR;
  var y = initialY;
  var w = initialW;
  var t = initialT;
  var frames = 0;
  var peakR = Math.abs(initialR);
  var peakY = Math.abs(initialY);
  var prevR = initialR;
  var prevY = initialY;
  var settled = false;
  var firstZeroFrameR = null;
  var firstZeroFrameY = null;
  var initialEnergy = Math.abs(r) + Math.abs(w) + Math.abs(y) + Math.abs(t);
  var energyAt10s = initialEnergy;

  while (frames < maxFrames) {
    w = w - 2 * r;
    r = r + w * i * 1.2;
    w = w * d;
    t = t - 2 * y;
    y = y + t * i * 2;
    t = t * d;
    frames++;

    var absR = Math.abs(r);
    var absY = Math.abs(y);
    if (absR > peakR) peakR = absR;
    if (absY > peakY) peakY = absY;
    if (firstZeroFrameR === null && ((prevR < 0 && r >= 0) || (prevR > 0 && r <= 0))) firstZeroFrameR = frames;
    if (firstZeroFrameY === null && ((prevY < 0 && y >= 0) || (prevY > 0 && y <= 0))) firstZeroFrameY = frames;
    prevR = r;
    prevY = y;

    if (frames === 600) {
      energyAt10s = absR + Math.abs(w) + absY + Math.abs(t);
    }

    if (absR < 0.3 && Math.abs(w) < 0.3 && absY < 0.3 && Math.abs(t) < 0.3) {
      settled = true;
      if (frames < 600) energyAt10s = absR + Math.abs(w) + absY + Math.abs(t);
      break;
    }
  }

  if (frames >= 600) {
    energyAt10s = Math.abs(r) + Math.abs(w) + Math.abs(y) + Math.abs(t);
  }

  return {
    frames: frames,
    durationSeconds: +(frames / 60).toFixed(2),
    peakR: +peakR.toFixed(2),
    peakY: +peakY.toFixed(2),
    firstZeroFrameR: firstZeroFrameR,
    firstZeroFrameY: firstZeroFrameY,
    settled: settled,
    initialEnergy: +initialEnergy.toFixed(2),
    energyAt10s: +energyAt10s.toFixed(2),
    energyRatio: initialEnergy > 0 ? +(energyAt10s / initialEnergy).toFixed(4) : 0
  };
}

// 调试钩子（可在浏览器控制台调用 window.__sakanaPhysics.test()）
window.__sakanaPhysics = {
  config: SAKANA_PHYSICS,
  simulate: simulateSakanaBounce,
  simulateSpring: simulateSakanaSpring,
  computeCharState: computeCharState,
  computeReleaseVelocity: computeReleaseVelocity,
  applyFrameFriction: applyFrameFriction,
  test: function () {
    var bounds = { width: 1920, height: 1080, widgetW: 180, widgetH: 180 };
    var baseline = { swingTimeStep: 0.08, swingDamping: 0.99 };
    var tuned = { swingTimeStep: 0.052, swingDamping: 0.992 };
    var vx = 18, vy = 10;
    var baseR = Math.max(-30, Math.min(30, vx * 0.55));
    var baseY = Math.max(-18, Math.min(18, vy * 0.33));
    var tuneR = Math.max(-44, Math.min(44, vx * 1.05));
    var tuneY = Math.max(-28, Math.min(28, vy * 0.68));
    var results = {
      releaseRight: simulateSakanaBounce(15, 0, bounds),
      releaseLeft: simulateSakanaBounce(-15, 0, bounds),
      wallLeft: simulateSakanaBounce(-18, 0, bounds),
      wallRight: simulateSakanaBounce(18, 0, bounds),
      springReleaseBaseline: simulateSakanaSpring(baseR, baseY, 0, 0, baseline, 600),
      springReleaseTuned: simulateSakanaSpring(tuneR, tuneY, 0, 0, tuned, 600),
      springWallBaseline: simulateSakanaSpring(-50, -20, 9, 2, baseline, 600),
      springWallTuned: simulateSakanaSpring(-50, -20, 9, 2, tuned, 600)
    };
    if (typeof console !== 'undefined') {
      console.log('=== Sakana Physics Test ===');
      console.log('Config:', SAKANA_PHYSICS);
      for (var k in results) {
        console.log(k + ':', results[k]);
      }
    }
    return results;
  }
};

// 计算 Sakana 初始安全位置：所有页面统一放在视口右下角，
// 避免因页面内容结构不同而改变浮层位置；移动端同样保证完整位于视口内。
function computeSakanaSafePosition(widgetW, widgetH) {
  var margin = 8;
  var viewportW = window.innerWidth;
  var viewportH = window.innerHeight;

  return {
    left: Math.max(margin, viewportW - widgetW - margin),
    top: Math.max(margin, viewportH - widgetH - margin),
  };
}

function initSakanaDrag() {
  if (window.__sakanaDragInitialized) return;
  window.__sakanaDragInitialized = true;
  var widget = document.getElementById('sakana-drag-widget');
  if (!widget) return;

  var isDragging = false;
  var vx = 0, vy = 0;
  var lastX, lastY, lastTime;
  var animId = null;
  var samples = []; // 拖动指针采样 [{ x, y, t }]，释放时做时间归一化速度计算
  var leftPos = 0, topPos = 0;
  var initialized = false;
  var userDragged = false; // 用户拖动后不再自动重定位（resize 时保持用户位置）
  var bounceCount = 0;
  var swingAnimId = null;
  var swingR = 0, swingW = 0;

  var setPos = function (l, t) {
    leftPos = l;
    topPos = t;
    widget.style.left = l + 'px';
    widget.style.top = t + 'px';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  };

  var pointerId = null;
  var getXY = function (e) { return { x: e.clientX, y: e.clientY }; };

  var currentR = 0;
  var applyCharLean = function () {
    var sakana = window.sakanaInstance;
    if (!sakana) return;
    sakana._running = false;
    var targetR = Math.max(-25, Math.min(25, vx * 0.4));
    currentR += (targetR - currentR) * 0.3;
    sakana._state.r = currentR;
    sakana._draw();
  };

  var applyWallCharReaction = function (impactVx, impactVy) {
    var sakana = window.sakanaInstance;
    if (!sakana) return;
    var targetR = Math.max(-SAKANA_PHYSICS.charLeanMax * 1.2, Math.min(SAKANA_PHYSICS.charLeanMax * 1.2, impactVx * SAKANA_PHYSICS.wallLeanFactor));
    var targetY = Math.max(-SAKANA_PHYSICS.charSwayMax * 1.2, Math.min(SAKANA_PHYSICS.charSwayMax * 1.2, impactVy * SAKANA_PHYSICS.wallSwayFactor));
    sakana._state.r = targetR;
    sakana._state.y = targetY;
    sakana._state.w = -targetR * 0.18;
    sakana._state.t = -targetY * 0.12;
    sakana._state.i = SAKANA_PHYSICS.swingTimeStep;
    sakana._state.d = SAKANA_PHYSICS.swingDamping;
    sakana._lastRunUnix = Date.now();
    if (!sakana._running) {
      sakana._running = true;
      if (typeof sakana._run === 'function') sakana._run();
    }
  };

  var initPosition = function () {
    if (initialized) return;
    var pos = computeSakanaSafePosition(widget.offsetWidth, widget.offsetHeight);
    leftPos = pos.left;
    topPos = pos.top;
    setPos(leftPos, topPos);
    initialized = true;
  };

  // 用户尚未拖动时重新计算安全位置（字体就绪校正 / 窗口 resize 共用）
  var repositionIfNotDragged = function () {
    if (userDragged) return;
    var pos = computeSakanaSafePosition(widget.offsetWidth, widget.offsetHeight);
    leftPos = pos.left;
    topPos = pos.top;
    setPos(leftPos, topPos);
    initialized = true;
  };

  var onPointerDown = function (e) {
    if (isDragging || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('.sakana-widget-ctrl')) return;
    var xy = getXY(e);
    isDragging = true;
    userDragged = true; // 用户已开始交互，此后 resize 不再重置位置
    pointerId = e.pointerId;
    widget.setPointerCapture?.(e.pointerId);
    widget.classList.add('dragging');
    initPosition();
    var sakana = window.sakanaInstance;
    if (sakana) {
      sakana._running = false;
      currentR = sakana._state.r;
    }
    lastX = xy.x;
    lastY = xy.y;
    lastTime = Date.now();
    vx = 0;
    vy = 0;
    samples = [{ x: xy.x, y: xy.y, t: lastTime }];
    bounceCount = 0;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (swingAnimId) { cancelAnimationFrame(swingAnimId); swingAnimId = null; }
    e.preventDefault();
  };

  var onPointerMove = function (e) {
    if (!isDragging || e.pointerId !== pointerId) return;
    var xy = getXY(e);
    var now = Date.now();
    var dx = xy.x - lastX;
    var dy = xy.y - lastY;
    var dtMs = now - lastTime;

    var newLeft = leftPos + dx;
    var newTop = topPos + dy;

    var widgetW = widget.offsetWidth;
    var widgetH = widget.offsetHeight;
    var viewportW = window.innerWidth;
    var viewportH = window.innerHeight;
    newLeft = Math.max(8, Math.min(viewportW - widgetW - 8, newLeft));
    newTop = Math.max(8, Math.min(viewportH - widgetH - 8, newTop));

    setPos(newLeft, newTop);

    // 时间归一化速度（px/frame@60fps）：拖动倾斜与释放惯性均与事件频率无关
    if (dtMs > 0) {
      vx = (dx / dtMs) * SAKANA_PHYSICS.frameMs;
      vy = (dy / dtMs) * SAKANA_PHYSICS.frameMs;
    } else {
      vx = 0;
      vy = 0;
    }
    applyCharLean();

    // 采样（带时间戳），保留滑动窗口内最近样本
    samples.push({ x: xy.x, y: xy.y, t: now });
    var windowStart = now - SAKANA_PHYSICS.velocitySampleWindowMs;
    while (samples.length > 2 && samples[0].t < windowStart) samples.shift();
    if (samples.length > SAKANA_PHYSICS.velocitySampleMax) samples.shift();

    lastX = xy.x;
    lastY = xy.y;
    lastTime = now;
  };

  var onPointerUp = function (e) {
    if (!isDragging || (e && e.pointerId !== pointerId)) return;
    isDragging = false;
    widget.releasePointerCapture?.(pointerId);
    pointerId = null;
    widget.classList.remove('dragging');

    if (samples.length >= 2) {
      var vel = computeReleaseVelocity(samples);
      vx = vel.vx;
      vy = vel.vy;
    } else {
      vx = 0;
      vy = 0;
    }

    var maxV = SAKANA_PHYSICS.maxVelocity;
    vx = Math.max(-maxV, Math.min(maxV, vx));
    vy = Math.max(-maxV, Math.min(maxV, vy));

    var sakana = window.sakanaInstance;
    if (sakana) {
      var state = computeCharState(vx, vy);
      sakana._state.r = state.r;
      sakana._state.y = state.y;
      sakana._state.w = state.w;
      sakana._state.t = state.t;
      sakana._state.i = state.i;
      sakana._state.d = state.d;
      sakana._lastRunUnix = Date.now();
      if (!sakana._running) {
        sakana._running = true;
        if (typeof sakana._run === 'function') sakana._run();
      }
      sakana._draw();
    }

    startBounce();
  };

  var startBounce = function () {
    if (animId) cancelAnimationFrame(animId);
    var viewportW = window.innerWidth;
    var viewportH = window.innerHeight;
    var widgetW = widget.offsetWidth;
    var widgetH = widget.offsetHeight;
    bounceCount = 0;
    var lastFrameTime = null;

    var bounce = function (now) {
      // 帧率归一化：60/120/144Hz 设备在同一真实时间内速度衰减与位移均一致。
      // vx/vy 是 60fps 基准的 px/frame，因此位移按真实 rAF 间隔缩放
      // （timeScale = dtMs/frameMs，60fps 下恰为 1，行为与历史一致）。
      if (lastFrameTime === null) lastFrameTime = now;
      var dtMs = Math.min(now - lastFrameTime, 100);
      lastFrameTime = now;
      var timeScale = dtMs / SAKANA_PHYSICS.frameMs;
      var decay = Math.pow(SAKANA_PHYSICS.friction, timeScale);
      vx *= decay;
      vy *= decay;

      var nextLeft = leftPos + vx * timeScale;
      var nextTop = topPos + vy * timeScale;
      var bounced = false;
      var impactVx = 0;
      var impactVy = 0;

      // 碰撞前保存碰撞前速度
      if (nextLeft <= 0 && vx < 0) {
        impactVx = vx;
        nextLeft = 0;
        vx = Math.min(Math.abs(vx) * SAKANA_PHYSICS.wallBounce, SAKANA_PHYSICS.bounceEnergyCap);
        bounced = true;
      } else if (nextLeft >= viewportW - widgetW && vx > 0) {
        impactVx = vx;
        nextLeft = viewportW - widgetW;
        vx = -Math.min(Math.abs(vx) * SAKANA_PHYSICS.wallBounce, SAKANA_PHYSICS.bounceEnergyCap);
        bounced = true;
      }

      if (nextTop <= 0 && vy < 0) {
        impactVy = vy;
        nextTop = 0;
        vy = Math.min(Math.abs(vy) * SAKANA_PHYSICS.wallBounce, SAKANA_PHYSICS.bounceEnergyCap);
        bounced = true;
      } else if (nextTop >= viewportH - widgetH && vy > 0) {
        impactVy = vy;
        nextTop = viewportH - widgetH;
        vy = -Math.min(Math.abs(vy) * SAKANA_PHYSICS.wallBounce, SAKANA_PHYSICS.bounceEnergyCap);
        bounced = true;
      }

      if (bounced) {
        bounceCount++;
        // 用碰撞前速度触发视觉反应（无论是否运行都要更新碰撞状态）
        applyWallCharReaction(impactVx, impactVy);
        if (bounceCount > SAKANA_PHYSICS.maxBounces) {
          vx *= SAKANA_PHYSICS.dampingAfterMaxBounces;
          vy *= SAKANA_PHYSICS.dampingAfterMaxBounces;
        }
      }

      setPos(nextLeft, nextTop);

      if ((Math.abs(vx) < SAKANA_PHYSICS.stopThreshold && Math.abs(vy) < SAKANA_PHYSICS.stopThreshold) || bounceCount > SAKANA_PHYSICS.maxBounces * 2) {
        // 不平移清零 r/y，内部弹簧自行衰减
        currentR = 0;
        animId = null;
        return;
      }

      animId = requestAnimationFrame(bounce);
    };
    animId = requestAnimationFrame(bounce);
  };

  // 内部弹簧由 SakanaWidget._run 驱动，不再需要独立 swing 动画

  widget.addEventListener('pointerdown', onPointerDown);
  widget.addEventListener('pointermove', onPointerMove);
  widget.addEventListener('pointerup', onPointerUp);
  widget.addEventListener('pointercancel', onPointerUp);
  widget.addEventListener('lostpointercapture', onPointerUp);

  // Sakana 初始加载时立即定位到安全空白区（不依赖字体加载完成，
  // 避免初始位置停留在 CSS 默认的视口右下角、遮挡方向区内容）
  initPosition();
  // 字体就绪后再校正一次（用户未拖动时），消除字体加载导致的几何抖动
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(repositionIfNotDragged);
  }
  // 窗口尺寸变化时：仅在用户尚未拖动前重新定位；用户拖动后保持用户位置
  window.addEventListener('resize', repositionIfNotDragged);
}

// ── Steam 资料（解析个人主页 HTML）──
async function loadSteamProfile() {
  const container = document.getElementById('steam-profile');
  if (!container) return;
  container.setAttribute('aria-busy', 'true');

  const STEAM_ID64 = '76561198391062314';

  try {
    const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent('https://steamcommunity.com/profiles/' + STEAM_ID64 + '/')}`, 15000);
    // 注意：corsproxy.io 免费版可能限制非浏览器请求，浏览器端通常正常
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
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}

// 运行时注入的 page-agent 浮窗：首次注入时定位到首屏安全空白区，
// 之后完全交给 page-agent 自身行为，不做持续抢位。
function initPageAgentPlacement() {
  const selectors = [
    '#page-agent',
    '.page-agent',
    'page-agent',
    '[data-page-agent]',
    '#page-agent-window',
    '.page-agent-window',
    '#page-agent-runtime_agent-panel',
    '[data-testid="page-agent"]',
    '[id*="page-agent" i]',
    '[class*="page-agent" i]',
    '[data-testid*="page-agent" i]',
  ];
  const selector = selectors.join(',');

  // 计算安全初始位置：桌面与移动端统一把 page-agent 放在 Sakana 正上方、
  // 右缘与 Sakana 右缘对齐。关键：用 bottom 锚定而不是 top——
  // page-agent 展开时向“上”生长，绝不会向下压到 Sakana；再配 max-height
  // 兜底，保证无论面板多高都完整落在 Sakana 上方且不超出视口。
  // 优先读取 #sakana-drag-widget 内 canvas 的真实几何（canvas 是可见部分，
  // 比容器 top 还要再高 30px）；尚未注入时按 styles.css 默认位置估算
  // （尺寸 180×180，canvas top = 容器 top - 30，桌面 right 30、≤600px right 16、
  // ≤480px right 8，容器 bottom 20）。
  const computePlacement = (element) => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Sakana 可见区域：canvas 存在则用 canvas 矩形，否则回退到容器矩形（顶边 -30）。
    const getSakanaRect = () => {
      const el = document.getElementById('sakana-drag-widget');
      if (el) {
        const canvas = el.querySelector('canvas');
        const r = canvas && canvas.getBoundingClientRect().width > 0
          ? canvas.getBoundingClientRect()
          : el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
      }
      const right = viewportW <= 480 ? 8 : viewportW <= 600 ? 16 : 30;
      const bottom = 20;
      const size = 180; // 与 #sakana-drag-widget 安全尺寸一致
      const widgetTop = viewportH - bottom - size;
      return {
        left: viewportW - right - size,
        right: viewportW - right,
        top: widgetTop - 30, // canvas 比容器顶边再高 30px
        height: size,
      };
    };

    // 宽度保护：窄屏不超过视口宽减 24，常规不超过 340。
    const width = Math.min(viewportW <= 600 ? 280 : 340, viewportW - 24);

    const sakRect = getSakanaRect();
    // 右缘对齐 Sakana 右缘。
    let left = sakRect.right - width;

    // 底部锚定：page-agent 底边固定在 Sakana 顶部上方 24px 处。
    const gap = 24;
    let bottom = viewportH - sakRect.top + gap;

    // 面板可伸展高度上限 = Sakana 顶部 - 间距 - 顶部 8px 安全边距，
    // 保证展开时永不越过 Sakana、也不超出视口顶部。
    const maxHeight = Math.max(120, Math.round(sakRect.top - gap - 8));

    // 不出屏保护：整块保持 8px 最小边距，且不超出视口。
    left = Math.max(8, Math.min(left, viewportW - width - 8));
    bottom = Math.max(8, bottom);
    return { bottom: Math.round(bottom), left: Math.round(left), width, maxHeight, center: false };
  };

  const applyInitialPlacement = (element) => {
    // 用户一旦拖过就绝不再重定位（含初始化逻辑）
    if (element.dataset.codexUserMoved === 'true') return;
    const pos = computePlacement(element);
    element.style.position = 'fixed';
    element.style.left = pos.center ? '50%' : pos.left + 'px';
    element.style.top = 'auto';
    element.style.right = 'auto';
    element.style.bottom = pos.bottom + 'px';
    element.style.zIndex = '9990'; // 低于 Sakana（#sakana-drag-widget 为 9999）
    element.style.width = pos.width + 'px';
    element.style.setProperty('--width', pos.width + 'px'); // 与库内部 --width 同步，保证 history/输入区宽度一致
    element.style.maxWidth = 'calc(100vw - 24px)';
    element.style.maxHeight = pos.maxHeight + 'px';
    element.style.boxSizing = 'border-box';
    // 桌面端不居中：清掉库默认的 translateX(-50%)，避免左侧裁切残影；
    // 只保留水平居中所需的 translateX（移动端 center=true 时）。
    element.style.transform = pos.center ? 'translateX(-50%) translateY(0)' : 'translateY(0)';
  };

  const markUserMoved = () => {
    document.querySelectorAll(selector).forEach((el) => {
      el.dataset.codexUserMoved = 'true';
    });
  };
  // 用户一旦开始交互（含其自身拖动 / 指针移动）就不再重定位
  ['pointerdown', 'pointermove', 'mousedown', 'touchstart', 'dragstart'].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (e.target && e.target.closest && e.target.closest(selector)) markUserMoved();
    }, { passive: true });
  });

  const place = (element) => {
    if (!(element instanceof HTMLElement) || element.dataset.codexPlaced === 'true') return;
    element.dataset.codexPlaced = 'true';
    applyInitialPlacement(element);
    // page-agent 注入后 ~0ms 才 show() 并写入自身 transform/opacity；
    // 在其初始化稳定后各确认一次位置（用户未拖动时）。仅此一次，之后彻底放手。
    setTimeout(() => { applyInitialPlacement(element); }, 250);
  };

  const apply = () => document.querySelectorAll(selector).forEach(place);
  apply();
  if (document.querySelector(selector)) return;

  const observer = new MutationObserver(() => {
    apply();
    if (document.querySelector(selector)) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── 滚动进度条（rAF 节流）──
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) { bar.style.width = '0'; ticking = false; return; }
    const progress = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
    bar.style.width = progress + '%';
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

// ── 返回顶部（rAF 节流）──
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  let ticking = false;
  const update = () => {
    btn.classList.toggle('visible', window.scrollY > 300);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

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
  initPageAgentPlacement();
  initScrollAnimations();
  initScrollProgress();
  initBackToTop();
  initFooterUpdated();

  // 市场快照刷新按钮
  const marketRefreshBtn = document.getElementById('market-refresh');
  if (marketRefreshBtn) {
    marketRefreshBtn.addEventListener('click', () => {
      if (marketLoading) return;
      marketRefreshBtn.classList.add('spinning');
      marketRefreshBtn.disabled = true;
      loadMarket().finally(() => {
        marketRefreshBtn.classList.remove('spinning');
        marketRefreshBtn.disabled = false;
      });
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

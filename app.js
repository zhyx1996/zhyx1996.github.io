// ── 扶摇接海 · 个人主页 — 主脚本 ──

const GITHUB_USERNAME = 'zhyx1996';
const ARTICLE_LAST_SYNC = '2026年8月2日 18:01';

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
    title: '123SyncCloud 日志排查：MaintenanceServer 服务启动失败',
    url: 'https://www.cnblogs.com/fix-me/p/20194105',
    summary: '联系客服后查看 123SyncCloud 日志，定位 MaintenanceServer 服务启动失败的原因，记录排查思路与解决过程。'
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
  // Sakana 内部弹簧参数（_state.i 积分步长/摆动频率，_state.d 速度阻尼）
  swingTimeStep: 0.052,    // 内部 _state.i（默认 0.08，降低 → 更慢摆动）
  swingDamping: 0.992,     // 内部 _state.d（默认 ~0.99，提高 → 衰减更慢）
};

// 纯函数：模拟弹跳物理（用于测试与调试）
// bounds: { width, height, widgetW, widgetH }
function simulateSakanaBounce(initialVx, initialVy, bounds, options) {
  const physics = Object.assign({}, SAKANA_PHYSICS, options || {});
  const friction = physics.friction;
  const wallBounce = physics.wallBounce;
  const stopThreshold = physics.stopThreshold;
  const maxBounces = physics.maxBounces;
  const bounceEnergyCap = physics.bounceEnergyCap;
  const dampingAfterMaxBounces = physics.dampingAfterMaxBounces;
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
    vx *= friction;
    vy *= friction;

    let nextX = x + vx;
    let nextY = y + vy;
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
    durationSeconds: +(frames / 60).toFixed(2),
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

// 纯函数：模拟 Sakana 2.7.1 内部弹簧方程（两个独立弹簧，无交叉耦合）
// 旋转：w -= 2*r + rotate, r += w*i*1.2, w *= d
// 纵向：t -= 2*y, y += t*i*2, t *= d
function simulateSakanaSpring(initialR, initialY, initialW, initialT, physics, maxFrames) {
  physics = physics || SAKANA_PHYSICS;
  maxFrames = maxFrames || 600;
  var i = physics.swingTimeStep;
  var d = physics.swingDamping;
  var rotate = physics.rotate || 0;

  var r = initialR;
  var y = initialY;
  var w = initialW;
  var t = initialT;
  var frames = 0;
  var peakR = Math.abs(initialR);
  var peakY = Math.abs(initialY);
  var zeroCrossingsR = 0;
  var zeroCrossingsY = 0;
  var prevR = initialR;
  var prevY = initialY;
  var settled = false;
  var firstPeakR = Math.abs(initialR);
  var firstPeakY = Math.abs(initialY);
  var initialEnergy = r * r + y * y + w * w + t * t;
  var energyAt10s = initialEnergy;
  var prevW = initialW;
  var prevT = initialT;

  while (frames < maxFrames) {
    // 旋转弹簧（独立）
    w = w - 2 * r - rotate;
    r = r + w * i * 1.2;
    w = w * d;
    // 纵向弹簧（独立）
    t = t - 2 * y;
    y = y + t * i * 2;
    t = t * d;
    frames++;

    var absR = Math.abs(r);
    var absY = Math.abs(y);
    if (absR > peakR) peakR = absR;
    if (absY > peakY) peakY = absY;
    if ((prevR < 0 && r >= 0) || (prevR > 0 && r <= 0)) zeroCrossingsR++;
    if ((prevY < 0 && y >= 0) || (prevY > 0 && y <= 0)) zeroCrossingsY++;
    prevR = r;
    prevY = y;

    if (frames === 1) {
      firstPeakR = absR;
      firstPeakY = absY;
    }
    if (frames === 600) {
      energyAt10s = r * r + y * y + w * w + t * t;
    }

    if (absR < 0.3 && Math.abs(w) < 0.3 && absY < 0.3 && Math.abs(t) < 0.3) {
      settled = true;
      if (frames < 600) energyAt10s = r * r + y * y + w * w + t * t;
      break;
    }
    prevW = w;
    prevT = t;
  }

  if (frames >= 600) {
    energyAt10s = r * r + y * y + w * w + t * t;
  }

  return {
    frames: frames,
    durationSeconds: +(frames / 60).toFixed(2),
    peakR: +peakR.toFixed(2),
    peakY: +peakY.toFixed(2),
    firstPeakR: +firstPeakR.toFixed(2),
    firstPeakY: +firstPeakY.toFixed(2),
    zeroCrossingsR: zeroCrossingsR,
    zeroCrossingsY: zeroCrossingsY,
    settled: settled,
    halfPeriodR: zeroCrossingsR > 0 ? +((frames / zeroCrossingsR)).toFixed(1) : null,
    halfPeriodY: zeroCrossingsY > 0 ? +((frames / zeroCrossingsY)).toFixed(1) : null,
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
  test: function () {
    var bounds = { width: 1920, height: 1080, widgetW: 130, widgetH: 150 };
    var baseline = { swingTimeStep: 0.08, swingDamping: 0.99 };
    var tuned = { swingTimeStep: 0.052, swingDamping: 0.992 };
    // Release: same input velocity, old mapping for baseline vs new mapping for tuned
    var vx = 15, vy = 8;
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

function initSakanaDrag() {
  if (window.__sakanaDragInitialized) return;
  window.__sakanaDragInitialized = true;
  var widget = document.getElementById('sakana-drag-widget');
  if (!widget) return;

  var isDragging = false;
  var vx = 0, vy = 0;
  var lastX, lastY, lastTime;
  var animId = null;
  var vxHistory = [];
  var vyHistory = [];
  var leftPos = 0, topPos = 0;
  var initialized = false;
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

  var getXY = function (e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

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
    sakana._running = true;
    if (typeof sakana._run === 'function') sakana._run();
  };

  var initPosition = function () {
    if (initialized) return;
    var rect = widget.getBoundingClientRect();
    leftPos = rect.left;
    topPos = rect.top;
    initialized = true;
  };

  var onPointerDown = function (e) {
    if (e.target.closest('.sakana-widget-ctrl')) return;
    var xy = getXY(e);
    isDragging = true;
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
    vxHistory = [];
    vyHistory = [];
    bounceCount = 0;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (swingAnimId) { cancelAnimationFrame(swingAnimId); swingAnimId = null; }
    e.preventDefault();
  };

  var onPointerMove = function (e) {
    if (!isDragging) return;
    var xy = getXY(e);
    var now = Date.now();
    var dx = xy.x - lastX;
    var dy = xy.y - lastY;

    var newLeft = leftPos + dx;
    var newTop = topPos + dy;

    var widgetW = widget.offsetWidth;
    var widgetH = widget.offsetHeight;
    var viewportW = window.innerWidth;
    var viewportH = window.innerHeight;
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

  var onPointerUp = function () {
    if (!isDragging) return;
    isDragging = false;
    widget.classList.remove('dragging');

    if (vxHistory.length > 0) {
      var totalWeight = 0;
      var weightedVx = 0;
      var weightedVy = 0;
      for (var i = 0; i < vxHistory.length; i++) {
        var weight = i + 1;
        weightedVx += vxHistory[i] * weight;
        weightedVy += vyHistory[i] * weight;
        totalWeight += weight;
      }
      vx = weightedVx / totalWeight;
      vy = weightedVy / totalWeight;
    }

    var maxV = SAKANA_PHYSICS.maxVelocity;
    vx = Math.max(-maxV, Math.min(maxV, vx));
    vy = Math.max(-maxV, Math.min(maxV, vy));

    var sakana = window.sakanaInstance;
    if (sakana) {
      var state = computeCharState(vx, vy);
      sakana._running = false;
      sakana._state.r = state.r;
      sakana._state.y = state.y;
      sakana._state.w = state.w;
      sakana._state.t = state.t;
      sakana._state.i = state.i;
      sakana._state.d = state.d;
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

    var bounce = function () {
      vx *= SAKANA_PHYSICS.friction;
      vy *= SAKANA_PHYSICS.friction;

      var nextLeft = leftPos + vx;
      var nextTop = topPos + vy;
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
        // 用碰撞前速度触发视觉反应
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

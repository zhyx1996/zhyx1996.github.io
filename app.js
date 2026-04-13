const profileFallback = {
    name: 'ZYX',
    login: 'zhyx1996',
    bio: '围绕计算机视觉、自动驾驶感知、并行计算与个人实验项目做持续实践。',
    html_url: 'https://github.com/zhyx1996',
    avatar_url: 'https://avatars.githubusercontent.com/u/74281356?v=4',
    public_repos: 4,
    followers: 0,
    following: 0,
    updated_at: '2026-04-11T12:30:07Z'
};

const repoFallback = [
    {
        name: 'lane2seq',
        html_url: 'https://github.com/zhyx1996/lane2seq',
        description: '基于 OpenCV、ENet 与 Vision Transformer 的车道线检测实验项目。',
        language: 'Jupyter Notebook',
        stargazers_count: 1,
        updated_at: '2026-04-10T00:00:00Z'
    },
    {
        name: 'pcl-boundary_omp',
        html_url: 'https://github.com/zhyx1996/pcl-boundary_omp',
        description: '对 PCL BoundaryEstimation 做 OMP 加速的点云处理实践。',
        language: 'C++',
        stargazers_count: 0,
        updated_at: '2024-08-27T09:17:24Z'
    },
    {
        name: 'cuda_test',
        html_url: 'https://github.com/zhyx1996/cuda_test',
        description: '围绕 CUDA 环境与基础实验的轻量测试仓库。',
        language: 'Cuda',
        stargazers_count: 0,
        updated_at: '2024-09-12T08:56:10Z'
    },
    {
        name: 'utils',
        html_url: 'https://github.com/zhyx1996/utils',
        description: '日常使用脚本与小工具的集合。',
        language: 'Batchfile',
        stargazers_count: 0,
        updated_at: '2026-02-09T02:14:44Z'
    }
];

const fmtDate = (value) => {
    if (!value) return '未知';
    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const safeText = (value, fallback = '暂无') => value || fallback;
const GOLD_TROY_OUNCE_GRAMS = 31.1034768;

const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
};

const setHref = (id, value) => {
    const element = document.getElementById(id);
    if (element && value) element.href = value;
};

const setImage = (id, value, alt) => {
    const element = document.getElementById(id);
    if (element && value) {
        element.src = value;
        if (alt) element.alt = alt;
    }
};

function renderProfile(profile) {
    setText('profile-name', safeText(profile.name, profile.login));
    setText('profile-login', `@${profile.login}`);
    setText('profile-bio', safeText(profile.bio, profileFallback.bio));
    setText('hero-name', safeText(profile.name, profile.login));
    setText('hero-updated', fmtDate(profile.updated_at));
    setText('repo-count', String(profile.public_repos ?? profileFallback.public_repos));
    setText('follower-count', String(profile.followers ?? profileFallback.followers));
    setText('following-count', String(profile.following ?? profileFallback.following));
    setHref('profile-link', profile.html_url || profileFallback.html_url);
    setHref('hero-link', profile.html_url || profileFallback.html_url);
    setImage('profile-avatar', profile.avatar_url || profileFallback.avatar_url, `${profile.login} avatar`);
}

function renderRepos(repos) {
    const repoContainer = document.getElementById('repo-list');
    const projectContainer = document.getElementById('project-list');
    const items = repos.slice(0, 4);

    const repoMarkup = items.map((repo) => `
        <article class="repo-card">
            <span class="tag">${safeText(repo.language, '未标注语言')}</span>
            <h3>${repo.name}</h3>
            <p>${safeText(repo.description, '这个仓库暂未填写公开简介，可直接打开仓库查看 README 和代码。')}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count ?? 0}</span>
                <span>🕒 ${fmtDate(repo.updated_at)}</span>
            </div>
            <div class="button-row">
                <a class="button outline" href="${repo.html_url}" target="_blank" rel="noreferrer">打开仓库</a>
            </div>
        </article>
    `).join('');

    if (repoContainer) repoContainer.innerHTML = repoMarkup;

    if (projectContainer) {
        projectContainer.innerHTML = items.map((repo) => `
            <article class="repo-card">
                <div class="inline-list">
                    <span class="tag">${safeText(repo.language, '项目')}</span>
                    <span class="pill">最近更新 ${fmtDate(repo.updated_at)}</span>
                </div>
                <h3>${repo.name}</h3>
                <p>${safeText(repo.description, '可以直接跳转到 GitHub 查看完整说明、提交记录和后续更新。')}</p>
                <div class="button-row">
                    <a class="button outline" href="${repo.html_url}" target="_blank" rel="noreferrer">GitHub 详情</a>
                </div>
            </article>
        `).join('');
    }
}

async function hydrateGithubData() {
    const status = document.querySelectorAll('[data-github-status]');
    const updateStatus = (text) => status.forEach((node) => { node.textContent = text; });

    renderProfile(profileFallback);
    renderRepos(repoFallback);
    updateStatus('已先展示静态摘要，联网后会自动刷新为 GitHub 公开资料。');

    try {
        const [profileRes, reposRes] = await Promise.all([
            fetch('https://api.github.com/users/zhyx1996', { headers: { Accept: 'application/vnd.github+json' } }),
            fetch('https://api.github.com/users/zhyx1996/repos?sort=updated&per_page=4', { headers: { Accept: 'application/vnd.github+json' } })
        ]);

        if (!profileRes.ok || !reposRes.ok) {
            throw new Error('GitHub API request failed');
        }

        const profile = await profileRes.json();
        const repos = await reposRes.json();

        renderProfile({ ...profileFallback, ...profile });
        renderRepos(Array.isArray(repos) && repos.length ? repos : repoFallback);
        updateStatus('GitHub 公开资料已刷新，页面上的统计与仓库信息均来自实时接口。');
    } catch (error) {
        updateStatus('暂时未能连接 GitHub API，页面已保留静态摘要与直达链接。');
        console.warn('Failed to load GitHub data', error);
    }
}

const marketFallback = {
    cnyUsd: 0.1374,
    cnyEur: 0.1264,
    cnyJpy: 20.54,
    cnySgd: 0.1854,
    gold: { usdPerOunce: 2380, cnyPerOunce: 17322, cnyPerGram: 557, change24h: null },
    btc: { usd: 83000, cny: 603240, change24h: null },
    eth: { usd: 1600, cny: 11648, change24h: null }
};

function renderMarket(data) {
    const container = document.getElementById('market-grid');
    if (!container) return;

    const fmtRate = (n, d = 4) => n != null ? Number(n).toFixed(d) : '—';
    const fmtPrice = (n) => n != null ? Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '—';
    const changeHTML = (c) => {
        if (c == null) return '<span class="market-change">—</span>';
        const cls = c >= 0 ? 'up' : 'down';
        const sign = c >= 0 ? '+' : '';
        return `<span class="market-change ${cls}">${sign}${Number(c).toFixed(2)}%</span>`;
    };

    container.innerHTML = `
        <article class="market-card">
            <small>人民币兑美元</small>
            <strong class="market-value">$${fmtRate(data.cnyUsd, 4)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnyUsd, 4)} 美元</p>
        </article>
        <article class="market-card">
            <small>人民币兑欧元</small>
            <strong class="market-value">€${fmtRate(data.cnyEur, 4)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnyEur, 4)} 欧元</p>
        </article>
        <article class="market-card">
            <small>人民币兑日元</small>
            <strong class="market-value">JP¥${fmtRate(data.cnyJpy, 2)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnyJpy, 2)} 日元</p>
        </article>
        <article class="market-card">
            <small>人民币兑新加坡元</small>
            <strong class="market-value">S$${fmtRate(data.cnySgd, 4)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnySgd, 4)} 新加坡元</p>
        </article>
        <article class="market-card">
            <small>黄金现货</small>
            <strong class="market-value">¥${fmtPrice(data.gold.cnyPerOunce)}</strong>
            ${changeHTML(data.gold.change24h)}
            <p class="muted">≈ ¥${fmtPrice(data.gold.cnyPerGram)} / 克 · $${fmtPrice(data.gold.usdPerOunce)} / 盎司</p>
        </article>
        <article class="market-card">
            <small>比特币 BTC</small>
            <strong class="market-value">$${fmtPrice(data.btc.usd)}</strong>
            ${changeHTML(data.btc.change24h)}
            <p class="muted">≈ ¥${fmtPrice(data.btc.cny)} · 24h 涨跌</p>
        </article>
        <article class="market-card">
            <small>以太坊 ETH</small>
            <strong class="market-value">$${fmtPrice(data.eth.usd)}</strong>
            ${changeHTML(data.eth.change24h)}
            <p class="muted">≈ ¥${fmtPrice(data.eth.cny)} · 24h 涨跌</p>
        </article>
    `;
}

async function hydrateMarketData() {
    const statusEl = document.querySelector('[data-market-status]');
    const updateMarketStatus = (text) => { if (statusEl) statusEl.textContent = text; };

    renderMarket(marketFallback);
    updateMarketStatus('正在刷新汇率、黄金与加密资产价格...');

    try {
        const [ratesResult, cryptoResult, goldResult] = await Promise.allSettled([
            fetch('https://open.er-api.com/v6/latest/USD'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,cny&include_24hr_change=true'),
            // gold-api.com 的 XAU 接口通常返回 price 与 chg_percentage；
            // 额外兼容 price_usd / price_ounce / price_per_ounce 这类常见镜像或旧字段命名，避免轻微的字段变动直接导致页面空白。
            fetch('https://api.gold-api.com/price/XAU')
        ]);

        const marketData = {
            cnyUsd: marketFallback.cnyUsd,
            cnyEur: marketFallback.cnyEur,
            cnyJpy: marketFallback.cnyJpy,
            cnySgd: marketFallback.cnySgd,
            gold: { ...marketFallback.gold },
            btc: { ...marketFallback.btc },
            eth: { ...marketFallback.eth }
        };
        let hasLiveData = false;

        if (ratesResult.status === 'fulfilled' && ratesResult.value.ok) {
            const ratesData = await ratesResult.value.json();
            const rates = ratesData.rates;
            const cnyBase = Number(rates?.CNY);
            if (cnyBase) {
                marketData.cnyUsd = 1 / cnyBase;
                if (rates.EUR) marketData.cnyEur = Number(rates.EUR) / cnyBase;
                if (rates.JPY) marketData.cnyJpy = Number(rates.JPY) / cnyBase;
                if (rates.SGD) marketData.cnySgd = Number(rates.SGD) / cnyBase;
                hasLiveData = true;
            }
        }

        if (cryptoResult.status === 'fulfilled' && cryptoResult.value.ok) {
            const cryptoData = await cryptoResult.value.json();
            if (cryptoData.bitcoin) {
                marketData.btc = {
                    usd: cryptoData.bitcoin.usd,
                    cny: cryptoData.bitcoin.cny,
                    change24h: cryptoData.bitcoin.usd_24h_change ?? null
                };
            }
            if (cryptoData.ethereum) {
                marketData.eth = {
                    usd: cryptoData.ethereum.usd,
                    cny: cryptoData.ethereum.cny,
                    change24h: cryptoData.ethereum.usd_24h_change ?? null
                };
            }
            hasLiveData = true;
        }

        if (goldResult.status === 'fulfilled' && goldResult.value.ok) {
            const goldData = await goldResult.value.json();
            const usdPerOunce = Number(
                goldData.price ??
                goldData.price_usd ??
                goldData.price_ounce ??
                goldData.price_per_ounce
            );

            if (Number.isFinite(usdPerOunce) && usdPerOunce > 0) {
                const cnyPerOunce = usdPerOunce / marketData.cnyUsd;
                const goldChange24h = goldData.chg_percentage ?? goldData.change_percent ?? goldData.change_percentage ?? null;
                marketData.gold = {
                    usdPerOunce,
                    cnyPerOunce,
                    cnyPerGram: cnyPerOunce / GOLD_TROY_OUNCE_GRAMS,
                    change24h: goldChange24h
                };
                hasLiveData = true;
            }
        }

        renderMarket(marketData);
        if (hasLiveData) {
            const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
            updateMarketStatus(`行情已更新 · ${now}`);
        } else {
            updateMarketStatus('行情接口暂时不可用，当前展示的是本地参考数据。');
        }
    } catch (error) {
        updateMarketStatus('行情接口暂时不可用，当前展示的是本地参考数据。');
        console.warn('Failed to load market data', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    hydrateGithubData();
    hydrateMarketData();
});

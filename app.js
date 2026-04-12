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
            <p>${safeText(repo.description, '这个仓库暂时没有公开描述，可点击仓库链接查看详情。')}</p>
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
                <p>${safeText(repo.description, '点击跳转到 GitHub 查看完整说明。')}</p>
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
    updateStatus('已加载静态资料；若网络可用会自动刷新为 GitHub 实时数据。');

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
        updateStatus('GitHub 实时数据已刷新；下方仓库卡片与统计数字来自公开接口。');
    } catch (error) {
        updateStatus('当前未能连接 GitHub API，已保留静态资料与直达链接。');
        console.warn('Failed to load GitHub data', error);
    }
}

const marketFallback = {
    usdcny: 7.28,
    usdeur: 0.92,
    usdjpy: 149.5,
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
            <small>美元兑人民币</small>
            <strong class="market-value">${fmtRate(data.usdcny)}</strong>
            <p class="muted">USD / CNY 实时汇率</p>
        </article>
        <article class="market-card">
            <small>美元兑欧元</small>
            <strong class="market-value">${fmtRate(data.usdeur)}</strong>
            <p class="muted">USD / EUR 实时汇率</p>
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
    updateMarketStatus('正在加载实时行情数据...');

    try {
        const [ratesRes, cryptoRes] = await Promise.all([
            fetch('https://open.er-api.com/v6/latest/USD'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,cny&include_24hr_change=true')
        ]);

        const marketData = {
            usdcny: marketFallback.usdcny,
            usdeur: marketFallback.usdeur,
            usdjpy: marketFallback.usdjpy,
            btc: { ...marketFallback.btc },
            eth: { ...marketFallback.eth }
        };

        if (ratesRes.ok) {
            const ratesData = await ratesRes.json();
            if (ratesData.rates) {
                if (ratesData.rates.CNY) marketData.usdcny = ratesData.rates.CNY;
                if (ratesData.rates.EUR) marketData.usdeur = ratesData.rates.EUR;
                if (ratesData.rates.JPY) marketData.usdjpy = ratesData.rates.JPY;
            }
        }

        if (cryptoRes.ok) {
            const cryptoData = await cryptoRes.json();
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
        }

        renderMarket(marketData);
        const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
        updateMarketStatus(`行情已更新 · ${now}`);
    } catch (error) {
        updateMarketStatus('行情接口暂时无法访问，已展示参考数据。');
        console.warn('Failed to load market data', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    hydrateGithubData();
    hydrateMarketData();
});

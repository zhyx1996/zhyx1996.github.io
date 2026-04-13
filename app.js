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

const starredFallback = [
    {
        full_name: 'smallmain/vscode-unify-chat-provider',
        html_url: 'https://github.com/smallmain/vscode-unify-chat-provider',
        description: '把多个 LLM API 提供方接到 VS Code GitHub Copilot Chat 的聚合型扩展。',
        language: 'TypeScript',
        stargazers_count: 366,
        updated_at: '2026-04-13T00:00:00Z'
    },
    {
        full_name: 'al01cn/sillyTavern-launcher',
        html_url: 'https://github.com/al01cn/sillyTavern-launcher',
        description: '面向 SillyTavern 的启动器，方便统一管理桌面端和多平台使用体验。',
        language: 'Vue',
        stargazers_count: 52,
        updated_at: '2026-04-10T00:00:00Z'
    },
    {
        full_name: 'APKZCOM/shizuku-starter',
        html_url: 'https://github.com/APKZCOM/shizuku-starter',
        description: '直接通过浏览器中的 WebADB 启动 Shizuku，无需本地安装 ADB。',
        language: 'JavaScript',
        stargazers_count: 23,
        updated_at: '2026-03-27T00:00:00Z'
    },
    {
        full_name: 'guohuiyuan/go-novel-dl',
        html_url: 'https://github.com/guohuiyuan/go-novel-dl',
        description: '支持 CLI 和 Web 的多源小说下载器，适合并发搜索和一键导出。',
        language: 'Go',
        stargazers_count: 24,
        updated_at: '2026-04-12T00:00:00Z'
    }
];

const repoShowcaseOrder = ['lane2seq', 'pcl-boundary_omp', 'cuda_test', 'utils'];
const repoShowcaseMeta = {
    lane2seq: { label: 'Vision' },
    'pcl-boundary_omp': { label: 'Point Cloud' },
    cuda_test: { label: 'CUDA' },
    utils: { label: 'Utility' }
};

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
const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const GOLD_TROY_OUNCE_GRAMS = 31.1034768;
const pickFirstDefined = (source, keys) => {
    for (const key of keys) {
        if (source?.[key] != null) return source[key];
    }
    return null;
};
const totalRepoStars = (repos) => repos.reduce((sum, repo) => sum + Number(repo?.stargazers_count || 0), 0);
const safeUrl = (value, fallback = '#') => {
    try {
        const parsed = new URL(value, window.location.origin);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
    } catch {
        return fallback;
    }
};

const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
};

const setHref = (id, value) => {
    const element = document.getElementById(id);
    if (element && value) element.href = safeUrl(value, element.href || '#');
};

const setImage = (id, value, alt) => {
    const element = document.getElementById(id);
    if (element && value) {
        element.src = value;
        if (alt) element.alt = alt;
    }
};

function renderProfile(profile, repos = repoFallback) {
    setText('profile-name', safeText(profile.name, profile.login));
    setText('profile-login', `@${profile.login}`);
    setText('profile-bio', safeText(profile.bio, profileFallback.bio));
    setText('hero-name', safeText(profile.name, profile.login));
    setText('hero-updated', fmtDate(profile.updated_at));
    setText('repo-count', String(profile.public_repos ?? profileFallback.public_repos));
    setText('follower-count', String(profile.followers ?? profileFallback.followers));
    setText('following-count', String(profile.following ?? profileFallback.following));
    setText('total-stars', String(totalRepoStars(repos)));
    setHref('profile-link', profile.html_url || profileFallback.html_url);
    setHref('hero-link', profile.html_url || profileFallback.html_url);
    setImage('profile-avatar', profile.avatar_url || profileFallback.avatar_url, `${profile.login} avatar`);
}

function resolveShowcaseRepos(repos) {
    const repoMap = new Map(repos.map((repo) => [repo.name, repo]));
    const ordered = repoShowcaseOrder
        .map((name) => (repoMap.has(name) ? { ...repoMap.get(name) } : repoFallback.find((repo) => repo.name === name)))
        .filter(Boolean);
    return ordered.slice(0, 4);
}

function renderMarkup(selector, markup) {
    const container = document.getElementById(selector);
    if (container) container.innerHTML = markup;
}

function renderRepos(repos) {
    const items = repos.slice(0, 4);

    renderMarkup('repo-list', items.map((repo) => `
        <article class="repo-card">
            <span class="tag">${escapeHtml(safeText(repo.language, '未标注语言'))}</span>
            <h3>${escapeHtml(repo.name)}</h3>
            <p>${escapeHtml(safeText(repo.description, '这个仓库暂未填写公开简介，可直接打开仓库查看 README 和代码。'))}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count ?? 0}</span>
                <span>🕒 ${fmtDate(repo.updated_at)}</span>
            </div>
            <div class="button-row">
                <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">打开仓库</a>
            </div>
        </article>
    `).join(''));

    renderMarkup('project-list', items.map((repo) => `
        <article class="repo-card">
            <div class="inline-list">
                <span class="tag">${escapeHtml(safeText(repo.language, '项目'))}</span>
                <span class="pill">最近更新 ${fmtDate(repo.updated_at)}</span>
            </div>
            <h3>${escapeHtml(repo.name)}</h3>
            <p>${escapeHtml(safeText(repo.description, '可以直接跳转到 GitHub 查看完整说明、提交记录和后续更新。'))}</p>
            <div class="button-row">
                <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">GitHub 详情</a>
            </div>
        </article>
    `).join(''));
}

function renderProjectLinks(repos) {
    renderMarkup('project-links-grid', resolveShowcaseRepos(repos).map((repo) => `
        <article class="contact-card">
            <span class="tag">${escapeHtml(repoShowcaseMeta[repo.name]?.label || safeText(repo.language, '项目'))}</span>
            <h3>${escapeHtml(repo.name)}</h3>
            <p>${escapeHtml(safeText(repo.description, '可以直接跳转到仓库查看 README、代码和更新记录。'))}</p>
            <div class="button-row">
                <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">打开仓库</a>
            </div>
        </article>
    `).join(''));
}

function renderStarred(starredRepos) {
    const items = starredRepos.slice(0, 4);
    const markup = items.map((repo) => `
        <article class="repo-card star-card">
            <span class="tag">${escapeHtml(safeText(repo.language, 'Starred Repo'))}</span>
            <h3>${escapeHtml(repo.full_name || repo.name)}</h3>
            <p>${escapeHtml(safeText(repo.description, '这是最近点过 Star 的仓库，可以直接打开查看完整项目说明。'))}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count ?? 0}</span>
                <span>🕒 ${fmtDate(repo.updated_at)}</span>
            </div>
            <div class="button-row">
                <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">查看仓库</a>
            </div>
        </article>
    `).join('');

    renderMarkup('star-list', markup);
    renderMarkup('project-star-list', markup);
}

async function hydrateGithubData() {
    const status = document.querySelectorAll('[data-github-status]');
    const starStatus = document.querySelectorAll('[data-star-status]');
    const updateStatus = (text) => status.forEach((node) => { node.textContent = text; });
    const updateStarStatus = (text) => starStatus.forEach((node) => { node.textContent = text; });

    renderProfile(profileFallback, repoFallback);
    renderRepos(repoFallback);
    renderProjectLinks(repoFallback);
    renderStarred(starredFallback);
    updateStatus('已先展示静态摘要，联网后会自动刷新为 GitHub 公开资料。');
    updateStarStatus('已先展示静态 Star 摘要，联网后会自动刷新。');

    try {
        const [profileRes, reposRes, starredRes] = await Promise.allSettled([
            fetch('https://api.github.com/users/zhyx1996', { headers: { Accept: 'application/vnd.github+json' } }),
            fetch('https://api.github.com/users/zhyx1996/repos?sort=updated&per_page=20', { headers: { Accept: 'application/vnd.github+json' } }),
            fetch('https://api.github.com/users/zhyx1996/starred?sort=updated&per_page=4', { headers: { Accept: 'application/vnd.github+json' } })
        ]);

        let profile = profileFallback;
        let repos = repoFallback;
        let starredRepos = starredFallback;
        let hasLiveProfile = false;
        let hasLiveRepos = false;
        let hasLiveStars = false;

        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
            profile = { ...profileFallback, ...(await profileRes.value.json()) };
            hasLiveProfile = true;
        }

        if (reposRes.status === 'fulfilled' && reposRes.value.ok) {
            const repoData = await reposRes.value.json();
            if (Array.isArray(repoData) && repoData.length) {
                repos = repoData;
                hasLiveRepos = true;
            }
        }

        if (starredRes.status === 'fulfilled' && starredRes.value.ok) {
            const starredData = await starredRes.value.json();
            if (Array.isArray(starredData) && starredData.length) {
                starredRepos = starredData;
                hasLiveStars = true;
            }
        }

        renderProfile(profile, repos);
        renderRepos(repos);
        renderProjectLinks(repos);
        renderStarred(starredRepos);

        if (hasLiveProfile || hasLiveRepos) {
            updateStatus('GitHub 公开资料已刷新，统计和仓库信息来自实时接口。');
        } else {
            updateStatus('暂时未能连接 GitHub API，页面已保留静态摘要与直达链接。');
        }

        if (hasLiveStars) {
            updateStarStatus('Star 列表已刷新，展示的是最近点过 Star 的公开仓库。');
        } else {
            updateStarStatus('暂时未能连接 GitHub Star 接口，页面已保留静态 Star 摘要。');
        }
    } catch (error) {
        updateStatus('暂时未能连接 GitHub API，页面已保留静态摘要与直达链接。');
        updateStarStatus('暂时未能连接 GitHub Star 接口，页面已保留静态 Star 摘要。');
        console.warn('Failed to load GitHub data', error);
    }
}

const marketFallback = {
    cnyUsd: 0.1374,
    cnySgd: 0.1854,
    jpyCny: 0.0487,
    gold: { usdPerOunce: 2380, cnyPerGram: 557, change24h: null },
    btc: { usd: 83000, cnyPerBtc: 603240, btcPerCny: 0.00000166, change24h: null },
    gas92: { cnyPerLiter: 7.98, note: '全国参考价' }
};

function renderMarket(data) {
    const container = document.getElementById('market-grid');
    if (!container) return;

    const fmtRate = (n, d = 4) => n != null ? Number(n).toFixed(d) : '—';
    const fmtPrice = (n, digits = 0) => n != null ? Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
    const changeHTML = (c) => {
        if (c == null) return '<span class="market-change">—</span>';
        const cls = c >= 0 ? 'up' : 'down';
        const sign = c >= 0 ? '+' : '';
        return `<span class="market-change ${cls}">${sign}${Number(c).toFixed(2)}%</span>`;
    };

    container.innerHTML = `
        <article class="market-card">
            <small>人民币 / 美元</small>
            <strong class="market-value">$${fmtRate(data.cnyUsd, 4)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnyUsd, 4)} 美元</p>
        </article>
        <article class="market-card">
            <small>人民币 / 新币</small>
            <strong class="market-value">S$${fmtRate(data.cnySgd, 4)}</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.cnySgd, 4)} 新加坡元</p>
        </article>
        <article class="market-card">
            <small>日元 / 人民币</small>
            <strong class="market-value">¥${fmtRate(data.jpyCny, 4)}</strong>
            <p class="muted">1 日元 ≈ ${fmtRate(data.jpyCny, 4)} 人民币</p>
        </article>
        <article class="market-card">
            <small>黄金 g / 人民币</small>
            <strong class="market-value">¥${fmtPrice(data.gold.cnyPerGram, 2)}</strong>
            ${changeHTML(data.gold.change24h)}
            <p class="muted">1 克 ≈ ${fmtPrice(data.gold.cnyPerGram, 2)} 人民币</p>
            <p class="market-note">≈ $${fmtPrice(data.gold.usdPerOunce, 0)} / 盎司</p>
        </article>
        <article class="market-card">
            <small>人民币 / 比特币</small>
            <strong class="market-value">₿${fmtRate(data.btc.btcPerCny, 8)}</strong>
            ${changeHTML(data.btc.change24h)}
            <p class="muted">1 人民币 ≈ ${fmtRate(data.btc.btcPerCny, 8)} BTC</p>
            <p class="market-note">≈ ¥${fmtPrice(data.btc.cnyPerBtc, 0)} / BTC</p>
        </article>
        <article class="market-card">
            <small>国内 92# 汽油</small>
            <strong class="market-value">¥${fmtPrice(data.gas92.cnyPerLiter, 2)}</strong>
            <span class="market-change">${escapeHtml(data.gas92.note)}</span>
            <p class="muted">${fmtPrice(data.gas92.cnyPerLiter, 2)} 人民币 / 升</p>
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
            cnySgd: marketFallback.cnySgd,
            jpyCny: marketFallback.jpyCny,
            gold: { ...marketFallback.gold },
            btc: { ...marketFallback.btc },
            gas92: { ...marketFallback.gas92 }
        };
        let hasLiveData = false;

        if (ratesResult.status === 'fulfilled' && ratesResult.value.ok) {
            const ratesData = await ratesResult.value.json();
            const rates = ratesData.rates;
            const cnyBase = Number(rates?.CNY);
            if (cnyBase) {
                marketData.cnyUsd = 1 / cnyBase;
                if (rates.SGD) marketData.cnySgd = Number(rates.SGD) / cnyBase;
                if (rates.JPY) marketData.jpyCny = cnyBase / Number(rates.JPY);
                hasLiveData = true;
            }
        }

        if (cryptoResult.status === 'fulfilled' && cryptoResult.value.ok) {
            const cryptoData = await cryptoResult.value.json();
            if (cryptoData.bitcoin) {
                marketData.btc = {
                    usd: cryptoData.bitcoin.usd,
                    cnyPerBtc: cryptoData.bitcoin.cny,
                    btcPerCny: cryptoData.bitcoin.cny ? 1 / cryptoData.bitcoin.cny : marketFallback.btc.btcPerCny,
                    change24h: cryptoData.bitcoin.usd_24h_change ?? null
                };
            }
            hasLiveData = true;
        }

        if (goldResult.status === 'fulfilled' && goldResult.value.ok) {
            const goldData = await goldResult.value.json();
            const usdPerOunce = Number(pickFirstDefined(goldData, ['price', 'price_usd', 'price_ounce', 'price_per_ounce']));

            if (Number.isFinite(usdPerOunce) && usdPerOunce > 0) {
                const goldChange24h = pickFirstDefined(goldData, ['chg_percentage', 'change_percent', 'change_percentage']);
                marketData.gold = {
                    usdPerOunce,
                    cnyPerGram: (usdPerOunce / marketData.cnyUsd) / GOLD_TROY_OUNCE_GRAMS,
                    change24h: goldChange24h
                };
                hasLiveData = true;
            }
        }

        renderMarket(marketData);
        if (hasLiveData) {
            const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
            updateMarketStatus(`汇率、黄金和比特币已更新；92# 汽油保留本地参考价 · ${now}`);
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

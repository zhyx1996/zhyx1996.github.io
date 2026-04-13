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
const GAS92_PRICE_RANGE = { min: 5, max: 10 };
const GAS92_ROW_HINT = /北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|内蒙古|广西|西藏|宁夏|新疆|香港|澳门|台湾|全国|平均|92|汽油/i;
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

function selectLatestRepos(repos, limit = 4) {
    return [...repos]
        .sort((left, right) => new Date(right?.updated_at || 0) - new Date(left?.updated_at || 0))
        .slice(0, limit);
}

function renderMarkup(selector, markup) {
    const container = document.getElementById(selector);
    if (container) container.innerHTML = markup;
}

function renderRepos(repos) {
    const items = selectLatestRepos(repos);

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
    renderMarkup('project-links-grid', selectLatestRepos(repos).map((repo) => `
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
    usdCny: 7.278,
    sgdCny: 5.394,
    jpyPerCny: 20.53,
    gold: { usdPerOunce: 2380, cnyPerGram: 557, change24h: null },
    btc: { usd: 83000, cnyPerBtc: 603240, change24h: null },
    gas92: { cnyPerLiter: 7.98, note: '当前展示全国参考价', source: '静态摘要' }
};

const fmtRate = (n, d = 4) => n != null ? Number(n).toFixed(d) : '暂无';
const fmtPrice = (n, digits = 0) => n != null ? Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '暂无';
const renderMarketFacts = (items) => `
    <dl class="market-facts">
        ${items.map((item) => `
            <div class="market-fact">
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${escapeHtml(item.value)}</dd>
            </div>
        `).join('')}
    </dl>
`;
const changeHTML = (c) => {
    if (c == null) return '<span class="market-change">24h：暂无涨跌数据</span>';
    const cls = c >= 0 ? 'up' : 'down';
    const sign = c >= 0 ? '+' : '';
    return `<span class="market-change ${cls}">24h：${sign}${Number(c).toFixed(2)}%</span>`;
};

function renderMarket(data) {
    const container = document.getElementById('market-grid');
    if (!container) return;

    container.innerHTML = `
        <article class="market-card">
            <small>人民币 / 美元</small>
            <strong class="market-value">¥${fmtRate(data.usdCny, 4)} / $1</strong>
            <p class="muted">1 美元 ≈ ${fmtRate(data.usdCny, 4)} 人民币</p>
            ${renderMarketFacts([
                { label: '反向换算', value: `1 人民币 ≈ $${fmtRate(data.usdCny ? 1 / data.usdCny : null, 4)}` },
                { label: '展示规则', value: '优先显示大于 1 的汇率' }
            ])}
        </article>
        <article class="market-card">
            <small>人民币 / 新币</small>
            <strong class="market-value">¥${fmtRate(data.sgdCny, 4)} / S$1</strong>
            <p class="muted">1 新加坡元 ≈ ${fmtRate(data.sgdCny, 4)} 人民币</p>
            ${renderMarketFacts([
                { label: '反向换算', value: `1 人民币 ≈ S$${fmtRate(data.sgdCny ? 1 / data.sgdCny : null, 4)}` },
                { label: '显示说明', value: '新币更值钱，所以放在分母' }
            ])}
        </article>
        <article class="market-card">
            <small>日元 / 人民币</small>
            <strong class="market-value">${fmtRate(data.jpyPerCny, 2)} 日元 / ¥1</strong>
            <p class="muted">1 人民币 ≈ ${fmtRate(data.jpyPerCny, 2)} 日元</p>
            ${renderMarketFacts([
                { label: '反向换算', value: `1 日元 ≈ ¥${fmtRate(data.jpyPerCny ? 1 / data.jpyPerCny : null, 4)}` },
                { label: '显示说明', value: '人民币更值钱，所以放在分母' }
            ])}
        </article>
        <article class="market-card">
            <small>黄金 / 人民币</small>
            <strong class="market-value">¥${fmtPrice(data.gold.cnyPerGram, 2)} / 克</strong>
            ${changeHTML(data.gold.change24h)}
            <p class="muted">按 1 克黄金折算，约合 ¥${fmtPrice(data.gold.cnyPerGram, 2)}</p>
            ${renderMarketFacts([
                { label: '人民币口径', value: `约 ¥${fmtPrice(data.gold.cnyPerGram, 2)} / 克` },
                { label: '国际金价', value: `约 $${fmtPrice(data.gold.usdPerOunce, 0)} / 盎司` }
            ])}
        </article>
        <article class="market-card">
            <small>人民币 / 比特币</small>
            <strong class="market-value">¥${fmtPrice(data.btc.cnyPerBtc, 0)} / BTC</strong>
            ${changeHTML(data.btc.change24h)}
            <p class="muted">1 BTC ≈ ¥${fmtPrice(data.btc.cnyPerBtc, 0)}</p>
            ${renderMarketFacts([
                { label: '美元口径', value: `约 $${fmtPrice(data.btc.usd, 0)} / BTC` },
                { label: '反向换算', value: `1 人民币 ≈ ₿${fmtRate(data.btc.cnyPerBtc ? 1 / data.btc.cnyPerBtc : null, 8)}` }
            ])}
        </article>
        <article class="market-card">
            <small>国内 92# 汽油</small>
            <strong class="market-value">¥${fmtPrice(data.gas92.cnyPerLiter, 2)} / 升</strong>
            <span class="market-change">${escapeHtml(data.gas92.note)}</span>
            <p class="muted">按 1 升计算，约合 ¥${fmtPrice(data.gas92.cnyPerLiter, 2)}</p>
            ${renderMarketFacts([
                { label: '数据来源', value: data.gas92.source || '静态摘要' },
                { label: '说明', value: '优先实时获取，失败后再尝试抓取公开油价页面' }
            ])}
        </article>
    `;
}

function fetchWithTimeout(url, options = {}, timeout = 12000) {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error(`Request timed out: ${url}`)), timeout);
        fetch(url, options)
            .then((response) => {
                window.clearTimeout(timer);
                resolve(response);
            })
            .catch((error) => {
                window.clearTimeout(timer);
                reject(error);
            });
    });
}

function normalizeWhitespace(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function average(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractGas92PriceFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = [...doc.querySelectorAll('tr, li, p')];
    const values = [];

    for (const row of rows) {
        const text = normalizeWhitespace(row.textContent);
        if (!text || !GAS92_ROW_HINT.test(text)) continue;
        const matches = [...text.matchAll(/([5-9](?:\.\d{1,3})?)/g)]
            .map((match) => Number(match[1]))
            .filter((value) => value >= GAS92_PRICE_RANGE.min && value <= GAS92_PRICE_RANGE.max);
        if (matches.length) values.push(matches[0]);
    }

    if (values.length >= 3) {
        return Number(average(values).toFixed(2));
    }

    const text = normalizeWhitespace(doc.body?.textContent || html);
    const directMatch = text.match(/92[#号]?(?:汽油)?[^0-9]{0,12}([5-9](?:\.\d{1,3})?)(?:\s*元)?\s*(?:\/|每)?\s*升/i);
    if (directMatch) return Number(directMatch[1]);

    const fallbackMatches = [...text.matchAll(/([5-9](?:\.\d{1,3})?)\s*(?:元\/升|元每升|\/L|每升)/gi)]
        .map((match) => Number(match[1]))
        .filter((value) => value >= GAS92_PRICE_RANGE.min && value <= GAS92_PRICE_RANGE.max);
    if (fallbackMatches.length) return Number(average(fallbackMatches).toFixed(2));

    return null;
}

const gas92FetchPlans = [
    {
        label: '全球油价页',
        source: '实时页面',
        url: 'https://www.globalpetrolprices.com/China/gasoline_prices/',
        parser: extractGas92PriceFromHtml
    },
    {
        label: '车主手册 92# 油价',
        source: '抓取公开页面',
        url: 'https://www.icauto.com.cn/oil/price_0_2_1.html',
        parser: extractGas92PriceFromHtml
    },
    {
        label: '今日油价 92 号汽油',
        source: '抓取公开页面',
        url: 'https://www.chayoujia.net/gasoline92.html',
        parser: extractGas92PriceFromHtml
    }
];

function buildGas92Candidates(plan) {
    const encodedUrl = encodeURIComponent(plan.url);
    return [
        { ...plan, requestUrl: plan.url },
        { ...plan, requestUrl: `https://api.allorigins.win/raw?url=${encodedUrl}` },
        { ...plan, requestUrl: `https://r.jina.ai/http://${plan.url.replace(/^https?:\/\//, '')}` }
    ];
}

async function loadGas92Price() {
    for (const plan of gas92FetchPlans) {
        for (const candidate of buildGas92Candidates(plan)) {
            try {
                const response = await fetchWithTimeout(candidate.requestUrl, {
                    headers: { Accept: 'text/html, text/plain;q=0.9, */*;q=0.8' }
                });
                if (!response.ok) continue;
                const html = await response.text();
                const price = candidate.parser(html);
                if (price != null) {
                    return {
                        cnyPerLiter: price,
                        note: `${candidate.source}已刷新`,
                        source: candidate.label
                    };
                }
            } catch (error) {
                console.warn(`Failed to load 92# gas price from ${candidate.requestUrl}`, error);
            }
        }
    }

    return null;
}

async function hydrateMarketData() {
    const statusEl = document.querySelector('[data-market-status]');
    const updateMarketStatus = (text) => { if (statusEl) statusEl.textContent = text; };

    renderMarket(marketFallback);
    updateMarketStatus('正在刷新汇率、黄金、比特币与 92# 汽油...');

    try {
        const [ratesResult, cryptoResult, goldResult, gas92Result] = await Promise.allSettled([
            fetch('https://open.er-api.com/v6/latest/USD'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,cny&include_24hr_change=true'),
            // gold-api.com 的 XAU 接口通常返回 price 与 chg_percentage；
            // 额外兼容 price_usd / price_ounce / price_per_ounce 这类常见镜像或旧字段命名，避免轻微的字段变动直接导致页面空白。
            fetch('https://api.gold-api.com/price/XAU'),
            loadGas92Price()
        ]);

        const marketData = {
            usdCny: marketFallback.usdCny,
            sgdCny: marketFallback.sgdCny,
            jpyPerCny: marketFallback.jpyPerCny,
            gold: { ...marketFallback.gold },
            btc: { ...marketFallback.btc },
            gas92: { ...marketFallback.gas92 }
        };
        let hasLiveData = false;
        let hasLiveGas92 = false;

        if (ratesResult.status === 'fulfilled' && ratesResult.value.ok) {
            const ratesData = await ratesResult.value.json();
            const rates = ratesData.rates;
            const cnyBase = Number(rates?.CNY);
            if (cnyBase) {
                marketData.usdCny = cnyBase;
                if (rates.SGD) marketData.sgdCny = cnyBase / Number(rates.SGD);
                if (rates.JPY) marketData.jpyPerCny = Number(rates.JPY) / cnyBase;
                hasLiveData = true;
            }
        }

        if (cryptoResult.status === 'fulfilled' && cryptoResult.value.ok) {
            const cryptoData = await cryptoResult.value.json();
            if (cryptoData.bitcoin) {
                marketData.btc = {
                    usd: cryptoData.bitcoin.usd,
                    cnyPerBtc: cryptoData.bitcoin.cny,
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
                    cnyPerGram: (usdPerOunce * marketData.usdCny) / GOLD_TROY_OUNCE_GRAMS,
                    change24h: goldChange24h
                };
                hasLiveData = true;
            }
        }

        if (gas92Result.status === 'fulfilled' && gas92Result.value) {
            marketData.gas92 = gas92Result.value;
            hasLiveGas92 = true;
        }

        renderMarket(marketData);
        if (hasLiveData || hasLiveGas92) {
            const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
            const gasText = hasLiveGas92 ? '92# 汽油也已刷新' : '92# 汽油暂未刷新，仍显示本地参考价';
            updateMarketStatus(`汇率、黄金和比特币已更新；${gasText}（${now}）`);
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

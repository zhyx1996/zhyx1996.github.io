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
        forks_count: 0,
        updated_at: '2026-04-10T00:00:00Z'
    },
    {
        name: 'pcl-boundary_omp',
        html_url: 'https://github.com/zhyx1996/pcl-boundary_omp',
        description: '对 PCL BoundaryEstimation 做 OMP 加速的点云处理实践。',
        language: 'C++',
        stargazers_count: 0,
        forks_count: 0,
        updated_at: '2024-08-27T09:17:24Z'
    },
    {
        name: 'cuda_test',
        html_url: 'https://github.com/zhyx1996/cuda_test',
        description: '围绕 CUDA 环境与基础实验的轻量测试仓库。',
        language: 'Cuda',
        stargazers_count: 0,
        forks_count: 0,
        updated_at: '2024-09-12T08:56:10Z'
    },
    {
        name: 'utils',
        html_url: 'https://github.com/zhyx1996/utils',
        description: '日常使用脚本与小工具的集合。',
        language: 'Batchfile',
        stargazers_count: 0,
        forks_count: 0,
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
const GAS92_MIN_SAMPLE_COUNT = 3;
const GAS92_ROW_HINT_KEYWORDS = [
    '北京', '上海', '天津', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
    '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
    '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '内蒙古',
    '广西', '西藏', '宁夏', '新疆', '香港', '澳门', '台湾', '全国', '平均', '92', '汽油'
];
const GAS92_ROW_HINT = new RegExp(GAS92_ROW_HINT_KEYWORDS.join('|'), 'i');
const GAS92_VALUE_PATTERN = /(\d+(?:\.\d{1,3})?)/g;
const GAS92_PRICE_WITH_UNIT_PATTERN = /(\d+(?:\.\d{1,3})?)\s*(?:元\/升|元每升|\/L|每升)/gi;
const MAX_URL_LABEL_LENGTH = 96;
const URL_TRUNCATE_LENGTH = 93;

const pickFirstDefined = (source, keys) => {
    for (const key of keys) {
        if (source?.[key] != null) return source[key];
    }
    return null;
};

const totalRepoStars = (repos) => repos.reduce((sum, repo) => sum + Number(repo?.stargazers_count || 0), 0);
const sortByUpdated = (items) => [...items].sort((left, right) => new Date(right?.updated_at || 0) - new Date(left?.updated_at || 0));
const collectLanguages = (items) => [...new Set(items.map((item) => safeText(item?.language, '')).filter(Boolean))];
const getLatestUpdated = (items) => sortByUpdated(items)[0]?.updated_at || null;
const getMostStarred = (items) => [...items].sort((left, right) => Number(right?.stargazers_count || 0) - Number(left?.stargazers_count || 0))[0] || null;

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
    setImage('profile-avatar', profile.avatar_url || profileFallback.avatar_url, `${profile.login} avatar`);
}

function renderMarkup(selector, markup) {
    const container = document.getElementById(selector);
    if (container) container.innerHTML = markup;
}

function renderRepoSummary(repos) {
    const allRepos = sortByUpdated(repos);
    const languageCount = collectLanguages(allRepos).length;
    const latestUpdated = fmtDate(getLatestUpdated(allRepos));
    const topProject = getMostStarred(allRepos);

    setText('repo-total-stars', String(totalRepoStars(allRepos)));
    setText('repo-language-count', String(languageCount || 0));
    setText('repo-language-count-metric', String(languageCount || 0));
    setText('repo-last-updated', latestUpdated);
    setText('repo-latest-label', latestUpdated);
    setText('repo-top-project', safeText(topProject?.name, '暂无'));
}

function renderRepos(repos) {
    const items = sortByUpdated(repos);
    if (!items.length) {
        renderMarkup('project-list', `
            <article class="repo-card glass-card">
                <span class="tag">Repositories</span>
                <h3>暂时没有可展示的公开仓库</h3>
                <p class="repo-description">GitHub 接口没有返回公开仓库时，这里会保留一个空态提示，避免页面直接留白。</p>
            </article>
        `);
        renderRepoSummary(repoFallback);
        return;
    }

    const markup = items.map((repo) => {
        const tag = repoShowcaseMeta[repo.name]?.label || safeText(repo.language, 'Repository');
        const homepageUrl = repo.homepage ? safeUrl(repo.homepage, '') : '';
        const homepageAction = homepageUrl && homepageUrl !== '#'
            ? `<a class="button outline" href="${escapeHtml(homepageUrl)}" target="_blank" rel="noreferrer">项目主页</a>`
            : '';

        return `
            <article class="repo-card glass-card">
                <div class="repo-title-row">
                    <span class="tag">${escapeHtml(tag)}</span>
                    <span class="pill">${escapeHtml(safeText(repo.language, '未标注语言'))}</span>
                </div>
                <h3><a class="repo-name-link" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a></h3>
                <p class="repo-description">${escapeHtml(safeText(repo.description, '这个仓库暂未填写公开简介，可直接打开仓库查看 README 和代码。'))}</p>
                <div class="repo-stats">
                    <span>⭐ ${repo.stargazers_count ?? 0}</span>
                    <span>🍴 ${repo.forks_count ?? 0}</span>
                    <span>🕒 ${fmtDate(repo.updated_at)}</span>
                </div>
                <div class="repo-actions">
                    <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">打开仓库</a>
                    ${homepageAction}
                </div>
            </article>
        `;
    }).join('');

    renderMarkup('project-list', markup);
    renderRepoSummary(items);
}

function renderStarred(starredRepos) {
    const items = sortByUpdated(starredRepos);
    if (!items.length) {
        renderMarkup('star-list', `
            <article class="repo-card star-card glass-card">
                <span class="tag">Stars</span>
                <h3>暂时没有可展示的收藏项目</h3>
                <p class="repo-description">如果 GitHub Star 接口暂时不可用，页面会继续保留静态收藏摘要而不是出现空白区域。</p>
            </article>
        `);
        setText('star-count', '0');
        setText('star-language-count', '0');
        setText('star-top-name', '暂无');
        setText('star-last-updated', '未知');
        return;
    }

    const topStar = getMostStarred(items);
    const markup = items.map((repo) => `
        <article class="repo-card star-card glass-card">
            <div class="repo-title-row">
                <span class="tag">${escapeHtml(safeText(repo.language, 'Starred Repo'))}</span>
                <span class="pill">Starred</span>
            </div>
            <h3><a class="repo-name-link" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">${escapeHtml(repo.full_name || repo.name)}</a></h3>
            <p class="repo-description">${escapeHtml(safeText(repo.description, '这是最近点过 Star 的仓库，可以直接打开查看完整项目说明。'))}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count ?? 0}</span>
                <span>🕒 ${fmtDate(repo.updated_at)}</span>
            </div>
            <div class="repo-actions">
                <a class="button outline" href="${escapeHtml(safeUrl(repo.html_url))}" target="_blank" rel="noreferrer">查看仓库</a>
            </div>
        </article>
    `).join('');

    setText('star-count', String(items.length));
    setText('star-language-count', String(collectLanguages(items).length || 0));
    setText('star-top-name', safeText(topStar?.full_name || topStar?.name, '暂无'));
    setText('star-last-updated', fmtDate(getLatestUpdated(items)));
    renderMarkup('star-list', markup);
}

async function hydrateGithubData() {
    const status = document.querySelectorAll('[data-github-status]');
    const starStatus = document.querySelectorAll('[data-star-status]');
    const updateStatus = (text) => status.forEach((node) => { node.textContent = text; });
    const updateStarStatus = (text) => starStatus.forEach((node) => { node.textContent = text; });

    renderProfile(profileFallback, repoFallback);
    renderRepos(repoFallback);
    renderStarred(starredFallback);
    updateStatus('已先展示静态摘要，联网后会自动刷新为 GitHub 公开资料。');
    updateStarStatus('已先展示静态 Star 摘要，联网后会自动刷新。');

    try {
        const [profileRes, reposRes, starredRes] = await Promise.allSettled([
            fetch('https://api.github.com/users/zhyx1996', { headers: { Accept: 'application/vnd.github+json' } }),
            fetch('https://api.github.com/users/zhyx1996/repos?sort=updated&per_page=100', { headers: { Accept: 'application/vnd.github+json' } }),
            fetch('https://api.github.com/users/zhyx1996/starred?sort=updated&per_page=100', { headers: { Accept: 'application/vnd.github+json' } })
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
                const publicRepos = repoData.filter((repo) => !repo.private);
                if (publicRepos.length) {
                    repos = publicRepos;
                    hasLiveRepos = true;
                }
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
        renderStarred(starredRepos);

        if (hasLiveProfile || hasLiveRepos) {
            updateStatus('GitHub 公开资料已刷新，首页与仓库页展示的是实时接口数据。');
        } else {
            updateStatus('暂时未能连接 GitHub API，页面已保留静态摘要与仓库信息。');
        }

        if (hasLiveStars) {
            updateStarStatus('Star 列表已刷新，展示的是最近获取到的公开收藏项目。');
        } else {
            updateStarStatus('暂时未能连接 GitHub Star 接口，页面已保留静态 Star 摘要。');
        }
    } catch (error) {
        updateStatus('暂时未能连接 GitHub API，页面已保留静态摘要与仓库信息。');
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
        <article class="market-card glass-card">
            <small>USD / CNY</small>
            <strong class="market-value">${fmtRate(data.usdCny)}</strong>
            <span class="market-change">1 美元 ≈ ${fmtRate(data.usdCny)} 人民币</span>
            ${renderMarketFacts([
                { label: 'SGD / CNY', value: fmtRate(data.sgdCny) },
                { label: 'JPY / CNY', value: fmtRate(data.jpyPerCny, 2) }
            ])}
        </article>
        <article class="market-card glass-card">
            <small>现货黄金</small>
            <strong class="market-value">¥${fmtPrice(data.gold.cnyPerGram, 2)} / g</strong>
            ${changeHTML(data.gold.change24h)}
            ${renderMarketFacts([
                { label: '美元 / 盎司', value: `$${fmtPrice(data.gold.usdPerOunce, 2)}` },
                { label: '换算说明', value: '按金衡盎司换算人民币克价' }
            ])}
        </article>
        <article class="market-card glass-card">
            <small>Bitcoin</small>
            <strong class="market-value">¥${fmtPrice(data.btc.cnyPerBtc)} / BTC</strong>
            ${changeHTML(data.btc.change24h)}
            ${renderMarketFacts([
                { label: '美元价格', value: `$${fmtPrice(data.btc.usd, 2)}` },
                { label: '用途', value: '作为高波动资产参考' }
            ])}
        </article>
        <article class="market-card glass-card">
            <small>92# 汽油</small>
            <strong class="market-value">¥${fmtPrice(data.gas92.cnyPerLiter, 2)} / L</strong>
            <span class="market-change">${escapeHtml(data.gas92.note || '当前展示全国参考价')}</span>
            ${renderMarketFacts([
                { label: '数据来源', value: safeText(data.gas92.source, '静态摘要') },
                { label: '说明', value: '优先读取公开油价页面' }
            ])}
        </article>
    `;
}

function fetchWithTimeout(url, options = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const urlText = String(url);
        const label = urlText.length > MAX_URL_LABEL_LENGTH ? `${urlText.slice(0, URL_TRUNCATE_LENGTH)}...` : urlText;
        const timer = window.setTimeout(() => reject(new Error(`Request timed out: ${label}`)), timeout);
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
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extractGas92PriceFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = [...doc.querySelectorAll('tr, li, p')];
    const values = [];

    for (const row of rows) {
        const text = normalizeWhitespace(row.textContent);
        if (!text || !GAS92_ROW_HINT.test(text)) continue;
        const matches = [...text.matchAll(GAS92_VALUE_PATTERN)]
            .map((match) => Number(match[1]))
            .filter((value) => Number.isFinite(value) && value >= GAS92_PRICE_RANGE.min && value <= GAS92_PRICE_RANGE.max);
        values.push(...matches);
    }

    if (values.length >= GAS92_MIN_SAMPLE_COUNT) return average(values);

    const text = normalizeWhitespace(doc.body?.textContent || html);
    const directMatch = text.match(/92[#号]?(?:汽油)?[^0-9]{0,12}(\d+(?:\.\d{1,3})?)(?:\s*元)?\s*(?:\/|每)?\s*升/i);
    if (directMatch) return Number(directMatch[1]);

    const fallbackMatches = [...text.matchAll(GAS92_PRICE_WITH_UNIT_PATTERN)]
        .map((match) => Number(match[1]))
        .filter((value) => Number.isFinite(value) && value >= GAS92_PRICE_RANGE.min && value <= GAS92_PRICE_RANGE.max);

    if (fallbackMatches.length) return average(fallbackMatches);
    return null;
}

const gas92FetchPlans = [
    {
        label: '油价网',
        url: 'https://youjia.chemcp.com/',
        parser: extractGas92PriceFromHtml
    },
    {
        label: '金投网',
        url: 'https://gas.cngold.org/',
        parser: extractGas92PriceFromHtml
    }
];

function buildGas92Candidates(plan) {
    const encodedUrl = encodeURIComponent(plan.url);
    return [
        { requestUrl: plan.url, parser: plan.parser, source: plan.label },
        { requestUrl: `https://r.jina.ai/http://${plan.url.replace(/^https?:\/\//, '')}`, parser: plan.parser, source: `${plan.label} / jina` },
        { requestUrl: `https://r.jina.ai/http://r.jina.ai/http://${encodedUrl}`, parser: plan.parser, source: `${plan.label} / mirror` }
    ];
}

async function loadGas92Price() {
    for (const plan of gas92FetchPlans) {
        for (const candidate of buildGas92Candidates(plan)) {
            try {
                const response = await fetchWithTimeout(candidate.requestUrl, {
                    headers: { Accept: 'text/html,application/xhtml+xml' }
                }, 5000);
                if (!response.ok) continue;
                const html = await response.text();
                const price = candidate.parser(html);
                if (Number.isFinite(price) && price > 0) {
                    return {
                        cnyPerLiter: price,
                        note: '基于公开油价页面估算全国 92# 参考价',
                        source: candidate.source
                    };
                }
            } catch (error) {
                console.warn('Failed to load gas92 candidate', candidate.requestUrl, error);
            }
        }
    }

    return null;
}

async function hydrateMarketData() {
    const marketContainer = document.getElementById('market-grid');
    const statusEl = document.querySelector('[data-market-status]');
    if (!marketContainer && !statusEl) return;
    const updateMarketStatus = (text) => { if (statusEl) statusEl.textContent = text; };

    renderMarket(marketFallback);
    updateMarketStatus('正在刷新汇率、黄金、比特币与 92# 汽油...');

    try {
        const [ratesResult, cryptoResult, goldResult, gas92Result] = await Promise.allSettled([
            fetch('https://open.er-api.com/v6/latest/USD'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,cny&include_24hr_change=true'),
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
        let hasLiveUsdCny = false;

        if (ratesResult.status === 'fulfilled' && ratesResult.value.ok) {
            const ratesData = await ratesResult.value.json();
            const rates = ratesData.rates;
            const cnyBase = Number(rates?.CNY);
            if (cnyBase) {
                marketData.usdCny = cnyBase;
                if (rates.SGD) marketData.sgdCny = cnyBase / Number(rates.SGD);
                if (rates.JPY) marketData.jpyPerCny = Number(rates.JPY) / cnyBase;
                hasLiveData = true;
                hasLiveUsdCny = true;
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

        if (goldResult.status === 'fulfilled' && goldResult.value.ok && hasLiveUsdCny) {
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

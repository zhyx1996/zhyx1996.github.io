const profileFallback = {
    name: 'ZYX',
    login: 'zhyx1996',
    bio: '围绕计算机视觉、自动驾驶感知、并行计算与公开写作做持续实践。',
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

const sponsorFallback = {
    current: ['LizardByte', 'glenn-jocher'],
    past: ['ncw']
};

const CNBLOGS_BLOG_APP = 'fix-me';
const CNBLOGS_HOME_URL = `https://www.cnblogs.com/${CNBLOGS_BLOG_APP}`;

const articleFallback = [
    {
        title: '博客园主页',
        link: CNBLOGS_HOME_URL,
        summary: '这里会展示最近从博客园主页获取到的文章；如果外部站点暂时不可用，至少保留一个直达主页入口，避免页面留白。',
        published_at: null,
        source: '博客园',
        isFallbackHub: true
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
const GOLD_API_BASE_URL = 'https://www.gold-api.com/api/XAU/USD';
const GOLD_LEGACY_API_URL = 'https://api.gold-api.com/price/XAU';
const GOLD_HISTORY_LOOKBACK_DAY_OFFSETS = [1, 2, 3];
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const GAS92_PRICE_RANGE = { min: 5, max: 10 };
const GAS92_SUCCESS_CODES = new Set([0, 200, '0', '200']);
const MAX_URL_LABEL_LENGTH = 96;
const URL_TRUNCATE_LENGTH = 93;
const ARTICLE_SUMMARY_TRUNCATE_LENGTH = 120;
const ARTICLE_SUMMARY_WORD_BOUNDARY_MIN_RATIO = 0.6;
const ARTICLE_DIGEST_TRUNCATE_LENGTH = 96;
const ARTICLE_DIGEST_MIN_LENGTH = 36;
const ARTICLE_DIGEST_LIST_LIMIT = 6;
const ARTICLE_HIGHLIGHT_DIGEST_LIMIT = 3;
const ARTICLE_EXCERPT_MIN_LENGTH = 48;
const ARTICLE_READABLE_TEXT_MIN_LENGTH = 12;
const ARTICLE_DETAIL_FETCH_TIMEOUT_MS = 3000;
const ARTICLE_DETAIL_BATCH_SIZE = 3;
const ARTICLE_PENDING_SYNC_TEXT = '待同步';
const ARTICLE_DIGEST_TRIM_PREFIX_PATTERN = /^[:：\-—|·\s]+/;
const ARTICLE_DIGEST_SENTENCE_PATTERN = /[^。！？!?；;]+[。！？!?；;]?/g;
const CNBLOGS_HOME_ENTRY_SELECTORS = '.forFlow .day, .forFlow .postItem, .forFlow .entrylistItem, #post_list .post-item, #post_list .entrylistItem';
const CNBLOGS_HOME_TITLE_SELECTORS = '.entrylistPosttitle a, a.postTitle2, .postTitle2 a, a.postTitle, .postTitle a, a.entrylistItemTitle';
const CNBLOGS_ARTICLE_SELECTORS = '.entrylistPosttitle a, a.postTitle2, .postTitle2 a, a.postTitle, .postTitle a, a.entrylistItemTitle, #mainContent a[href*="/p/"], #mainContent a[href*="/articles/"]';
const CNBLOGS_ARTICLE_BODY_SELECTORS = [
    '#cnblogs_post_body',
    '.postBody',
    '.blogpost-body',
    '.entry-content',
    '.post .postBody',
    'article'
].join(', ');
const CNBLOGS_ARTICLE_META_DESCRIPTION_SELECTORS = 'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]';
const CNBLOGS_ARTICLE_CONTENT_SKIP_SELECTORS = [
    'script',
    'style',
    'noscript',
    'pre',
    'code',
    '.cnblogs_code',
    '.copy-code',
    '.postDesc',
    '.clear',
    '.ad_text',
    '.under-post-card'
].join(', ');
const CNBLOGS_ARTICLE_DETAIL_PROXY_BUILDERS = [
    { label: '博客园正文', buildUrl: (articleUrl) => articleUrl },
    { label: '博客园正文 / allorigins', buildUrl: (articleUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(articleUrl)}` },
    { label: '博客园正文 / codetabs', buildUrl: (articleUrl) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(articleUrl)}` },
    { label: '博客园正文 / corsproxy', buildUrl: (articleUrl) => `https://corsproxy.io/?${encodeURIComponent(articleUrl)}` }
];
const CNBLOGS_OPEN_API_POSTS_URL = `https://api.cnblogs.com/api/blog/posts/@${CNBLOGS_BLOG_APP}?pageIndex=1&pageSize=10`;
const CNBLOGS_OPEN_API_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(CNBLOGS_OPEN_API_POSTS_URL)}`;
const CNBLOGS_WCF_POSTS_URL = `https://wcf.open.cnblogs.com/blog/u/${CNBLOGS_BLOG_APP}/posts/1/10`;
const CNBLOGS_WCF_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(CNBLOGS_WCF_POSTS_URL)}`;
const CNBLOGS_HOME_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(CNBLOGS_HOME_URL)}`;
const CNBLOGS_RSS_PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${CNBLOGS_HOME_URL}/rss`)}`;
const CNBLOGS_DATE_PATTERN = /\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?|\d{4}年\d{1,2}月\d{1,2}日/;
const GOLD_CHANGE_KEYS = ['chg_percentage', 'change_percent', 'change_percentage', 'changePercentage', 'changePercent', 'chp'];
const GOLD_PREVIOUS_PRICE_KEYS = ['previous_close_price', 'prev_close_price', 'previous_close', 'prev_close', 'open_price', 'open'];

const pickFirstDefined = (source, keys) => {
    for (const key of keys) {
        if (source?.[key] != null) return source[key];
    }
    return null;
};
const isoDateDaysAgo = (days) => {
    const date = new Date(Date.now() - days * MILLISECONDS_PER_DAY);
    return date.toISOString().slice(0, 10);
};
const buildGoldHistoryCandidates = (historyDate) => {
    const compactDate = historyDate.replace(/-/g, '');
    const candidates = [{ historyDate, requestUrl: `${GOLD_API_BASE_URL}/${historyDate}` }];
    if (compactDate !== historyDate) {
        candidates.push({ historyDate, requestUrl: `${GOLD_API_BASE_URL}/${compactDate}` });
    }
    return candidates;
};

const totalRepoStars = (repos) => repos.reduce((sum, repo) => sum + Number(repo?.stargazers_count || 0), 0);
const sortByUpdated = (items) => [...items].sort((left, right) => new Date(right?.updated_at || 0) - new Date(left?.updated_at || 0));
const collectLanguages = (items) => [...new Set(items.map((item) => safeText(item?.language, '')).filter(Boolean))];
const getLatestUpdated = (items) => sortByUpdated(items)[0]?.updated_at || null;
const getMostStarred = (items) => [...items].sort((left, right) => Number(right?.stargazers_count || 0) - Number(left?.stargazers_count || 0))[0] || null;
const joinNames = (items) => items.filter(Boolean).join('、');
const toTimestamp = (value) => {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
};
const sortArticles = (items) => [...items].sort((left, right) => toTimestamp(right?.published_at || right?.updated_at) - toTimestamp(left?.published_at || left?.updated_at));

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

const setTextAll = (selector, value) => {
    document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
    });
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

function ensureAmbientBackdrop() {
    const body = document.body;
    if (!body || body.querySelector('.site-ambient[data-site-ambient]')) return;

    const ambient = document.createElement('div');
    ambient.className = 'site-ambient';
    ambient.setAttribute('aria-hidden', 'true');
    ambient.dataset.siteAmbient = 'true';
    ambient.innerHTML = `
        <span class="site-ambient-orb site-ambient-orb-a"></span>
        <span class="site-ambient-orb site-ambient-orb-b"></span>
        <span class="site-ambient-orb site-ambient-orb-c"></span>
        <span class="site-ambient-grid"></span>
        <span class="site-ambient-grid site-ambient-grid-b"></span>
        <span class="site-ambient-beam site-ambient-beam-a"></span>
        <span class="site-ambient-beam site-ambient-beam-b"></span>
    `;
    body.prepend(ambient);
}

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

function renderAboutSummary(profile = profileFallback, repos = repoFallback, starredRepos = starredFallback, sponsors = sponsorFallback) {
    const publicRepoCount = Number(profile?.public_repos ?? repos.length ?? 0);
    const repoStars = totalRepoStars(repos);
    const repoLatestUpdated = fmtDate(getLatestUpdated(repos));
    const starCount = Array.isArray(starredRepos) ? starredRepos.length : 0;
    const starLanguageCount = collectLanguages(starredRepos).length;
    const topStar = getMostStarred(starredRepos);
    const currentSponsors = Array.isArray(sponsors?.current) ? sponsors.current : sponsorFallback.current;
    const pastSponsors = Array.isArray(sponsors?.past) ? sponsors.past : sponsorFallback.past;
    const currentSponsorNames = joinNames(currentSponsors);
    const pastSponsorNames = joinNames(pastSponsors);
    let sponsorSummary = '当前没有可展示的公开 Sponsoring 信息。';

    if (currentSponsors.length || pastSponsors.length) {
        const summaryParts = [];

        summaryParts.push(
            currentSponsors.length
                ? `当前公开显示正在赞助 ${currentSponsors.length} 个开发者/组织：${safeText(currentSponsorNames, '暂无公开赞助对象')}。`
                : '当前公开没有正在赞助的开发者/组织。'
        );

        if (pastSponsors.length) {
            summaryParts.push(`历史上还赞助过 ${pastSponsors.length} 个开发者/组织：${safeText(pastSponsorNames, '暂无公开历史赞助对象')}。`);
        }

        sponsorSummary = summaryParts.join('');
    }

    setText(
        'about-repo-summary',
        publicRepoCount
            ? `当前公开仓库 ${publicRepoCount} 个，累计获得 ${repoStars} 个 Star，最近一次公开更新在 ${repoLatestUpdated}。`
            : '当前还没有可展示的公开仓库摘要。'
    );
    setText(
        'about-star-summary',
        starCount
            ? `当前公开收藏 ${starCount} 个项目，覆盖 ${starLanguageCount} 种语言；最近最受关注的项目是 ${safeText(topStar?.full_name || topStar?.name, '暂无')}。`
            : '当前还没有可展示的公开 Stars 摘要。'
    );
    setText(
        'about-sponsor-summary',
        sponsorSummary
    );
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

const stripHtmlTags = (value) => {
    const doc = new DOMParser().parseFromString(`<body>${String(value ?? '')}</body>`, 'text/html');
    return normalizeWhitespace(doc.body?.textContent || '');
};

const normalizeArticle = (item) => ({
    title: normalizeWhitespace(item?.title),
    link: safeUrl(item?.link, ''),
    summary: normalizeWhitespace(item?.summary || item?.description || ''),
    published_at: item?.published_at || item?.pubDate || item?.date || null,
    source: safeText(item?.source, '博客园'),
    isFallbackHub: Boolean(item?.isFallbackHub)
});

function buildSummaryExcerpt(value, maxLength = ARTICLE_SUMMARY_TRUNCATE_LENGTH) {
    const text = normalizeWhitespace(value);
    if (!text || text.length <= maxLength) return text;

    const slice = text.slice(0, maxLength + 1);
    const boundary = slice.lastIndexOf(' ');
    const hasUsefulBoundary = boundary !== -1 && boundary > Math.floor(maxLength * ARTICLE_SUMMARY_WORD_BOUNDARY_MIN_RATIO);
    const end = hasUsefulBoundary ? boundary : maxLength;
    return `${slice.slice(0, end).trimEnd()}…`;
}

function buildSentenceExcerpt(value, maxLength = ARTICLE_SUMMARY_TRUNCATE_LENGTH) {
    const text = normalizeWhitespace(value);
    if (!text) return '';

    const sentences = text.match(ARTICLE_DIGEST_SENTENCE_PATTERN)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    let excerpt = '';

    for (const sentence of sentences) {
        const nextExcerpt = excerpt ? `${excerpt} ${sentence}` : sentence;
        if (nextExcerpt.length > maxLength) break;
        excerpt = nextExcerpt;
        if (excerpt.length >= Math.min(ARTICLE_EXCERPT_MIN_LENGTH, maxLength)) break;
    }

    return excerpt || buildSummaryExcerpt(text, maxLength);
}

function removeTitlePrefix(text, title) {
    const normalizedText = normalizeWhitespace(text);
    const normalizedTitle = normalizeWhitespace(title);
    if (!normalizedText || !normalizedTitle) return normalizedText;
    return normalizedText.toLowerCase().startsWith(normalizedTitle.toLowerCase())
        ? normalizedText.slice(normalizedTitle.length).replace(ARTICLE_DIGEST_TRIM_PREFIX_PATTERN, '').trim()
        : normalizedText;
}

function extractReadableTextSegments(node, title = '') {
    if (!node) return [];

    const clone = node.cloneNode(true);
    clone.querySelectorAll(CNBLOGS_ARTICLE_CONTENT_SKIP_SELECTORS).forEach((element) => element.remove());

    const paragraphTexts = [...clone.querySelectorAll('p, li, blockquote')]
        .map((element) => removeTitlePrefix(element.textContent, title))
        .map(normalizeWhitespace)
        .filter((text) => text.length >= ARTICLE_READABLE_TEXT_MIN_LENGTH);

    if (paragraphTexts.length) return paragraphTexts;

    const fallbackText = removeTitlePrefix(clone.textContent, title);
    return fallbackText ? [normalizeWhitespace(fallbackText)] : [];
}

function renderArticleSummary(articles) {
    const items = sortArticles(articles);
    const placeholderOnly = items.length === 1 && items[0]?.isFallbackHub;
    const latestArticle = items[0] || null;
    const latestDate = latestArticle?.published_at || latestArticle?.updated_at || null;

    setTextAll('[data-article-count]', placeholderOnly ? '待刷新' : String(items.length));
    setTextAll('[data-article-last-updated]', placeholderOnly ? '待刷新' : fmtDate(latestDate));
    setTextAll('[data-article-last-updated-hero]', placeholderOnly ? '待刷新' : fmtDate(latestDate));
    setTextAll('[data-article-latest-title]', placeholderOnly ? '博客园主页' : safeText(latestArticle?.title, '暂无'));
    setTextAll('[data-article-source]', placeholderOnly ? '博客园主页' : safeText(latestArticle?.source, '博客园'));
}

function buildArticleDigest(article) {
    const fallback = article.isFallbackHub
        ? '当前先保留博客园主页入口，待网络可用后会自动替换为最近文章与对应内容提要。'
        : '摘要源暂时没有返回更多正文信息，可以直接打开原文继续阅读。';
    const summary = normalizeWhitespace(article.summary);
    const normalizedTitle = normalizeWhitespace(article.title);
    const summaryStartsWithTitle = normalizedTitle
        && summary.toLocaleLowerCase().startsWith(normalizedTitle.toLocaleLowerCase());
    const withoutTitle = summaryStartsWithTitle
        ? summary.slice(normalizedTitle.length).replace(ARTICLE_DIGEST_TRIM_PREFIX_PATTERN, '').trim()
        : summary;
    const candidate = withoutTitle || summary;
    if (!candidate) return fallback;

    const sentences = candidate.match(ARTICLE_DIGEST_SENTENCE_PATTERN)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    let digest = '';

    for (const sentence of sentences) {
        const nextDigest = digest ? `${digest} ${sentence}` : sentence;
        if (nextDigest.length > ARTICLE_DIGEST_TRUNCATE_LENGTH) break;
        digest = nextDigest;
        if (digest.length >= ARTICLE_DIGEST_MIN_LENGTH) break;
    }

    return digest || buildSummaryExcerpt(candidate, ARTICLE_DIGEST_TRUNCATE_LENGTH) || fallback;
}

function buildArticleDigestMarkup(articles, limit = ARTICLE_DIGEST_LIST_LIMIT) {
    return sortArticles(articles).slice(0, limit).map((article, index) => {
        const publishedText = article.published_at ? fmtDate(article.published_at) : ARTICLE_PENDING_SYNC_TEXT;
        const digest = buildArticleDigest(article);
        const badgeLabel = article.isFallbackHub ? '入口' : `摘要 ${String(index + 1).padStart(2, '0')}`;

        return `
            <article class="card glass-card article-digest-card">
                <div class="repo-title-row">
                    <span class="badge">${escapeHtml(badgeLabel)}</span>
                    <span class="pill">${escapeHtml(publishedText)}</span>
                </div>
                <h3><a class="repo-name-link" href="${escapeHtml(safeUrl(article.link))}" target="_blank" rel="noreferrer">${escapeHtml(safeText(article.title, '未命名文章'))}</a></h3>
                <p class="article-digest-text">${escapeHtml(digest)}</p>
                <p class="article-digest-meta">基于已同步文章信息生成 · ${escapeHtml(safeText(article.source, '博客园'))}</p>
            </article>
        `;
    }).join('');
}

function renderArticleDigests(articles) {
    renderMarkup('article-digest-list', buildArticleDigestMarkup(articles, ARTICLE_DIGEST_LIST_LIMIT));
    renderMarkup('article-highlight-digest-list', buildArticleDigestMarkup(articles, ARTICLE_HIGHLIGHT_DIGEST_LIMIT));
}

function buildArticleMarkup(articles, limit = articles.length) {
    return sortArticles(articles).slice(0, limit).map((article) => {
        const title = safeText(article.title, '未命名文章');
        const summary = safeText(
            article.summary,
            article.isFallbackHub
                ? '直接打开博客园主页，查看最新公开文章。'
                : '文章摘要暂时不可用，可以直接打开原文继续阅读。'
        );
        const actionLabel = article.isFallbackHub ? '打开博客园主页' : '阅读原文';
        const publishedText = article.published_at ? fmtDate(article.published_at) : ARTICLE_PENDING_SYNC_TEXT;

        return `
            <article class="repo-card article-card glass-card">
                <div class="repo-title-row">
                    <span class="tag">${escapeHtml(safeText(article.source, '博客园'))}</span>
                    <span class="pill">${escapeHtml(article.isFallbackHub ? '入口' : 'Article')}</span>
                </div>
                <h3><a class="repo-name-link" href="${escapeHtml(safeUrl(article.link))}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a></h3>
                <p class="repo-description">${escapeHtml(summary)}</p>
                <div class="repo-stats">
                    <span>🕒 ${publishedText}</span>
                </div>
                <div class="repo-actions">
                    <a class="button outline" href="${escapeHtml(safeUrl(article.link))}" target="_blank" rel="noreferrer">${actionLabel}</a>
                </div>
            </article>
        `;
    }).join('');
}

function renderArticles(rawArticles) {
    const normalizedArticles = rawArticles.map(normalizeArticle).filter((article) => article.title && article.link);
    const items = normalizedArticles.length ? normalizedArticles : articleFallback;

    renderMarkup('article-list', buildArticleMarkup(items));
    renderMarkup('article-highlight-list', buildArticleMarkup(items, 3));
    renderArticleDigests(items);
    renderArticleSummary(items);
}

function parseCnblogsRss(text, source) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) return [];

    return [...xml.querySelectorAll('item')].map((item) => ({
        title: normalizeWhitespace(item.querySelector('title')?.textContent),
        link: item.querySelector('link')?.textContent?.trim()
            || item.querySelector('link')?.getAttribute('href')?.trim()
            || item.querySelector('guid')?.textContent?.trim()
            || '',
        summary: stripHtmlTags(item.querySelector('description')?.textContent),
        published_at: item.querySelector('pubDate')?.textContent?.trim() || null,
        source
    })).filter((item) => item.title && item.link);
}

function parseCnblogsOpenApiPosts(text, source) {
    try {
        const payload = JSON.parse(text);
        const items = Array.isArray(payload) ? payload : payload?.items;
        if (!Array.isArray(items)) return [];

        return items.map((item) => ({
            title: normalizeWhitespace(item?.title),
            link: item?.url?.trim() || item?.link?.trim() || '',
            summary: buildSummaryExcerpt(stripHtmlTags(item?.summary || item?.description || item?.excerpt || '')),
            published_at: item?.postDate || item?.dateAdded || item?.published_at || null,
            source
        })).filter((item) => item.title && item.link);
    } catch {
        return [];
    }
}

function parseCnblogsWcfPosts(text, source) {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) return [];

    return [...xml.querySelectorAll('entry, post')].map((item) => {
        const idText = item.querySelector('id')?.textContent?.trim() || '';
        const idIsHttpUrl = idText.startsWith('http://') || idText.startsWith('https://');
        return {
            title: normalizeWhitespace(
                item.querySelector('title')?.textContent
                || item.querySelector('Title')?.textContent
            ),
            link: item.querySelector('link')?.getAttribute('href')?.trim()
                || (idIsHttpUrl ? idText : '')
                || item.querySelector('link')?.textContent?.trim()
                || item.querySelector('Url')?.textContent?.trim()
                || '',
            summary: buildSummaryExcerpt(stripHtmlTags(
                item.querySelector('summary')?.textContent
                || item.querySelector('content')?.textContent
                || item.querySelector('Summary')?.textContent
                || ''
            )),
            published_at: item.querySelector('published')?.textContent?.trim()
                || item.querySelector('updated')?.textContent?.trim()
                || item.querySelector('PublishDate')?.textContent?.trim()
                || null,
            source
        };
    }).filter((item) => item.title && item.link);
}

function normalizeCnblogsArticleLink(value) {
    try {
        const parsed = new URL(String(value ?? ''), CNBLOGS_HOME_URL);
        const path = parsed.pathname.replace(/\/+$/, '');
        if (parsed.hostname !== 'www.cnblogs.com') return '';
        if (!/^\/[^/]+\/(?:p|articles)\/[^/]+$/i.test(path)) return '';
        return `${parsed.origin}${path}`;
    } catch {
        return '';
    }
}

function extractCnblogsArticleFromContainer(container, source, seen) {
    if (!container) return null;

    const titleAnchor = container.querySelector(CNBLOGS_HOME_TITLE_SELECTORS);
    const title = normalizeWhitespace(titleAnchor?.textContent);
    const link = normalizeCnblogsArticleLink(titleAnchor?.getAttribute('href') || titleAnchor?.href || '');
    const identity = `${title.toLocaleLowerCase()}|${link}`;
    if (!title || !link || seen.has(identity)) return null;

    const summaryNode = container.querySelector('.entrylistItemPostDesc, .c_b_p_desc, .postCon, .entrylistPostSummary, .summary');
    const timeNode = container.querySelector('time, .postDesc, .entrylistItemPostDesc + div, .article_manage');
    const text = normalizeWhitespace(container.textContent || '');
    const timeText = timeNode?.getAttribute('datetime') || timeNode?.textContent?.trim() || '';
    const timeMatch = timeText.match(CNBLOGS_DATE_PATTERN);
    const dateMatch = timeMatch || text.slice(0, ARTICLE_SUMMARY_TRUNCATE_LENGTH).match(CNBLOGS_DATE_PATTERN);
    const summarySeed = summaryNode?.textContent
        || (text.startsWith(title) ? text.slice(title.length).trim() : text.replace(title, '').trim());
    const summary = buildSummaryExcerpt(summarySeed);

    seen.add(identity);

    return {
        title,
        link,
        summary,
        published_at: timeText || dateMatch?.[0] || null,
        source
    };
}

function parseCnblogsArticleList(html, source) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const seen = new Set();
    const entryArticles = [...doc.querySelectorAll(CNBLOGS_HOME_ENTRY_SELECTORS)]
        .map((container) => extractCnblogsArticleFromContainer(container, source, seen))
        .filter(Boolean);

    if (entryArticles.length) return entryArticles;

    const anchors = [...doc.querySelectorAll(CNBLOGS_ARTICLE_SELECTORS)];

    return anchors.map((anchor) => {
        const link = normalizeCnblogsArticleLink(anchor.getAttribute('href') || anchor.href || '');
        const title = normalizeWhitespace(anchor.textContent);
        const identity = `${title.toLocaleLowerCase()}|${link}`;
        if (!title || !link || link === '#' || seen.has(identity)) return null;

        const container = anchor.closest('article, li, section, div');
        const summaryNode = container?.querySelector('.entrylistItemPostDesc, .c_b_p_desc, .postCon, .entrylistPostSummary, .summary');
        const timeNode = container?.querySelector('time, .postDesc, .entrylistItemPostDesc + div, .article_manage');
        const text = normalizeWhitespace(container?.textContent || '');
        const timeText = timeNode?.getAttribute('datetime') || timeNode?.textContent?.trim() || '';
        const timeMatch = timeText.match(CNBLOGS_DATE_PATTERN);
        const dateMatch = timeMatch || text.slice(0, ARTICLE_SUMMARY_TRUNCATE_LENGTH).match(CNBLOGS_DATE_PATTERN);
        const summarySeed = summaryNode?.textContent
            || (text.startsWith(title) ? text.slice(title.length).trim() : text.replace(title, '').trim());
        const summary = buildSummaryExcerpt(summarySeed);
        seen.add(identity);

        return {
            title,
            link,
            summary,
            published_at: timeText || dateMatch?.[0] || null,
            source
        };
    }).filter(Boolean);
}

function parseCnblogsArticleDetail(html, article, source) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const detailNode = [...doc.querySelectorAll(CNBLOGS_ARTICLE_BODY_SELECTORS)]
        .map((node) => ({ node, segments: extractReadableTextSegments(node, article?.title) }))
        .filter((entry) => entry.segments.length)
        .sort((left, right) => right.segments.join(' ').length - left.segments.join(' ').length)[0];
    const detailSegments = detailNode?.segments || [];
    const detailText = detailSegments.join(' ');
    const metaDescription = normalizeWhitespace(
        doc.querySelector(CNBLOGS_ARTICLE_META_DESCRIPTION_SELECTORS)?.getAttribute('content') || ''
    );
    const summary = buildSentenceExcerpt(detailText || metaDescription);
    const timeValue = doc.querySelector('time')?.getAttribute('datetime')
        || doc.querySelector('time')?.textContent?.trim()
        || '';
    const publishedMatch = timeValue.match(CNBLOGS_DATE_PATTERN);

    if (!summary) return null;

    return {
        ...article,
        summary,
        published_at: article?.published_at || publishedMatch?.[0] || null,
        detailSource: source
    };
}

function buildCnblogsArticleDetailCandidates(articleUrl) {
    return CNBLOGS_ARTICLE_DETAIL_PROXY_BUILDERS.map((plan) => ({
        requestUrl: plan.buildUrl(articleUrl),
        source: plan.label
    }));
}

async function loadCnblogsArticleDetail(article) {
    if (!article?.link || article.isFallbackHub) return null;
    const articleLabel = safeText(article.title, article.link);

    for (const candidate of buildCnblogsArticleDetailCandidates(article.link)) {
        try {
            const response = await fetchWithTimeout(candidate.requestUrl, {
                headers: { Accept: 'text/html,application/xhtml+xml' }
            }, ARTICLE_DETAIL_FETCH_TIMEOUT_MS);
            if (!response.ok) {
                console.warn(`Failed to load cnblogs article detail from ${candidate.source}: HTTP ${response.status}`, articleLabel, candidate.requestUrl);
                continue;
            }

            const text = await response.text();
            const detail = parseCnblogsArticleDetail(text, article, candidate.source);
            if (detail?.summary) return detail;
        } catch (error) {
            console.warn(`Failed to load cnblogs article detail from ${candidate.source}`, articleLabel, candidate.requestUrl, error);
        }
    }

    return null;
}

async function enrichCnblogsArticles(rawArticles) {
    const normalizedArticles = rawArticles.map(normalizeArticle).filter((article) => article.title && article.link);
    if (!normalizedArticles.length) return [];

    const detailedArticles = [];

    for (let index = 0; index < normalizedArticles.length; index += ARTICLE_DETAIL_BATCH_SIZE) {
        const batch = normalizedArticles.slice(index, index + ARTICLE_DETAIL_BATCH_SIZE);
        const batchResults = await Promise.allSettled(batch.map((article) => loadCnblogsArticleDetail(article)));

        batchResults.forEach((result, batchIndex) => {
            const article = batch[batchIndex];
            detailedArticles.push(result.status === 'fulfilled' && result.value ? normalizeArticle(result.value) : article);
        });
    }

    return detailedArticles;
}

const cnblogsArticleCandidates = [
    {
        source: '博客园主页',
        requestUrl: CNBLOGS_HOME_URL,
        parser: parseCnblogsArticleList,
        accept: 'text/html,application/xhtml+xml'
    },
    {
        source: '博客园主页 / allorigins',
        requestUrl: CNBLOGS_HOME_PROXY_URL,
        parser: parseCnblogsArticleList,
        accept: 'text/html,application/xhtml+xml'
    },
    {
        source: '博客园开放 API',
        requestUrl: CNBLOGS_OPEN_API_POSTS_URL,
        parser: parseCnblogsOpenApiPosts,
        accept: 'application/json,text/plain'
    },
    {
        source: '博客园开放 API / allorigins',
        requestUrl: CNBLOGS_OPEN_API_PROXY_URL,
        parser: parseCnblogsOpenApiPosts,
        accept: 'application/json,text/plain'
    },
    {
        source: '博客园开放 API / WCF',
        requestUrl: CNBLOGS_WCF_POSTS_URL,
        parser: parseCnblogsWcfPosts,
        accept: 'application/atom+xml,application/xml,text/xml'
    },
    {
        source: '博客园开放 API / WCF / allorigins',
        requestUrl: CNBLOGS_WCF_PROXY_URL,
        parser: parseCnblogsWcfPosts,
        accept: 'application/atom+xml,application/xml,text/xml'
    },
    {
        source: '博客园 RSS',
        requestUrl: `${CNBLOGS_HOME_URL}/rss`,
        parser: parseCnblogsRss,
        accept: 'application/rss+xml,application/xml,text/xml'
    },
    {
        source: '博客园 RSS / rss.xml',
        requestUrl: `${CNBLOGS_HOME_URL}/rss.xml`,
        parser: parseCnblogsRss,
        accept: 'application/rss+xml,application/xml,text/xml'
    },
    {
        source: '博客园 RSS / allorigins',
        requestUrl: CNBLOGS_RSS_PROXY_URL,
        parser: parseCnblogsRss,
        accept: 'application/rss+xml,application/xml,text/xml'
    }
];

async function loadCnblogsArticles() {
    for (const candidate of cnblogsArticleCandidates) {
        try {
            const response = await fetchWithTimeout(candidate.requestUrl, {
                headers: { Accept: candidate.accept }
            }, 5000);
            if (!response.ok) {
                console.warn(`Failed to load cnblogs articles from ${candidate.source}: HTTP ${response.status}`, candidate.requestUrl);
                continue;
            }
            const text = await response.text();
            const articles = candidate.parser(text, candidate.source);
            if (Array.isArray(articles) && articles.length) return articles;
        } catch (error) {
            console.warn(`Failed to load cnblogs articles from ${candidate.source}`, candidate.requestUrl, error);
        }
    }

    return null;
}

async function hydrateArticles() {
    const articleStatus = document.querySelectorAll('[data-article-status]');
    const updateArticleStatus = (text) => articleStatus.forEach((node) => { node.textContent = text; });
    const hasArticleTargets = Boolean(
        articleStatus.length
        || document.getElementById('article-list')
        || document.getElementById('article-highlight-list')
    );
    if (!hasArticleTargets) return;

    renderArticles(articleFallback);
    updateArticleStatus('已先展示博客园主页入口，联网后会自动刷新为最近文章。');

    try {
        const articles = await loadCnblogsArticles();
        if (articles?.length) {
            renderArticles(articles);
            updateArticleStatus('博客园文章列表已刷新，正在逐篇补充正文摘要...');
            const enrichedArticles = await enrichCnblogsArticles(articles);
            const previousSummaries = articles.map((article) => normalizeWhitespace(article?.summary));
            const currentSummaries = enrichedArticles.map((article) => normalizeWhitespace(article?.summary));
            const hasDetailSummary = currentSummaries.some((summary, index) => summary !== previousSummaries[index]);
            if (hasDetailSummary) {
                renderArticles(enrichedArticles);
                updateArticleStatus('博客园文章已刷新，并已尽量补充每篇文章的正文摘要。');
            } else {
                updateArticleStatus('博客园文章已刷新，展示的是最近获取到的公开文章。');
            }
        } else {
            updateArticleStatus('暂时未能连接博客园，页面已保留主页入口。');
        }
    } catch (error) {
        updateArticleStatus('暂时未能连接博客园，页面已保留主页入口。');
        console.warn('Failed to load cnblogs articles', error);
    }
}

async function hydrateGithubData() {
    const status = document.querySelectorAll('[data-github-status]');
    const starStatus = document.querySelectorAll('[data-star-status]');
    const updateStatus = (text) => status.forEach((node) => { node.textContent = text; });
    const updateStarStatus = (text) => starStatus.forEach((node) => { node.textContent = text; });

    renderProfile(profileFallback, repoFallback);
    renderRepos(repoFallback);
    renderStarred(starredFallback);
    renderAboutSummary(profileFallback, repoFallback, starredFallback, sponsorFallback);
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
        renderAboutSummary(profile, repos, starredRepos, sponsorFallback);

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
    asOf: '2026-04-24T00:00:00Z',
    usdCny: 6.836,
    sgdCny: 5.35,
    jpyPerCny: 23.31,
    gold: {
        usdPerOunce: 4710,
        cnyPerGram: 1035.18,
        change24h: null,
        previousUsdPerOunce: null,
        source: '静态快照（2026-04-24）',
        historySource: '静态快照'
    },
    btc: { usd: 65800, cnyPerBtc: 449809, change24h: null },
    gas92: { cnyPerLiter: 8.51, note: '联网成功后展示全国 92# 汽油均价；当前为静态参考值', source: '静态快照（2026-04-24）' }
};

const fmtRate = (n, d = 4) => n != null ? Number(n).toFixed(d) : '暂无';
const fmtPrice = (n, digits = 0) => n != null ? Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '暂无';
const fmtFxLine = (baseAmount, baseUnit, quoteAmount, quoteUnit, digits = 4) => `${baseAmount} ${baseUnit} ≈ ${fmtRate(quoteAmount, digits)} ${quoteUnit}`;
const marketItemLabels = {
    fx: '汇率',
    gold: '黄金',
    btc: '比特币',
    gas92: '全国 92# 均价'
};
const normalizeMarketStatuses = (statuses = {}) => Object.fromEntries(
    Object.entries(marketItemLabels).map(([key, label]) => {
        const status = statuses[key] || {};
        return [key, {
            label,
            live: Boolean(status.live)
        }];
    })
);
const summarizeMarketStatuses = (statuses = {}) => {
    const normalized = normalizeMarketStatuses(statuses);
    return Object.values(normalized).reduce((summary, item) => {
        if (item.live) {
            summary.liveItems.push(item.label);
        } else {
            summary.fallbackItems.push(item.label);
        }
        return summary;
    }, { liveItems: [], fallbackItems: [] });
};
const marketStatusBadgeHTML = (status) => `
    <span class="market-status-badge ${status.live ? 'is-live' : 'is-fallback'}">${status.live ? '实时数据' : '静态快照'}</span>
`;
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
const buildForexFacts = (data) => [
    { label: 'USD / CNY', value: fmtFxLine('1', '美元', data.usdCny, '人民币') },
    { label: 'SGD / CNY', value: fmtFxLine('1', '新币', data.sgdCny, '人民币') },
    { label: 'CNY / JPY', value: fmtFxLine('1', '人民币', data.jpyPerCny, '日元', 2) }
];

function renderMarket(data, statuses = {}) {
    const container = document.getElementById('market-grid');
    if (!container) return;
    const marketStatuses = normalizeMarketStatuses(statuses);
    const fxFacts = buildForexFacts(data);

    container.innerHTML = `
        <article class="market-card glass-card">
            <div class="market-card-head">
                <small>外汇汇率</small>
                ${marketStatusBadgeHTML(marketStatuses.fx)}
            </div>
            <strong class="market-value">3 组常看汇率</strong>
            <span class="market-change">按 1 单位基准货币换算</span>
            ${renderMarketFacts(fxFacts)}
        </article>
        <article class="market-card glass-card">
            <div class="market-card-head">
                <small>现货黄金</small>
                ${marketStatusBadgeHTML(marketStatuses.gold)}
            </div>
            <strong class="market-value">¥${fmtPrice(data.gold.cnyPerGram, 2)} / g</strong>
            ${changeHTML(data.gold.change24h)}
            ${renderMarketFacts([
                { label: '美元 / 盎司', value: `$${fmtPrice(data.gold.usdPerOunce, 2)}` },
                {
                    label: '历史价格',
                    value: data.gold.previousUsdPerOunce != null
                        ? `$${fmtPrice(data.gold.previousUsdPerOunce, 2)}`
                        : '暂无'
                },
                { label: '历史来源', value: safeText(data.gold.historySource, '历史接口暂不可用') },
                { label: '数据来源', value: safeText(data.gold.source, '静态摘要') }
            ])}
        </article>
        <article class="market-card glass-card">
            <div class="market-card-head">
                <small>Bitcoin</small>
                ${marketStatusBadgeHTML(marketStatuses.btc)}
            </div>
            <strong class="market-value">¥${fmtPrice(data.btc.cnyPerBtc)} / BTC</strong>
            ${changeHTML(data.btc.change24h)}
            ${renderMarketFacts([
                { label: '美元价格', value: `$${fmtPrice(data.btc.usd, 2)}` },
                { label: '用途', value: '作为高波动资产参考' }
            ])}
        </article>
        <article class="market-card glass-card">
            <div class="market-card-head">
                <small>全国 92# 均价</small>
                ${marketStatusBadgeHTML(marketStatuses.gas92)}
            </div>
            <strong class="market-value">¥${fmtPrice(data.gas92.cnyPerLiter, 2)} / L</strong>
            <span class="market-change">${escapeHtml(data.gas92.note || '当前展示全国 92# 汽油均价')}</span>
            ${renderMarketFacts([
                { label: '数据来源', value: safeText(data.gas92.source, '静态摘要') },
                { label: '说明', value: '优先读取全国油价接口并计算 92# 均价' }
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

function normalizeGas92RegionName(value) {
    return normalizeWhitespace(value)
        .replace(/(?:壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u, '');
}

const gas92FetchPlans = [
    {
        label: 'xxapi 油价接口',
        url: 'https://v2.xxapi.cn/api/oilPrice'
    }
];

function buildGas92Candidates(plan) {
    const encodedUrl = encodeURIComponent(plan.url);
    return [
        { requestUrl: plan.url, source: plan.label },
        { requestUrl: `https://api.allorigins.win/raw?url=${encodedUrl}`, source: `${plan.label} / allorigins` },
        { requestUrl: `https://api.codetabs.com/v1/proxy?url=${encodedUrl}`, source: `${plan.label} / codetabs` },
        { requestUrl: `https://corsproxy.io/?${encodedUrl}`, source: `${plan.label} / corsproxy` }
    ];
}

function pickGas92EntryPrice(entry) {
    return [
        entry?.n92,
        entry?.p92,
        entry?.price92,
        entry?.oilPrice92,
        entry?.oil92,
        entry?.oil?.p92
    ].map((value) => Number(value))
        .find((value) => Number.isFinite(value) && value >= GAS92_PRICE_RANGE.min && value <= GAS92_PRICE_RANGE.max);
}

function extractGas92PriceFromApiPayload(payload) {
    let data;
    try {
        data = JSON.parse(payload);
    } catch {
        return null;
    }

    if (data?.code != null && !GAS92_SUCCESS_CODES.has(data.code)) {
        return null;
    }

    const entries = Array.isArray(data?.data)
        ? data.data
        : data?.data
            ? [data.data]
            : [];
    const validEntries = entries
        .map((entry) => ({
            regionName: normalizeGas92RegionName(
                entry?.regionName
                || entry?.name
                || entry?.province
                || entry?.region
                || entry?.city
                || ''
            ),
            price: pickGas92EntryPrice(entry),
            effectiveDate: normalizeWhitespace(entry?.updateTime || entry?.date || entry?.dt || '')
        }))
        .filter((entry) => entry.regionName && entry.price != null);
    if (!validEntries.length) return null;

    const uniqueRegionEntries = Array.from(
        validEntries.reduce((map, entry) => {
            if (!map.has(entry.regionName)) {
                map.set(entry.regionName, entry);
            }
            return map;
        }, new Map()).values()
    );
    if (!uniqueRegionEntries.length) return null;

    const averagePrice = uniqueRegionEntries.reduce((sum, entry) => sum + entry.price, 0) / uniqueRegionEntries.length;

    return {
        cnyPerLiter: averagePrice,
        sampleCount: uniqueRegionEntries.length,
        effectiveDate: normalizeWhitespace(
            uniqueRegionEntries.find((entry) => entry.effectiveDate)?.effectiveDate
            || data?.time
            || data?.date
            || ''
        )
    };
}

async function loadGas92Price() {
    for (const plan of gas92FetchPlans) {
        for (const candidate of buildGas92Candidates(plan)) {
            try {
                const response = await fetchWithTimeout(candidate.requestUrl, {
                    headers: { Accept: 'application/json,text/plain,*/*' }
                }, 5000);
                if (!response.ok) continue;
                const payload = await response.text();
                const result = extractGas92PriceFromApiPayload(payload);
                if (result) {
                    const sampleText = result.sampleCount ? `（${result.sampleCount}个地区均值）` : '';
                    return {
                        cnyPerLiter: result.cnyPerLiter,
                        note: `当前展示全国 92# 汽油实时均价${sampleText}`,
                        source: result.effectiveDate ? `${candidate.source}（${result.effectiveDate}）` : `${candidate.source}${sampleText}`
                    };
                }
            } catch (error) {
                console.warn('Failed to load gas92 candidate', candidate.requestUrl, error);
            }
        }
    }

    return null;
}

async function loadGoldPriceSnapshot() {
    const historyDates = GOLD_HISTORY_LOOKBACK_DAY_OFFSETS.map((days) => isoDateDaysAgo(days));
    const historyCandidates = historyDates.flatMap((historyDate) => buildGoldHistoryCandidates(historyDate));
    const [currentPrimaryResult, currentLegacyResult, ...historyResults] = await Promise.allSettled([
        fetchWithTimeout(GOLD_API_BASE_URL, {
            headers: { Accept: 'application/json' }
        }, 5000),
        fetchWithTimeout(GOLD_LEGACY_API_URL, {
            headers: { Accept: 'application/json' }
        }, 5000),
        ...historyCandidates.map((candidate) => fetchWithTimeout(candidate.requestUrl, {
            headers: { Accept: 'application/json' }
        }, 5000))
    ]);

    let currentData = null;
    let source = null;
    const currentCandidates = [
        { result: currentPrimaryResult, source: 'Gold-API' },
        { result: currentLegacyResult, source: 'Gold-API legacy' }
    ];
    for (const candidate of currentCandidates) {
        if (candidate.result.status !== 'fulfilled' || !candidate.result.value.ok) continue;
        currentData = await candidate.result.value.json();
        source = candidate.source;
        break;
    }

    if (!currentData) return null;

    const usdPerOunce = Number(pickFirstDefined(currentData, ['price', 'price_usd', 'price_ounce', 'price_per_ounce']));
    if (!Number.isFinite(usdPerOunce) || usdPerOunce <= 0) return null;

    let previousUsdPerOunce = Number(pickFirstDefined(currentData, GOLD_PREVIOUS_PRICE_KEYS));
    if (!Number.isFinite(previousUsdPerOunce) || previousUsdPerOunce <= 0) {
        previousUsdPerOunce = null;
    }

    let historySource = '历史接口暂不可用';
    if (previousUsdPerOunce) {
        historySource = 'Gold-API（当日开盘/前收参考）';
    }
    for (let index = 0; index < historyResults.length; index++) {
        const historyResult = historyResults[index];
        const candidate = historyCandidates[index];
        if (historyResult.status !== 'fulfilled' || !historyResult.value.ok) continue;
        const historyData = await historyResult.value.json();
        const historyPrice = Number(pickFirstDefined(historyData, ['price', 'price_usd', 'price_ounce', 'price_per_ounce']));
        if (Number.isFinite(historyPrice) && historyPrice > 0) {
            previousUsdPerOunce = historyPrice;
            historySource = `Gold-API（${candidate.historyDate}）`;
            break;
        }
    }

    let change24h = pickFirstDefined(currentData, GOLD_CHANGE_KEYS);
    if (change24h == null && previousUsdPerOunce) {
        change24h = ((usdPerOunce - previousUsdPerOunce) / previousUsdPerOunce) * 100;
    }

    return {
        usdPerOunce,
        previousUsdPerOunce,
        change24h,
        source: source || 'Gold-API',
        historySource
    };
}

async function hydrateMarketData() {
    const marketContainer = document.getElementById('market-grid');
    const statusEl = document.querySelector('[data-market-status]');
    const fallbackNoticeEl = document.querySelector('[data-market-fallback-note]');
    if (!marketContainer && !statusEl && !fallbackNoticeEl) return;
    const updateMarketStatus = (text) => { if (statusEl) statusEl.textContent = text; };
    const fallbackDateText = fmtDate(marketFallback.asOf);
    const updateFallbackNotice = (text, visible = true) => {
        if (!fallbackNoticeEl) return;
        fallbackNoticeEl.textContent = text;
        fallbackNoticeEl.hidden = !visible;
    };

    const initialMarketStatuses = normalizeMarketStatuses();
    renderMarket(marketFallback, initialMarketStatuses);
    updateFallbackNotice(`当前先展示静态行情参考（快照日期：${fallbackDateText}）：汇率、黄金、比特币、全国 92# 均价当前均为静态数据；联网后会按可用接口逐项刷新。`);
    updateMarketStatus('正在刷新行情数据；当前四项均为静态参考。');

    try {
        const [ratesResult, cryptoResult, goldResult, gas92Result] = await Promise.allSettled([
            fetch('https://open.er-api.com/v6/latest/USD'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,cny&include_24hr_change=true'),
            loadGoldPriceSnapshot(),
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
        let hasLiveCrypto = false;
        let hasLiveGold = false;

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
                hasLiveCrypto = true;
            }
            hasLiveData = true;
        }

        if (goldResult.status === 'fulfilled' && goldResult.value && hasLiveUsdCny) {
            marketData.gold = {
                usdPerOunce: goldResult.value.usdPerOunce,
                previousUsdPerOunce: goldResult.value.previousUsdPerOunce,
                cnyPerGram: (goldResult.value.usdPerOunce * marketData.usdCny) / GOLD_TROY_OUNCE_GRAMS,
                change24h: goldResult.value.change24h,
                source: goldResult.value.source,
                historySource: goldResult.value.historySource
            };
            hasLiveGold = true;
            hasLiveData = true;
        }

        if (gas92Result.status === 'fulfilled' && gas92Result.value) {
            marketData.gas92 = gas92Result.value;
            hasLiveGas92 = true;
        }

        const marketStatuses = normalizeMarketStatuses({
            fx: { live: hasLiveUsdCny },
            gold: { live: hasLiveGold },
            btc: { live: hasLiveCrypto },
            gas92: { live: hasLiveGas92 }
        });
        const { liveItems, fallbackItems } = summarizeMarketStatuses(marketStatuses);
        renderMarket(marketData, marketStatuses);
        const fullyLive = liveItems.length === Object.keys(marketItemLabels).length;
        if (fullyLive) {
            updateFallbackNotice('', false);
        } else {
            updateFallbackNotice(`当前仍含静态行情参考（静态快照日期：${fallbackDateText}）：${fallbackItems.join('、')}仍为静态数据；其余项目已刷新。`);
        }
        if (hasLiveData || hasLiveGas92) {
            const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
            const liveText = liveItems.length ? `已刷新：${liveItems.join('、')}` : '已刷新：暂无';
            const fallbackText = fallbackItems.length ? `；静态：${fallbackItems.join('、')}` : '；静态：无';
            updateMarketStatus(`${liveText}${fallbackText}（${now}）`);
        } else {
            updateMarketStatus('行情接口暂时不可用，当前展示的是本地参考数据。');
        }
    } catch (error) {
        updateMarketStatus('行情接口暂时不可用，当前展示的是本地参考数据。');
        console.warn('Failed to load market data', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    ensureAmbientBackdrop();
    hydrateGithubData();
    hydrateArticles();
    hydrateMarketData();
});

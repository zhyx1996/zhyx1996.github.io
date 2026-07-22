/**
 * site-maintenance.js — zhyx1996.github.io 自愈式维护脚本
 *
 * 功能：
 *   1. 检测所有外部链接可用性
 *   2. 测试所有 API 端点
 *   3. 拉取最新 GitHub 公开数据，更新 fallback 数据
 *   4. 拉取最新博客园 RSS，更新文章 fallback
 *   5. CSS 美化增量改进（按计划队列执行）
 *   6. 生成状态报告
 *
 * 用法：node scripts/maintenance.js [--fix] [--report]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 代理配置：国外 API 需要通过代理访问
const PROXY_URL = process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:18808';
let HttpsProxyAgent, HttpProxyAgent;
try {
    HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
    HttpProxyAgent = require('http-proxy-agent').HttpProxyAgent;
} catch {
    process.stdout.write('⚠️ 未安装代理包，国外 API 可能无法访问\n');
}

// ─── 常量 ────────────────────────────────────────────────────────
const SITE_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(__dirname, 'reports');
const STATE_FILE = path.join(__dirname, '.maintenance-state.json');
const APP_JS = path.join(SITE_DIR, 'app.js');
const STYLES_CSS = path.join(SITE_DIR, 'styles.css');

// ─── 工具函数 ────────────────────────────────────────────────────
function needsProxy(url) {
    try {
        const host = new URL(url).hostname;
        const bypass = ['localhost', '127.0.0.1', 'cnblogs.com', 'feed.cnblogs.com', 'api.github.com'];
        return !bypass.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
}

function getAgent(url) {
    if (!needsProxy(url) || !HttpsProxyAgent) return undefined;
    return url.startsWith('https') ? new HttpsProxyAgent(PROXY_URL) : new HttpProxyAgent(PROXY_URL);
}

function getJSON(url, opts = {}) {
    const maxRetries = opts.retries || 1;
    let attempt = 0;
    const agent = getAgent(url);
    function tryOnce() {
        return new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            const req = mod.get(url, {
                headers: {
                    'User-Agent': 'site-maintenance/1.0',
                    'Accept': 'application/json',
                    ...opts.headers
                },
                timeout: opts.timeout || 8000,
                agent,
                ...opts
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
            });
            req.on('error', reject);
            req.on('timeout', () => req.destroy(new Error('timeout')));
        });
    }
    return new Promise((resolve, reject) => {
        const attemptFetch = () => {
            tryOnce().then(resolve).catch(e => {
                attempt++;
                if (attempt < maxRetries) {
                    process.stdout.write(`    ⚠️ 重试 ${attempt}/${maxRetries} (${e.message})`);
                    setTimeout(attemptFetch, 2000 * attempt);
                } else {
                    reject(e);
                }
            });
        };
        attemptFetch();
    });
}

function head(url) {
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const agent = getAgent(url);
        const req = mod.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, timeout: 10000, agent }, (res) => {
            if (res.statusCode === 405 || res.statusCode === 403) {
                return headGetFallback(url).then(resolve);
            }
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
        });
        req.on('error', () => {
            // 网络错误时尝试 GET fallback
            headGetFallback(url).then(resolve);
        });
        req.on('timeout', () => {
            req.destroy();
            // 超时时也尝试 GET fallback
            headGetFallback(url).then(resolve);
        });
        req.end();
    });
}

function headGetFallback(url) {
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const agent = getAgent(url);
        const req = mod.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000,
            agent
        }, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 }));
        });
        req.on('error', () => resolve({ status: 0, ok: false }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false }); });
    });
}

function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
    catch { return { cssVersion: 0, lastRun: null, CSS_PLAN: [], linkHistory: {} }; }
}
function saveState(s) {
    s.lastRun = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ─── 1. 链接检查 ─────────────────────────────────────────────────
async function checkLinks() {
    const links = [
        { label: 'GitHub 个人主页', url: 'https://github.com/zhyx1996' },
        { label: 'GitHub 仓库列表', url: 'https://github.com/zhyx1996?tab=repositories' },
        { label: 'GitHub Stars', url: 'https://github.com/zhyx1996?tab=stars' },
        { label: '博客园主页', url: 'https://www.cnblogs.com/fix-me' },
        { label: '博客园 RSS', url: 'https://www.cnblogs.com/fix-me/rss' },
        { label: '博客园文章 GStreamer', url: 'https://www.cnblogs.com/fix-me/p/19914336' },
        { label: '博客园文章 CARLA', url: 'https://www.cnblogs.com/fix-me/p/19882892' },
        { label: '博客园文章 RTSP/SEI', url: 'https://www.cnblogs.com/fix-me/p/20968815' },
        // { label: '博客园文章 123云盘', url: 'https://www.cnblogs.com/fix-me/p/20194105' }, // 已删除 (404)
        { label: 'Sakana Widget CSS', url: 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.css' },
        { label: 'Sakana Widget JS', url: 'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.js' },
        { label: 'lane2seq 仓库', url: 'https://github.com/zhyx1996/lane2seq' },
        { label: 'pcl-boundary_omp 仓库', url: 'https://github.com/zhyx1996/pcl-boundary_omp' },
        { label: 'cuda_test 仓库', url: 'https://github.com/zhyx1996/cuda_test' },
        { label: 'utils 仓库', url: 'https://github.com/zhyx1996/utils' },
        { label: 'GStreamer-SEI 仓库', url: 'https://github.com/zhyx1996/GStreamer-SEI' },
    ];

    // 并发检查（限制并发数避免被封）
    const CONCURRENCY = 5;
    const results = [];
    for (let i = 0; i < links.length; i += CONCURRENCY) {
        const batch = links.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(async link => {
            const r = await head(link.url);
            process.stdout.write(`  ${r.ok ? '✅' : '❌'} ${link.label} (${r.status})\n`);
            return { ...link, ...r };
        }));
        results.push(...batchResults);
    }
    return results;
}

// ─── 2. API 健康检查 ─────────────────────────────────────────────
async function checkApis() {
    const apis = [
        { label: 'GitHub User API', url: 'https://api.github.com/users/zhyx1996' },
        { label: 'GitHub Repos API', url: 'https://api.github.com/users/zhyx1996/repos?sort=updated&per_page=100' },
        { label: 'GitHub Starred API', url: 'https://api.github.com/users/zhyx1996/starred?sort=updated&per_page=100' },
        { label: 'ER-API 汇率', url: 'https://open.er-api.com/v6/latest/USD' },
        { label: 'CoinGecko BTC', url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cny&include_24hr_change=true', retries: 3, timeout: 12000 },
        { label: 'Gold-API', url: 'https://data-asg.goldprice.org/dbXRates/USD', retries: 2 },
        { label: '博客园 RSS Feed', url: 'https://feed.cnblogs.com/blog/u/836363/rss/' },
    ];

    const results = [];
    for (const api of apis) {
        try {
            const r = await getJSON(api.url, { retries: api.retries || 1, timeout: api.timeout || 8000 });
            let ok = r.status >= 200 && r.status < 400;
            let note = '';
            if (ok) {
                try {
                    const j = JSON.parse(r.data);
                    if (j.result === 'success' || j.login || j.bitcoin || Array.isArray(j)) note = '数据正常';
                    else if (j.gold || j.price || j.rates) note = '数据正常';
                    else if (j.message?.includes('rate limit')) { ok = false; note = '速率限制'; }
                    else note = 'JSON 正常';
                } catch {
                    if (r.data.includes('<feed') || r.data.includes('<rss')) note = 'XML 正常';
                    else note = '非 JSON 响应';
                }
            }
            results.push({ ...api, ok, status: r.status, note });
            process.stdout.write(`  ${ok ? '✅' : '❌'} ${api.label} (${r.status}) ${note}\n`);
        } catch (e) {
            results.push({ ...api, ok: false, status: 0, note: e.message });
            process.stdout.write(`  ❌ ${api.label} — ${e.message}\n`);
        }
    }
    return results;
}

// ─── 3. 更新 GitHub fallback 数据 ────────────────────────────────
async function updateGithubFallback() {
    process.stdout.write('\n📡 拉取 GitHub 数据...\n');
    try {
        const [profileRes, reposRes, starsRes] = await Promise.all([
            getJSON('https://api.github.com/users/zhyx1996'),
            getJSON('https://api.github.com/users/zhyx1996/repos?sort=updated&per_page=100'),
            getJSON('https://api.github.com/users/zhyx1996/starred?sort=updated&per_page=100'),
        ]);

        const profile = (profileRes.status >= 200 && profileRes.status < 400) ? JSON.parse(profileRes.data) : null;
        const repos = (reposRes.status >= 200 && reposRes.status < 400) ? JSON.parse(reposRes.data) : null;
        const stars = (starsRes.status >= 200 && starsRes.status < 400) ? JSON.parse(starsRes.data) : null;

        if (!profile && !repos && !stars) {
            process.stdout.write('  ⚠️ 所有 GitHub API 不可用，跳过\n');
            return false;
        }

        let appjs = fs.readFileSync(APP_JS, 'utf8');
        let changed = false;

        // 更新 profileFallback
        if (profile) {
            const newProfile = {
                name: profile.name || 'zhyx1996',
                login: profile.login,
                bio: profile.bio || '围绕计算机视觉、自动驾驶感知、并行计算与公开写作做持续实践。',
                html_url: profile.html_url,
                avatar_url: profile.avatar_url,
                public_repos: profile.public_repos,
                followers: profile.followers,
                following: profile.following,
                updated_at: profile.updated_at
            };
            appjs = replaceFallback(appjs, 'profileFallback', newProfile);
            changed = true;
            process.stdout.write('  ✅ profileFallback 已更新\n');
        }

        // 更新 repoFallback
        if (repos && Array.isArray(repos)) {
            const publicRepos = repos.filter(r => !r.private).map(r => ({
                name: r.name, html_url: r.html_url, description: r.description,
                language: r.language, stargazers_count: r.stargazers_count,
                forks_count: r.forks_count, updated_at: r.updated_at
            }));
            if (publicRepos.length) {
                appjs = replaceFallback(appjs, 'repoFallback', publicRepos);
                changed = true;
                process.stdout.write(`  ✅ repoFallback 已更新 (${publicRepos.length} 个仓库)\n`);
            }
        }

        // 更新 starredFallback
        if (stars && Array.isArray(stars)) {
            const newStars = stars.map(r => ({
                full_name: r.full_name, html_url: r.html_url, description: r.description,
                language: r.language, stargazers_count: r.stargazers_count, updated_at: r.updated_at
            }));
            appjs = replaceFallback(appjs, 'starredFallback', newStars);
            changed = true;
            process.stdout.write(`  ✅ starredFallback 已更新 (${newStars.length} 个)\n`);
        }

        if (changed) {
            fs.writeFileSync(APP_JS, appjs);
            process.stdout.write('  💾 app.js 已保存\n');
        }
        return changed;
    } catch (e) {
        process.stdout.write(`  ❌ GitHub 更新失败: ${e.message}\n`);
        return false;
    }
}

// 在 app.js 中替换 fallback 对象
function replaceFallback(src, name, obj) {
    const str = JSON.stringify(obj, null, 6).replace(/\n/g, '\n    ');
    // 找到 const xxxFallback = { 开始位置，然后向前扫描找到对应的 };
    const startMark = `const ${name} = {`;
    const startIdx = src.indexOf(startMark);
    if (startIdx === -1) return src;
    // 从 { 之后扫描，深度计数找到匹配的 }
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx + startMark.length - 1; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) { endIdx = i + 1; break; }
        }
    }
    if (endIdx === -1) return src;
    // 确保包含结尾的分号
    if (src[endIdx] === ';') endIdx++;
    return src.slice(0, startIdx) + `const ${name} = ${str};` + src.slice(endIdx);
}

// ─── 4. 更新博客园文章 fallback ──────────────────────────────────
async function updateArticleFallback() {
    process.stdout.write('\n📡 拉取博客园 RSS...\n');
    try {
        const r = await getJSON('https://feed.cnblogs.com/blog/u/836363/rss/');
        if (r.status < 200 || r.status >= 400) { process.stdout.write('  ❌ RSS 不可用\n'); return false; }

        const text = r.data;
        const entries = [...text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);

        const articles = entries.map(entry => {
            const title = (entry.match(/<title type="text">([^<]+)/) || [])[1] || '';
            const link = (entry.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || '';
            const summary = (entry.match(/<summary type="text">([\s\S]*?)<\/summary>/) || [])[1] || '';
            const published = (entry.match(/<published>([^<]+)/) || [])[1] || null;
            const rawSummary = decodeXml(summary).replace(/&[a-z]+;/gi, '').trim();
            return {
                title: decodeXml(title).replace(/ - 扶摇接海$/, ''),
                link: decodeXml(link),
                summary: rawSummary.length > 180 ? rawSummary.slice(0, 180) + '…' : rawSummary,
                published_at: published,
                source: '博客园 · 扶摇接海'
            };
        }).filter(a => a.title && a.link);

        if (!articles.length) { process.stdout.write('  ⚠️ 无文章\n'); return false; }

        // 取前 8 篇（RSS 返回全部随笔，可以适当增加）
        const top = articles.slice(0, 8);
        let appjs = fs.readFileSync(APP_JS, 'utf8');

        // 构建 fallback 条目
        const fallbackEntries = top.map(a => `    {
        title: ${JSON.stringify(a.title)},
        link: ${JSON.stringify(a.link)},
        summary: ${JSON.stringify(a.summary.slice(0, 200))},
        published_at: ${JSON.stringify(a.published_at)},
        source: ${JSON.stringify(a.source)}
    }`);

        // 替换 articleFallback 数组
        const startMark = 'const articleFallback = [';
        const endMark = '];';
        const startIdx = appjs.indexOf(startMark);
        if (startIdx === -1) { process.stdout.write('  ❌ 找不到 articleFallback\n'); return false; }
        const endIdx = appjs.indexOf(endMark, startIdx + startMark.length);
        if (endIdx === -1) { process.stdout.write('  ❌ articleFallback 结尾找不到\n'); return false; }

        const newFallback = `const articleFallback = [\n${fallbackEntries.join(',\n')}\n];`;
        appjs = appjs.slice(0, startIdx) + newFallback + appjs.slice(endIdx + endMark.length);

        fs.writeFileSync(APP_JS, appjs);
        process.stdout.write(`  ✅ articleFallback 已更新 (${top.length} 篇)\n`);
        top.forEach(a => process.stdout.write(`     - ${a.title.slice(0, 40)}\n`));
        return true;
    } catch (e) {
        process.stdout.write(`  ❌ 文章更新失败: ${e.message}\n`);
        return false;
    }
}

function decodeXml(s) {
    // 循环解码直到没有实体为止（处理 &amp;gt; → &gt; > 嵌套情况）
    let prev = '';
    let result = s;
    while (result !== prev) {
        prev = result;
        result = result
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
    }
    return result;
}

// ─── 5. CSS 美化增量改进 ─────────────────────────────────────────
const CSS_IMPROVEMENTS = [
    { v: 1, name: '平滑滚动优化', css: 'html { scroll-behavior: smooth; scroll-padding-top: 80px; }\n' },
    { v: 2, name: '选中文字美化', css: '::selection { background: rgba(11, 101, 216, 0.18); color: #112034; }\n' },
    { v: 3, name: '链接下划线动画', css: 'a { transition: color 0.2s ease, opacity 0.2s ease; }\na:hover { opacity: 0.82; }\n' },
    { v: 4, name: '卡片悬浮微动', css: '.glass-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }\n.glass-card:hover { transform: translateY(-2px); box-shadow: 0 22px 68px rgba(84, 103, 135, 0.22); }\n' },
    { v: 5, name: '按钮波纹反馈', css: '.button { transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease; }\n.button:active { transform: scale(0.97); }\n' },
    { v: 6, name: '暗色滚动条', css: '::-webkit-scrollbar { width: 8px; height: 8px; }\n::-webkit-scrollbar-track { background: rgba(200, 210, 225, 0.3); }\n::-webkit-scrollbar-thumb { background: rgba(11, 101, 216, 0.3); border-radius: 4px; }\n::-webkit-scrollbar-thumb:hover { background: rgba(11, 101, 216, 0.5); }\n' },
    { v: 7, name: '文字渲染优化', css: 'body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }\n' },
    { v: 8, name: '图片懒加载占位', css: 'img { background: rgba(200, 210, 225, 0.25); border-radius: 8px; }\n' },
    { v: 9, name: '导航激活态增强', css: '.nav-links a.active { font-weight: 600; position: relative; }\n.nav-links a.active::after { content: ""; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px; background: var(--primary); border-radius: 1px; }\n' },
    { v: 10, name: '页脚呼吸空间', css: '.footer { padding: 32px 0 40px; opacity: 0.7; font-size: 0.85rem; }\n' },
    { v: 11, name: '标题字重层次', css: 'h1 { letter-spacing: -0.02em; }\nh2 { letter-spacing: -0.01em; }\nh3 { letter-spacing: -0.005em; }\n' },
    { v: 12, name: '代码片段美化', css: 'code { background: rgba(11, 101, 216, 0.06); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }\npre { background: rgba(17, 32, 52, 0.92); color: #e8eef6; padding: 16px 20px; border-radius: 12px; overflow-x: auto; }\n' },
];

function applyCssImprovements() {
    process.stdout.write('\n🎨 CSS 美化检查...\n');
    const state = loadState();
    const current = state.cssVersion || 0;

    const nextImprovements = CSS_IMPROVEMENTS.filter(i => i.v > current);
    if (!nextImprovements.length) {
        process.stdout.write('  ✅ 所有美化项已应用\n');
        return false;
    }

    // 每次只应用 1 项，避免一次性改太多
    const next = nextImprovements[0];
    let css = fs.readFileSync(STYLES_CSS, 'utf8');

    // 检查是否已存在（避免重复）
    if (css.includes(next.css.trim().slice(0, 30))) {
        process.stdout.write(`  ⏭️ v${next.v} ${next.name} 已存在，跳过\n`);
        state.cssVersion = next.v;
        saveState(state);
        return applyCssImprovements(); // 递归检查下一项
    }

    css = css + `\n/* ── maintenance v${next.v}: ${next.name} ── */\n` + next.css;
    fs.writeFileSync(STYLES_CSS, css);

    state.cssVersion = next.v;
    saveState(state);
    process.stdout.write(`  ✅ 已应用 v${next.v}: ${next.name}\n`);
    return true;
}

// ─── 6. 生成报告 ─────────────────────────────────────────────────
async function generateReport(linkResults, apiResults, changes) {
    ensureDir(REPORT_DIR);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const reportFile = path.join(REPORT_DIR, `report-${dateStr}.json`);

    // 读取今日已有报告
    let daily = { date: dateStr, runs: [] };
    try { daily = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch { /* 新文件 */ }

    const run = {
        time: ts(),
        links: { total: linkResults.length, ok: linkResults.filter(l => l.ok).length, failed: linkResults.filter(l => !l.ok).map(l => l.label) },
        apis: { total: apiResults.length, ok: apiResults.filter(a => a.ok).length, failed: apiResults.filter(a => !a.ok).map(a => a.label) },
        changes
    };
    daily.runs.push(run);

    fs.writeFileSync(reportFile, JSON.stringify(daily, null, 2));

    // 保留最近 7 天的报告
    const files = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('report-')).sort();
    while (files.length > 7) {
        fs.unlinkSync(path.join(REPORT_DIR, files.shift()));
    }

    return { reportFile, run };
}

// ─── 主流程 ──────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const doFix = args.includes('--fix');
    const doReport = args.includes('--report');

    process.stdout.write(`\n🔧 zhyx1996.github.io 维护脚本 — ${ts()}\n${'═'.repeat(50)}\n`);

    // 1. 链接检查
    process.stdout.write('\n🔗 检查外部链接...\n');
    const linkResults = await checkLinks();

    // 2. API 检查
    process.stdout.write('\n📡 检查 API 端点...\n');
    const apiResults = await checkApis();

    // 3-5. 修复模式
    const changes = { github: false, articles: false, css: false };
    if (doFix) {
        changes.github = await updateGithubFallback();
        changes.articles = await updateArticleFallback();
        changes.css = applyCssImprovements();
    }

    // 6. 报告
    const { run } = await generateReport(linkResults, apiResults, changes);

    // 摘要
    process.stdout.write(`\n${'═'.repeat(50)}\n`);
    process.stdout.write(`📊 摘要: 链接 ${run.links.ok}/${run.links.total} | API ${run.apis.ok}/${run.apis.total}\n`);
    if (doFix) {
        process.stdout.write(`📝 修复: GitHub=${changes.github ? '✅' : '—'} 文章=${changes.articles ? '✅' : '—'} CSS=${changes.css ? '✅' : '—'}\n`);
    }
    if (run.links.failed.length) process.stdout.write(`❌ 失效链接: ${run.links.failed.join(', ')}\n`);
    if (run.apis.failed.length) process.stdout.write(`❌ 失效 API: ${run.apis.failed.join(', ')}\n`);
    process.stdout.write(`\n`);

    // 如果有严重问题，退出码非0
    if (run.links.failed.length > 5 || run.apis.failed.length > 3) process.exit(1);
}

main().catch(e => { console.error('❌ 致命错误:', e); process.exit(2); });


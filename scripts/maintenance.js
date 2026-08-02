const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SITE_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(__dirname, 'reports');
const STATE_FILE = path.join(__dirname, '.maintenance-state.json');
const APP_JS = path.join(SITE_DIR, 'app.js');
const STYLES_CSS = path.join(SITE_DIR, 'styles.css');
const INDEX_HTML = path.join(SITE_DIR, 'index.html');

// ─── 状态管理 ────────────────────────────────────────────────────
function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
    catch { return { cssVersion: 0, lastRun: null, lastImprovement: null, improvements: [] }; }
}
function saveState(s) {
    s.lastRun = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}
function loadReport() {
    try { return JSON.parse(fs.readFileSync(path.join(REPORT_DIR, `report-${new Date().toISOString().slice(0,10)}.json`), 'utf8')); }
    catch { return null; }
}
function saveReport(r) {
    ensureDir(REPORT_DIR);
    fs.writeFileSync(path.join(REPORT_DIR, `report-${new Date().toISOString().slice(0,10)}.json`), JSON.stringify(r, null, 2));
}
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ─── HTTP 工具 ───────────────────────────────────────────────────
function fetch(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.request(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...opts.headers }, timeout: 10000 }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

// ─── 1. 同步博客园文章 ──────────────────────────────────────────
async function syncArticles() {
    process.stdout.write('\n📡 同步博客园文章...\n');
    try {
        const r = await fetch('https://feed.cnblogs.com/blog/u/836363/rss/');
        if (r.status < 200 || r.status >= 400) { process.stdout.write('  ❌ RSS 不可用\n'); return false; }

        const text = r.data;
        const entries = [...text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]);

        const articles = entries.map(entry => {
            const title = (entry.match(/<title type="text">([^<]+)/) || [])[1] || '';
            const link = (entry.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || '';
            const summary = (entry.match(/<summary type="text">([\s\S]*?)<\/summary>/) || [])[1] || '';
            const published = (entry.match(/<published>([^<]+)/) || [])[1] || null;
            return {
                title: decodeXml(title).replace(/ - 扶摇接海$/, ''),
                link: decodeXml(link),
                summary: decodeXml(summary).replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)).replace(/&[a-z]+;/gi, ''),
                published_at: published,
                source: '博客园 · 扶摇接海'
            };
        }).filter(a => a.title && a.link);

        if (!articles.length) { process.stdout.write('  ⚠️ 无文章\n'); return false; }

        const top = articles.slice(0, 8);
        let appjs = fs.readFileSync(APP_JS, 'utf8');

        const fallbackEntries = top.map(a => `    {
        title: ${JSON.stringify(a.title)},
        link: ${JSON.stringify(a.link)},
        summary: ${JSON.stringify(a.summary.slice(0, 200))},
        published_at: ${JSON.stringify(a.published_at)},
        source: ${JSON.stringify(a.source)}
    }`);

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
        process.stdout.write(`  ❌ 文章同步失败: ${e.message}\n`);
        return false;
    }
}

function decodeXml(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
}

// ─── 2. 迭代改进任务 ────────────────────────────────────────────
const IMPROVEMENT_TASKS = [
    {
        name: '同步 RSS 文章数据',
        description: '从博客园 RSS 同步最新文章到 articleFallback',
        apply: () => { /* 由 syncArticles 处理 */ return false; }
    },
    {
        name: '校验 HTML 结构完整性',
        description: '检查所有页面是否包含必要的 skip-link、nav、main、footer',
        apply: () => {
            const pages = ['index.html', 'projects.html', 'stars.html', 'articles.html', 'nethack.html'];
            let issues = [];
            for (const page of pages) {
                const html = fs.readFileSync(path.join(SITE_DIR, page), 'utf8');
                if (!html.includes('skip-link')) issues.push(`${page}: 缺少 skip-link`);
                if (!html.includes('sidebar-nav')) issues.push(`${page}: 缺少 sidebar-nav`);
                if (!html.includes('main-content')) issues.push(`${page}: 缺少 main-content`);
                if (!html.includes('</footer>')) issues.push(`${page}: 缺少 footer`);
            }
            if (issues.length) {
                process.stdout.write('  ⚠️ 结构问题:\n' + issues.map(i => '     ' + i).join('\n') + '\n');
            }
            return false;
        }
    },
    {
        name: '校验外部资源可达性',
        description: '检查 CDN 资源和 API 端点是否可访问',
        apply: async () => {
            const targets = [
                'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.js',
                'https://cdn.jsdelivr.net/npm/sakana-widget@2.7.1/lib/sakana.min.css',
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600',
            ];
            for (const url of targets) {
                try {
                    const r = await fetch(url);
                    process.stdout.write(`  ${r.status < 400 ? '✅' : '❌'} ${url} (${r.status})\n`);
                } catch (e) {
                    process.stdout.write(`  ❌ ${url} (${e.message})\n`);
                }
            }
            return false;
        }
    },
    {
        name: '校验 JavaScript 语法',
        description: '运行 node --check 检查所有脚本',
        apply: () => {
            const { execSync } = require('child_process');
            try {
                execSync(`node --check "${APP_JS}"`, { stdio: 'ignore' });
                execSync(`node --check "${path.join(SITE_DIR, 'public/pretext-effect.js')}"`, { stdio: 'ignore' });
                process.stdout.write('  ✅ JS 语法校验通过\n');
            } catch (e) {
                process.stdout.write(`  ❌ JS 语法错误: ${e.message}\n`);
            }
            return false;
        }
    },
    {
        name: '生成站点报告',
        description: '输出当前站点状态摘要',
        apply: () => {
            const report = {
                timestamp: new Date().toISOString(),
                pages: {},
                totalSize: 0,
                cssVersion: null
            };
            const pages = ['index.html', 'projects.html', 'stars.html', 'articles.html', 'nethack.html'];
            for (const page of pages) {
                const filePath = path.join(SITE_DIR, page);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    report.pages[page] = { size: stats.size, modified: stats.mtime.toISOString() };
                    report.totalSize += stats.size;
                }
            }
            const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
            const cssVerMatch = indexHtml.match(/styles\.css\?v=(\d+)/);
            if (cssVerMatch) report.cssVersion = cssVerMatch[1];
            saveReport(report);
            process.stdout.write(`  ✅ 报告已生成 (${Object.keys(report.pages).length} 页面, ${(report.totalSize / 1024).toFixed(1)} KB 总计)\n`);
            return false;
        }
    }
];

function pickTask(state) {
    // 找到上次做的任务，选下一个
    const done = state.improvements || [];
    const available = IMPROVEMENT_TASKS.filter(t => !done.includes(t.name));
    if (!available.length) {
        // 全部做过了，重置
        state.improvements = [];
        return IMPROVEMENT_TASKS[0];
    }
    return available[0];
}

async function runImprovement() {
    const state = loadState();
    const task = pickTask(state);

    process.stdout.write(`\n🔧 迭代改进: ${task.name}\n`);
    process.stdout.write(`   ${task.description}\n`);

    try {
        const changed = await task.apply();
        if (changed) {
            state.improvements = state.improvements || [];
            state.improvements.push(task.name);
            state.lastImprovement = task.name;
            saveState(state);
            process.stdout.write(`   ✅ 已应用\n`);
            return true;
        } else {
            process.stdout.write(`   ⏭️ 已存在或无需修改\n`);
            state.improvements = state.improvements || [];
            state.improvements.push(task.name);
            saveState(state);
            return false;
        }
    } catch (e) {
        process.stdout.write(`   ❌ 失败: ${e.message}\n`);
        return false;
    }
}

// ─── 主流程 ──────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--improve';

    process.stdout.write(`🔧 zhyx1996.github.io 维护脚本 — ${ts()}\n`);
    process.stdout.write('═'.repeat(52) + '\n');

    const autoCommitEnabled = args.includes('--commit');

    if (!autoCommitEnabled) {
        process.stdout.write('⚠️  安全模式：不自动 commit/push（传入 --commit 启用）\n');
    }

    if (mode === '--sync') {
        await syncArticles();
    } else if (mode === '--improve') {
        await runImprovement();
    } else if (mode === '--fix') {
        await syncArticles();
        await runImprovement();
    } else {
        process.stdout.write('用法: node maintenance.js [--sync|--improve|--fix] [--commit]\n');
        process.stdout.write('  --commit  显式启用自动 commit + push（默认禁用）\n');
        return;
    }

    if (autoCommitEnabled) {
        await autoCommit();
    } else {
        process.stdout.write('\n📦 跳过提交（使用 --commit 启用）\n');
    }

    process.stdout.write('\n' + '═'.repeat(52) + '\n');
    process.stdout.write(`📊 完成于 ${ts()}\n`);
}

async function autoCommit() {
    const { execSync } = require('child_process');
    try {
        try {
            execSync('git config http.proxy http://127.0.0.1:18808', { cwd: SITE_DIR, stdio: 'ignore' });
            execSync('git config https.proxy http://127.0.0.1:18808', { cwd: SITE_DIR, stdio: 'ignore' });
        } catch { /* proxy 配置可选 */ }
        const status = execSync('git status --porcelain', { cwd: SITE_DIR, encoding: 'utf8' }).trim();
        if (!status) { process.stdout.write('\n📦 无变更需提交\n'); return; }
        execSync('git add -A', { cwd: SITE_DIR, stdio: 'ignore' });
        const msg = `auto: ${loadState().lastImprovement || '迭代优化'}`;
        execSync(`git commit -m "${msg}"`, { cwd: SITE_DIR, stdio: 'ignore' });
        try {
            execSync('git push origin main', { cwd: SITE_DIR, stdio: 'ignore' });
            process.stdout.write(`\n📦 已提交并推送: ${msg}\n`);
        } catch (pushErr) {
            process.stdout.write(`\n📦 已提交（推送失败，可稍后手动 push）: ${msg}\n`);
        }
    } catch (e) {
        process.stdout.write(`\n⚠️ 提交失败: ${e.message}\n`);
    }
}

main().catch(e => { process.stderr.write(`❌ ${e.message}\n`); process.exit(1); });

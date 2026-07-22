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
        name: '优化 CSS 间距',
        description: '调整 section 间距和卡片内边距',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            let changed = false;
            // 增加 section 间距
            if (css.includes('margin-bottom: 2.5rem')) {
                css = css.replace('margin-bottom: 2.5rem;', 'margin-bottom: 3rem;');
                changed = true;
            }
            // 增加卡片内边距
            if (css.includes('padding: 1.3rem;') && !css.includes('padding: 1.5rem;')) {
                css = css.replace(/padding: 1\.3rem;/g, 'padding: 1.5rem;');
                changed = true;
            }
            if (changed) fs.writeFileSync(STYLES_CSS, css);
            return changed;
        }
    },
    {
        name: '添加平滑滚动',
        description: '为锚点链接添加平滑滚动效果',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('scroll-behavior: smooth')) return false;
            css = css.replace('html { scroll-behavior: smooth; }', 'html { scroll-behavior: smooth; }\nhtml { scroll-padding-top: 80px; }');
            // 简化：直接添加 scroll-padding-top
            if (!css.includes('scroll-padding-top')) {
                css = css.replace('html { scroll-behavior: smooth; }', 'html { scroll-behavior: smooth; scroll-padding-top: 80px; }');
            }
            fs.writeFileSync(STYLES_CSS, css);
            return true;
        }
    },
    {
        name: '优化字体加载',
        description: '添加 font-display: swap 到所有字体',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('font-display: swap')) return false;
            // 已经通过 @font-face 设置了 font-display: swap
            return false;
        }
    },
    {
        name: '添加卡片悬停动画',
        description: '增强卡片悬停效果',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('transition: all 0.3s')) return false;
            css = css.replace(
                '.card {',
                '.card {\n    transition: all 0.3s ease;'
            );
            fs.writeFileSync(STYLES_CSS, css);
            return true;
        }
    },
    {
        name: '优化按钮样式',
        description: '添加按钮点击反馈',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('.button:active')) return false;
            css += `\n.button:active { transform: scale(0.97); }\n`;
            fs.writeFileSync(STYLES_CSS, css);
            return true;
        }
    },
    {
        name: '添加暗色滚动条',
        description: '自定义滚动条样式匹配暗色主题',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('::-webkit-scrollbar')) return false;
            css += `\n::-webkit-scrollbar { width: 8px; }\n::-webkit-scrollbar-track { background: var(--void); }\n::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }\n::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }\n`;
            fs.writeFileSync(STYLES_CSS, css);
            return true;
        }
    },
    {
        name: '优化图片加载',
        description: '为图片添加 loading="lazy"',
        apply: () => {
            let html = fs.readFileSync(INDEX_HTML, 'utf8');
            if (html.includes('loading="lazy"')) return false;
            html = html.replace(/<img([^>]+)>/g, (match) => {
                if (match.includes('loading=')) return match;
                return match.replace('<img', '<img loading="lazy"');
            });
            fs.writeFileSync(INDEX_HTML, html);
            return true;
        }
    },
    {
        name: '添加回到顶部按钮',
        description: '添加滚动到顶部按钮',
        apply: () => {
            let html = fs.readFileSync(INDEX_HTML, 'utf8');
            if (html.includes('#back-to-top')) return false;
            html = html.replace('</body>', '<button id="back-to-top" aria-label="回到顶部">↑</button>\n</body>');
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (!css.includes('#back-to-top')) {
                css += `\n#back-to-top {\n    position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px;\n    border-radius: 50%; background: var(--lane); color: var(--void); border: none;\n    font-size: 1.2rem; cursor: pointer; opacity: 0; transition: opacity 0.3s;\n    z-index: 100; box-shadow: var(--glow-lane);\n}\n#back-to-top.visible { opacity: 1; }\n`;
                fs.writeFileSync(STYLES_CSS, css);
            }
            // 添加 JS
            let appjs = fs.readFileSync(APP_JS, 'utf8');
            if (!appjs.includes('back-to-top')) {
                appjs += `\n// 回到顶部\nconst backTop = document.getElementById('back-to-top');\nif (backTop) {\n    window.addEventListener('scroll', () => backTop.classList.toggle('visible', window.scrollY > 300));\n    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));\n}\n`;
                fs.writeFileSync(APP_JS, appjs);
            }
            return true;
        }
    },
    {
        name: '优化 Pretext 文字流',
        description: '调整 Pretext 文字行高和颜色',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('pretext-line:hover')) return false;
            css = css.replace(
                '.pretext-line {',
                '.pretext-line { cursor: default; transition: color 0.2s;'
            );
            if (!css.includes('.pretext-line:hover')) {
                css += `\n.pretext-line:hover { color: var(--lane) !important; }\n`;
            }
            fs.writeFileSync(STYLES_CSS, css);
            return true;
        }
    },
    {
        name: '添加页面加载动画',
        description: '添加淡入效果',
        apply: () => {
            let css = fs.readFileSync(STYLES_CSS, 'utf8');
            if (css.includes('@keyframes fadeIn')) return false;
            css += `\n@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }\n.section { animation: fadeIn 0.5s ease-out; }\n`;
            fs.writeFileSync(STYLES_CSS, css);
            return true;
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
        const changed = task.apply();
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

    if (mode === '--sync') {
        await syncArticles();
    } else if (mode === '--improve') {
        await runImprovement();
    } else if (mode === '--fix') {
        await syncArticles();
        await runImprovement();
    } else {
        process.stdout.write('用法: node maintenance.js [--sync|--improve|--fix]\n');
        return;
    }

    // 自动提交并推送
    await autoCommit();

    process.stdout.write('\n' + '═'.repeat(52) + '\n');
    process.stdout.write(`📊 完成于 ${ts()}\n`);
}

async function autoCommit() {
    const { execSync } = require('child_process');
    try {
        execSync('git config http.proxy http://127.0.0.1:18808', { cwd: SITE_DIR, stdio: 'ignore' });
        execSync('git config https.proxy http://127.0.0.1:18808', { cwd: SITE_DIR, stdio: 'ignore' });
        const status = execSync('git status --porcelain', { cwd: SITE_DIR, encoding: 'utf8' }).trim();
        if (!status) { process.stdout.write('\n📦 无变更需提交\n'); return; }
        execSync('git add -A', { cwd: SITE_DIR, stdio: 'ignore' });
        const msg = `auto: ${loadState().lastImprovement || '迭代优化'}`;
        execSync(`git commit -m "${msg}"`, { cwd: SITE_DIR, stdio: 'ignore' });
        execSync('git push origin main', { cwd: SITE_DIR, stdio: 'ignore' });
        process.stdout.write(`\n📦 已提交并推送: ${msg}\n`);
    } catch (e) {
        process.stdout.write(`\n⚠️ 提交失败: ${e.message}\n`);
    }
}

main().catch(e => { process.stderr.write(`❌ ${e.message}\n`); process.exit(1); });

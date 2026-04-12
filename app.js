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

window.addEventListener('DOMContentLoaded', hydrateGithubData);

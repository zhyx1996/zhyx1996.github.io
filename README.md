[English Version](README_en.md)

# zhyx1996.github.io

基于 GitHub Pages 的个人主页，AI 辅助构建。

## 页面

- `index.html` 主页（个人简介 / 文章 / Steam / 石蒜模拟器）
- `projects.html` 仓库 · `stars.html` Star · `articles.html` 博客
- `gomoku.html` 五子棋（Rapfi AI，WASM 多线程）
- `gomoku-godot/` 五子棋 Godot 版
- `nethack.html` NetHack

## 技术

原生 HTML / CSS / JS，无构建；GitHub API 集成；响应式布局。

## 本地预览

```bash
python -m http.server 8000
```

访问 `http://localhost:8000`。

## 部署

提交到 `main` 分支后由 GitHub Pages 自动发布。

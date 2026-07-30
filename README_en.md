# zhyx1996.github.io

Personal homepage based on GitHub Pages, showcasing personal introduction, public repositories, starred projects, blog posts, and some embedded public information examples.

Designed and built with AI assistance.

## Page Structure

| File | Description |
|------|-------------|
| `index.html` | Homepage: personal direction, recent focus, article summaries, Steam games, Schizosa Simulator |
| `projects.html` | Public repository showcase |
| `stars.html` | GitHub Stars showcase |
| `articles.html` | CNBlog articles showcase |
| `app.js` | Data rendering & interaction logic (API integration, animations, drag) |
| `styles.css` | Site-wide styles (with responsive breakpoints) |
| `public/pretext-effect.js` | Floating ball animation engine |

## Technical Features

- Pure HTML / CSS / JavaScript, no build tools
- Sakana Widget (Schizosa Simulator) integration, supports mouse/touch drag
- Floating ball bounce animation with boundary constraints and drag
- GitHub API integration (repositories, Stars, profile info)
- Steam game library display
- CNBlog article aggregation
- Responsive layout (desktop / tablet / mobile)

## Local Preview

```bash
python -m http.server 8000
```

Visit `http://localhost:8000`. Using a local static server is recommended to avoid inconsistent resource paths and network request behavior.

## Validation

```bash
node --check app.js
```

## Deployment

Auto-published by GitHub Pages after pushing to the `main` branch.

## Maintenance

- Follow existing navigation and visual style when adding new pages
- Preserve fallback data and exception handling when modifying data fetching logic in `app.js`
- Sync-check button links and copy on corresponding pages when external entries are updated
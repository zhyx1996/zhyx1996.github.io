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

## Sakana Debug Diagnostic Mode

When the Sakana (Schizosa Simulator) drag behavior misbehaves, use the built-in diagnostic mode to capture structured event logs — no code changes needed. Disabled by default; when disabled, no logs are produced and physics behavior is untouched.

Enable (either way):

- URL parameter: visit `http://localhost:8000/?sakana-debug=1`
- localStorage: run `localStorage.setItem('sakana-debug', '1')` in the console, then reload (URL parameter takes precedence when present; `?sakana-debug=0` forces it off)

While enabled, the browser console prints `[Sakana]`-prefixed `console.debug` logs (pointerdown / throttled pointermove samples / setPointerCapture / finish reasons / pre- and post-release velocities / character initial state / collisions / animation stops), and every event is also written into the `window.__sakanaDebug.events` ring buffer (max 500 entries, oldest overwritten).

Read the logs:

```js
window.__sakanaDebug.getEvents()   // all events (chronological copy, JSON-serializable)
window.__sakanaDebug.clear()       // clear the buffer
window.__sakanaDebug.getState()    // current widget rect/className, sakana._running and _state
window.__sakanaDebug.enabled       // whether debug is on (can also be toggled at runtime)
```

Turn off: `localStorage.removeItem('sakana-debug')`, remove the URL parameter, and reload.

## Deployment

Auto-published by GitHub Pages after pushing to the `main` branch.

## Maintenance

- Follow existing navigation and visual style when adding new pages
- Preserve fallback data and exception handling when modifying data fetching logic in `app.js`
- Sync-check button links and copy on corresponding pages when external entries are updated
# API 集成模式

个人网站中外部 API 的统一调用模式：CORS 代理、超时控制、优雅降级、XSS 防护。

## 核心模式

### 1. Fetch with Timeout

```javascript
function fetchWithTimeout(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(url)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}
```

- 默认超时 8 秒，Steam 资料用 15 秒
- 无论成功失败都清理 timer，防止内存泄漏

### 2. CORS 代理

```javascript
const PROXY = 'https://corsproxy.io/?';

// 需要代理的 API（服务器未返回 CORS 头）
fetchWithTimeout(PROXY + encodeURIComponent('https://api.gold-api.com/price/XAU'))

// 不需要代理的 API（服务器允许跨域）
fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/USD')
```

| API | 需要代理 | 原因 |
|-----|---------|------|
| Exchange Rate API | ❌ | 自带 CORS 头 |
| CoinGecko | ❌ | 自带 CORS 头 |
| Gold API | ✅ | 无 CORS 头 |
| Steam Community | ✅ | 无 CORS 头 |

### 3. 优雅降级

每个 fetch 函数返回 `null` 而非 throw：

```javascript
const fetchRates = async () => {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    return (await res.json()).rates || null;
  } catch { return null; }
};
```

UI 层根据 null 显示降级内容：

```javascript
if (parts.length === 0) {
  container.innerHTML = '<div class="market-card">数据暂不可用</div>';
}
```

### 4. 并行请求

```javascript
const [rates, btcPrice, goldPrice] = await Promise.all([
  fetchRates(),
  fetchBtc(),
  fetchGold(),
]);
renderMarket(rates, btcPrice, goldPrice);
```

各请求独立，部分失败不影响其他数据显示。

### 5. XSS 防护

```javascript
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
```

所有动态数据插入 DOM 前必须经过 `escapeHtml`。

## API 端点详情

### 汇率 API

```
GET https://api.exchangerate-api.com/v4/latest/USD
```

```json
{ "rates": { "CNY": 7.24, "SGD": 1.34, "JPY": 154.2, "EUR": 0.92 } }
```

### CoinGecko（比特币价格）

```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
```

```json
{ "bitcoin": { "usd": 67234.50 } }
```

### 黄金价格

```
GET https://api.gold-api.com/price/XAU
```

```json
{ "price": 2345.67 }
// 或数组格式：[{ "price": 2345.67 }]
```

### Steam 资料（HTML 抓取）

```
GET https://steamcommunity.com/profiles/{STEAM_ID64}/
```

通过正则从 HTML 中提取数据（无需 API Key）：

```javascript
const avatarMatch = html.match(/avatars\.cloudflare\.steamstatic\.com\/([a-f0-9]+)_full\.jpg/);
const nameMatch = html.match(/actual_persona_name">([^<]+)</);
const levelMatch = html.match(/friendPlayerLevelNum[^>]*>(\d+)</);

// 游戏列表
const names = [...html.matchAll(/class="game_name"><a[^>]*>([^<]+)<\/a>/g)];
const hours = [...html.matchAll(/总时数 ([\d.]+) 小时/g)];
const covers = [...html.matchAll(/game_capsule" src="([^"]+)"/g)];
```

## 渲染管线

```
fetchRates()  → rates {CNY, SGD, JPY, EUR}
fetchBtc()    → btcPrice number
fetchGold()   → goldPrice number
       ↓
buildForexFacts(rates)   → [{label, value, note}, ...]
buildCryptoFacts(btc)   → [{label, value, note}]
buildGoldFacts(gold)    → [{label, value, note}]
       ↓
renderMarketFacts(parts) → HTML template string
       ↓
container.innerHTML = ...
```

## 重试机制

手动重试（用户点击触发），无自动指数退避：

```javascript
if (parts.length === 0) {
  container.innerHTML = `<a href="#" id="market-retry">点击重试 ↻</a>`;
  document.getElementById('market-retry').addEventListener('click', loadMarket);
}
```

## 设计决策

| 决策 | 原因 |
|------|------|
| 不用 API Key | 降低维护成本，避免泄露 |
| 正则抓取 Steam | 无需 Steam Web API Key |
| 手动重试 | 简单够用，避免后台轮询 |
| 部分渲染 | 一个 API 失败不影响其他数据 |
| 8 秒超时 | 平衡用户体验和加载速度 |

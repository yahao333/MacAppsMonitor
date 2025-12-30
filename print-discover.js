const DISCOVER_URL = 'https://apps.apple.com/us/mac/discover';
const LOOKUP_BASE = 'https://itunes.apple.com/lookup';
const APPLE_BASE = 'https://apps.apple.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const startedAt = Date.now();
    try {
      console.log(`[网络] 请求: url=${url} attempt=${attempt}/${retries}`);
      const res = await fetch(url, options);
      const elapsedMs = Date.now() - startedAt;
      console.log(`[网络] 响应: status=${res.status} ok=${res.ok} elapsedMs=${elapsedMs} url=${url}`);

      if (res.ok) return res;

      if ([403, 408, 425, 429, 500, 502, 503, 504].includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      lastError = e;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[网络] 请求失败，准备重试: attempt=${attempt}/${retries} delayMs=${delayMs} error=${e?.message || String(e)}`);
      await sleep(delayMs);
    }
  }
  throw lastError || new Error('请求失败');
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? String(m[1]).replace(/\s+/g, ' ').trim() : '';
}

function decodeHtmlEntities(input) {
  const s = String(input ?? '');
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function clipDebug(input, maxLen = 200) {
  const s = String(input ?? '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...(+${s.length - maxLen})`;
}

function normalizeAppleUrl(href) {
  const raw = decodeHtmlEntities(String(href ?? '')).trim();
  if (!raw) return '';
  const normalized = raw
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003F/gi, '?')
    .replace(/\\u003D/gi, '=');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('//')) return `https:${normalized}`;
  if (normalized.startsWith('/')) return `${APPLE_BASE}${normalized}`;
  return normalized;
}

function findHrefByLabelFromAnchors(html, targetLabel) {
  const label = String(targetLabel ?? '').toLowerCase();
  const anchorRe = /<a\b[^>]*>/gi;
  const attrRe = /(\w[\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  let m;
  let matchedCount = 0;
  while ((m = anchorRe.exec(html)) !== null) {
    const tag = m[0];
    const attrs = {};
    let am;
    while ((am = attrRe.exec(tag)) !== null) {
      const key = String(am[1]).toLowerCase();
      const value = am[2] ?? am[3] ?? am[4] ?? '';
      attrs[key] = value;
    }

    const candidates = [
      attrs['aria-label'],
      attrs['data-analytics-title'],
      attrs['title'],
      attrs['data-test'],
      attrs['data-analytics-label']
    ].filter(Boolean).map(v => decodeHtmlEntities(v).toLowerCase());

    const matched = candidates.some(v => v.includes(label));
    if (!matched) continue;

    matchedCount += 1;
    const rawHref = attrs['href'] || '';
    const href = normalizeAppleUrl(rawHref);
    console.log(
      `[Discover] Anchor 命中: label=${targetLabel} matched=${matchedCount} rawHref=${clipDebug(rawHref, 260)} normalizedHref=${clipDebug(
        href,
        260
      )} candidates=${clipDebug(candidates.join(' | '), 300)} tag=${clipDebug(tag, 320)}`
    );
    if (href) {
      console.log(`[Discover] Anchor 选定链接: label=${targetLabel} href=${href}`);
      return href;
    }

    if (matchedCount >= 10) {
      console.warn(`[Discover] Anchor 命中数量过多，停止继续扫描: label=${targetLabel} matched=${matchedCount}`);
      break;
    }
  }
  console.warn(`[Discover] Anchor 未找到可用 href: label=${targetLabel} matched=${matchedCount}`);
  return '';
}

function findHrefByLabelFromJsonSnippets(html, targetLabel) {
  const label = String(targetLabel ?? '');
  const idx = html.indexOf(label);
  if (idx < 0) return '';

  const window = html.slice(Math.max(0, idx - 800), Math.min(html.length, idx + 1200));
  console.log(`[Discover] JSON 窗口命中: label=${label} idx=${idx} windowLength=${window.length} snippet=${clipDebug(window.replace(/\s+/g, ' '), 280)}`);
  const patterns = [
    /"label"\s*:\s*"Top Paid Apps"[\s\S]{0,400}?"href"\s*:\s*"([^"]+)"/i,
    /"label"\s*:\s*"Top Paid Apps"[\s\S]{0,400}?"url"\s*:\s*"([^"]+)"/i,
    /Top Paid Apps[\s\S]{0,400}?href="([^"]+)"/i
  ];

  for (const re of patterns) {
    const m = window.match(re);
    if (m && m[1]) {
      const extracted = String(m[1]);
      const normalized = normalizeAppleUrl(extracted);
      console.log(`[Discover] JSON 提取成功: extracted=${clipDebug(extracted, 260)} normalized=${clipDebug(normalized, 260)} re=${re}`);
      return normalized;
    }
  }
  console.warn(`[Discover] JSON 窗口未提取到 href: label=${label} patterns=${patterns.length}`);
  return '';
}

function findTopPaidAppsHref(html) {
  const label = 'Top Paid Apps';
  const fromAnchors = findHrefByLabelFromAnchors(html, label);
  if (fromAnchors) return fromAnchors;
  return findHrefByLabelFromJsonSnippets(html, label);
}

function extractAppIds(html, countryCode = 'us') {
  const ids = [];
  const seen = new Set();
  const re = new RegExp(`https?:\\\\/\\\\/apps\\\\.apple\\\\.com\\\\/${countryCode}\\\\/app\\\\/[^"\\s>]*?id(\\\\d+)`, 'gi');
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  if (ids.length === 0) {
    const re2 = /href="([^"]+)"/gi;
    while ((m = re2.exec(html)) !== null) {
      const href = m[1] || '';
      if (!href.includes('/app/')) continue;
      const idm = href.match(/id(\d+)/);
      if (!idm) continue;
      const id = idm[1];
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  return ids;
}

function pickKeyFieldsFromLookupResult(result) {
  return {
    id: String(result.trackId ?? ''),
    name: result.trackName ?? '',
    developer: result.sellerName ?? '',
    price: typeof result.price === 'number' && result.price === 0 ? 'Free' : (result.formattedPrice ?? ''),
    category: result.primaryGenreName ?? '',
    rating: typeof result.averageUserRating === 'number' ? result.averageUserRating : null,
    ratingCount: typeof result.userRatingCount === 'number' ? result.userRatingCount : null,
    version: result.version ?? '',
    updatedAt: result.currentVersionReleaseDate ?? '',
    appUrl: result.trackViewUrl ?? ''
  };
}

async function fetchAppDetailById(appId, countryCode = 'us') {
  const url = `${LOOKUP_BASE}?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(countryCode)}&entity=macSoftware`;
  const res = await fetchWithRetry(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const json = await res.json();
  const result = Array.isArray(json?.results) && json.results.length > 0 ? json.results[0] : null;
  if (!result) return null;
  return pickKeyFieldsFromLookupResult(result);
}

async function main() {
  const limitArg = process.argv.slice(2).find(v => v && v !== '--');
  const limit = Number(limitArg || 20);

  console.log(`[Discover] 开始抓取: url=${DISCOVER_URL}`);
  const pageRes = await fetchWithRetry(DISCOVER_URL, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await pageRes.text();
  const mentions = (html.match(/Top Paid Apps/g) || []).length;
  console.log(`[Discover] 页面 HTML 信息: length=${html.length} mentions(Top Paid Apps)=${mentions}`);

  const discoverTitle = extractTitle(html);
  console.log(`[Discover] 页面标题: ${discoverTitle || '(empty)'}`);

  const topPaidHref = findTopPaidAppsHref(html);
  if (!topPaidHref) {
    console.warn('[Discover] 未找到 label 包含 "Top Paid Apps" 的链接');
    console.log(JSON.stringify({ discoverUrl: DISCOVER_URL, discoverTitle, topPaidHref: '' }, null, 2));
    return;
  }

  console.log(`[Discover] Top Paid Apps 链接: ${topPaidHref}`);

  console.log(`[TopPaid] 开始抓取: url=${topPaidHref}`);
  const topPaidRes = await fetchWithRetry(topPaidHref, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const topPaidHtml = await topPaidRes.text();
  const topPaidTitle = extractTitle(topPaidHtml);

  const ids = extractAppIds(topPaidHtml, 'us');
  const pickedIds = ids.slice(0, Math.max(0, limit));

  console.log(`[TopPaid] 页面标题: ${topPaidTitle || '(empty)'}`);
  console.log(`[TopPaid] 解析到应用ID数量: total=${ids.length} picked=${pickedIds.length}`);

  const apps = [];
  for (let i = 0; i < pickedIds.length; i++) {
    const id = pickedIds[i];
    try {
      console.log(`[TopPaid] 获取详情: ${i + 1}/${pickedIds.length} id=${id}`);
      const detail = await fetchAppDetailById(id, 'us');
      if (detail) apps.push({ rank: i + 1, ...detail });
      else console.warn(`[TopPaid] 未获取到详情: id=${id}`);
    } catch (e) {
      console.warn(`[TopPaid] 获取详情失败: id=${id} error=${e?.message || String(e)}`);
    }
  }

  console.log(`[TopPaid] 获取完成: success=${apps.length}/${pickedIds.length}`);
  console.log(JSON.stringify({
    discoverUrl: DISCOVER_URL,
    discoverTitle,
    topPaidLabel: 'Top Paid Apps',
    topPaidHref,
    topPaidPage: {
      url: topPaidHref,
      title: topPaidTitle,
      totalIds: ids.length,
      items: apps
    }
  }, null, 2));
}

main().catch(err => {
  console.error('[Discover] 运行失败:', err?.message || err);
  process.exitCode = 1;
});

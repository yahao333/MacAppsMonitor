import { CategoryType, AppData, AppDetail, LookupResponse } from '../types';
import { API_BASE_LOOKUP } from '../constants';

// ==========================================
// 核心配置与常量定义
// ==========================================

// 代理服务列表
// 原因: 浏览器的同源策略 (CORS) 限制了前端直接访问 Apple RSS API。
// 解决方案: 我们使用免费的 CORS 代理服务作为中间人转发请求。
const PROXY_LIST = [
  'https://api.allorigins.win/get?disableCache=true&url=',      // AllOrigins: 返回 JSON 格式，内容在 contents 字段
  'https://corsproxy.io/?',                   // CORSProxy: 直接透传响应
  'https://thingproxy.freeboard.io/fetch/'    // ThingProxy: 备用代理
];

// 缓存配置
// 作用: 将 API 响应存储在 localStorage 中，减少网络请求，提升加载速度。
const CACHE_KEY_PREFIX = 'app_store_data_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 缓存有效期: 5分钟

// 类别映射表
// 作用: 将前端使用的友好分类名 (如 'top-free') 转换为 Apple RSS API 需要的路径参数 (如 'topfreemacapps')。
// 注意: Mac App Store 的 RSS 接口与 iOS 不同，部分榜单 (如 new-apps) 不可用，需要回退到通用榜单。
const CATEGORY_MAP: Record<string, string> = {
  'top-free': 'topfreemacapps',       // 免费榜
  'top-paid': 'toppaidmacapps',       // 付费榜
  'top-grossing': 'topgrossingmacapps', // 畅销榜
  
  // 以下榜单 Mac App Store API 不支持，做回退处理
  'new-apps': 'topmacapps',           // 最新上架 -> 总榜
  'new-free': 'topfreemacapps',       // 最新免费 -> 免费榜
  'new-paid': 'toppaidmacapps',       // 最新付费 -> 付费榜
  'top-free-games': 'topfreemacapps', // 免费游戏 -> 免费榜 (通过 genre 过滤)
  'top-paid-games': 'toppaidmacapps'  // 付费游戏 -> 付费榜 (通过 genre 过滤)
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// ==========================================
// 网络请求核心工具
// ==========================================

function useDevProxyIfWeb(url: string): string {
  const isDev = Boolean((import.meta as any)?.env?.DEV);
  if (!isDev) return url;
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  const isWeb =
    typeof g.window !== 'undefined' ||
    typeof g.document !== 'undefined' ||
    (typeof g.navigator !== 'undefined' && typeof g.location !== 'undefined');
  if (!isWeb) return url;
  if (url.startsWith('https://apps.apple.com/')) {
    const path = url.replace('https://apps.apple.com/', '');
    return `/proxy/apps/${path}`;
  }
  if (url.startsWith('https://itunes.apple.com/')) {
    const path = url.replace('https://itunes.apple.com/', '');
    return `/proxy/itunes/${path}`;
  }
  return url;
}

function buildProxyUrl(proxyBase: string, url: string): string {
  if (proxyBase.includes('thingproxy.freeboard.io/fetch/')) {
    return `${proxyBase}${url}`;
  }
  return `${proxyBase}${encodeURIComponent(url)}`;
}

/**
 * 智能 Fetch 函数
 * 功能: 封装了网络请求逻辑，包含自动重试、代理切换和错误处理。
 * 策略: 
 * 1. 先尝试直接请求 (Direct Fetch)。
 * 2. 如果失败，依次尝试代理列表中的代理服务。
 * 
 * @param url 目标 URL
 * @param retries 重试次数 (虽然参数存在，但主要逻辑由代理轮询控制)
 */
async function smartFetch(url: string, retries = 3): Promise<any> {
  let lastError: any;

  // 1. 尝试直接请求
  // 某些环境 (如非浏览器环境或目标 API 支持 CORS) 可以直接请求
  try {
    const directUrl = useDevProxyIfWeb(url);
    console.log(`[网络] 尝试直接请求: ${directUrl} (orig=${url})`);
    const response = await fetch(directUrl);
    if (response.ok) {
      const json = await response.json();
      // 打印返回的原始数据
      console.log(`[网络] 直接请求 ${directUrl} 成功: status=${response.status} length=${JSON.stringify(json).length}`);
      return json;
    } else {
      console.warn(`[网络] 直接请求 ${directUrl} 非 2xx: status=${response.status} url=${directUrl}`);
    }
  } catch (e) {
    // 直接请求失败很正常 (通常是 CORS)，记录日志后继续尝试代理
    console.warn('[网络] 直接请求失败，尝试使用代理...', (e as any)?.message);
  }

  // 2. 轮询代理列表
  for (const proxyBase of PROXY_LIST) {
    const proxyUrl = buildProxyUrl(proxyBase, url);
    console.log(`[网络] 尝试代理 ${url} -> ${proxyUrl}`);
    
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`代理响应错误: ${response.status}`);
      }

      const data = await response.json();
      
      // 特殊处理: AllOrigins 代理返回的数据包裹在 contents 字段中，且可能是字符串化的 JSON
      if (proxyBase.includes('allorigins')) {
        const parsed = JSON.parse(data.contents);
        console.log(`[网络] AllOrigins 代理成功: status=${response.status} length=${JSON.stringify(parsed).length}`);
        return parsed;
      }
      
      console.log(`[网络] 代理成功: ${proxyBase} status=${response.status} length=${JSON.stringify(data).length}`);
      return data;
    } catch (error) {
      console.warn(`[网络] 代理 ${proxyBase} 失败:`, (error as any)?.message || error);
      lastError = error;
      continue; // 当前代理失败，尝试下一个
    }
  }

  // 所有方式都失败
  if (lastError instanceof Error) {
    lastError.message = `[网络] 所有网络请求方式均失败: url=${url} last=${lastError.message}`;
    throw lastError;
  }
  throw new Error(`[网络] 所有网络请求方式均失败: url=${url} last=${String(lastError || '')}`);
}

/**
 * 智能文本 Fetch 函数
 * 功能: 类似于 smartFetch，但专门用于获取 HTML 文本内容。
 * 用途: 主要用于网页抓取 (Scraping) 场景，例如解析 Apple 网页上的非 API 数据。
 */
async function smartFetchText(url: string): Promise<string> {
  let lastError: any;
  
  // 1. 尝试直接请求
  try {
    const directUrl = useDevProxyIfWeb(url);
    console.log(`[网络] 尝试直接文本请求: ${directUrl} (orig=${url})`);
    const response = await fetch(directUrl);
    if (response.ok) {
      const text = await response.text();
      console.log(`[网络] 文本直连成功: status=${response.status} length=${text.length}`);
      return text;
    } else {
      console.warn(`[网络] 文本直连非 2xx: status=${response.status} url=${directUrl}`);
    }
  } catch (e) {
    console.warn('[网络] 文本直连失败，切换代理...', (e as any)?.message);
  }

  // 构造 Jina AI Reader URL (这是一个可以将网页转换为 Markdown/Text 的服务，有时用于绕过反爬)
  const jinaUrl = `https://r.jina.ai/${url}`;
    
  // 检测运行环境
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  const isWebRuntime =
    typeof g.window !== 'undefined' ||
    typeof g.document !== 'undefined' ||
    (typeof g.navigator !== 'undefined' && typeof g.location !== 'undefined');
    
  console.log(
    `[网络] smartFetchText 运行环境: isWebRuntime=${isWebRuntime}`
  );

  // 文本请求专用的代理列表
  const textProxies = [
    { base: 'https://r.jina.ai/http://', url: jinaUrl, mode: 'text' as const },
    { base: 'https://corsproxy.io/?', url: `https://corsproxy.io/?${encodeURIComponent(url)}`, mode: 'text' as const },
    { base: 'https://thingproxy.freeboard.io/fetch/', url: `https://thingproxy.freeboard.io/fetch/${url}`, mode: 'text' as const },
    // 浏览器环境下避免使用 AllOrigins 获取文本，因为它返回 JSON
    ...(isWebRuntime
      ? []
      : [{ base: 'https://api.allorigins.win/get?disableCache=true&url=', url: `https://api.allorigins.win/get?disableCache=true&url=${encodeURIComponent(url)}`, mode: 'json_contents' as const }])
  ];

  // 轮询代理
  for (const proxy of textProxies) {
    const proxyBase = proxy.base;
    const proxyUrl = proxy.url;
    console.log(`[网络] 文本代理尝试: ${proxyBase} -> ${proxyUrl}`);
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`代理响应错误: ${response.status}`);
      }
      if (proxy.mode === 'json_contents') {
        const data = await response.json();
        const text = String(data.contents || '');
        console.log(`[网络] AllOrigins 文本代理成功: status=${response.status} length=${text.length}`);
        return text;
      } else {
        const text = await response.text();
        console.log(`[网络] 文本代理成功: ${proxyBase} status=${response.status} length=${text.length}`);
        return text;
      }
    } catch (error) {
      const msg = (error as any)?.message || String(error);
      if (String(msg).toLowerCase().includes('failed to fetch')) {
        console.warn(`[网络] 文本代理失败 ${proxyBase}: 可能是 CORS 或网络拦截 (Failed to fetch)`);
      } else {
        console.warn(`[网络] 文本代理失败 ${proxyBase}:`, msg);
      }
      lastError = error;
      continue;
    }
  }
  if (lastError instanceof Error) {
    lastError.message = `[网络] 所有文本请求方式均失败: url=${url} last=${lastError.message}`;
    throw lastError;
  }
  throw new Error(`[网络] 所有文本请求方式均失败: url=${url} last=${String(lastError || '')}`);
}

// ==========================================
// 业务逻辑: 获取 App Store 数据
// ==========================================

/**
 * 获取 App Store 排行榜数据 (核心业务函数)
 * 功能: 获取指定国家、分类的 App 排行榜数据。
 * 特性: 
 * 1. 包含本地缓存机制 (localStorage)。
 * 2. 自动处理数据映射 (RSS XML/JSON -> AppData)。
 * 
 * @param category 榜单类别 (如 top-free)
 * @param countryCode 国家代码 (如 cn, us)
 * @param genreId 分类 ID (可选，如 6014 代表游戏)
 */
export async function fetchAppStoreData(
  category: CategoryType, 
  countryCode: string = 'cn',
  genreId?: number
): Promise<AppData[]> {
  const rssCategory = CATEGORY_MAP[category] || category;
  const cacheKey = `${CACHE_KEY_PREFIX}${countryCode}_${category}_${genreId || 'all'}`;

  // 1. 检查本地缓存 (仅在浏览器环境有效)
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached) as CacheItem<AppData[]>;
        // 检查缓存是否过期
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.log(`[缓存] 命中缓存: ${category}`);
          return data;
        }
      } catch (e) {
        console.warn('[缓存] 解析缓存失败，将重新获取');
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // 2. 构造 Apple RSS API URL
  // 格式: https://itunes.apple.com/{country}/rss/{chart}/limit=50/json
  // 如果有 genreId，则加上 genre={id}
  const baseUrl = `https://itunes.apple.com/${countryCode}/rss/${rssCategory}/limit=50`;
  const appleUrl = genreId 
    ? `${baseUrl}/genre=${genreId}/json`
    : `${baseUrl}/json`;
  
  try {
    console.log(`[API] 发起榜单请求: country=${countryCode} category=${category} rss=${rssCategory} genre=${genreId ?? 'all'} url=${appleUrl}`);
    
    // 发起网络请求
    const data = await smartFetch(appleUrl);
    
    // 校验数据完整性
    if (!data || !data.feed) {
      console.warn(`[API] 响应缺少 feed 字段: ${appleUrl}`);
    }
    const rawEntry = data.feed.entry;
    let entries: any[] = [];

    // 处理 API 返回的数据结构差异 (单条数据时可能不是数组)
    if (Array.isArray(rawEntry)) {
      entries = rawEntry;
    } else if (rawEntry) {
      entries = [rawEntry];
    } else {
      console.warn(`[API] ${category} 在 ${countryCode} 返回空列表 (url=${appleUrl})`);
      entries = [];
    }

    // 3. 数据转换 (Data Mapping)
    // 将 Apple RSS 复杂的嵌套 JSON 转换为前端易用的 AppData 格式
    const mappedData: AppData[] = entries.map((entry: any, index: number) => {
      // 获取最大分辨率的图标
      const images = entry['im:image'] || [];
      const iconUrl = images.length > 0 ? images[images.length - 1].label : '';

      return {
        id: entry.id?.attributes?.['im:id'] || `app-${index}`,
        rank: index + 1,
        name: entry['im:name']?.label || '未知应用',
        developer: entry['im:artist']?.label || '未知开发者',
        iconUrl: iconUrl,
        category: entry.category?.attributes?.label || 
                 entry['im:category']?.attributes?.label || '未分类',
        price: entry['im:price']?.label || '免费',
        // 确保 URL 指向 Mac App Store (platform=mac)
        appUrl: (entry.id?.label || `https://apps.apple.com/${countryCode}/app/id${entry.id?.attributes?.['im:id'] || ''}`).replace(/\?.*$/, '') + '?platform=mac',
        summary: entry.summary?.label || '暂无简介'
      };
    });

    if (mappedData.length > 0) {
      const sample = mappedData.slice(0, 3).map(a => `${a.rank}.${a.name}`).join(' | ');
      console.log(`[API] 映射完成: total=${mappedData.length} sample=${sample}`);
    } else {
      console.log(`[API] 映射完成: total=0`);
    }

    // 4. 写入缓存 (仅在浏览器环境)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: mappedData,
        timestamp: Date.now()
      }));
      console.log(`[缓存] 已写入: key=${cacheKey} size=${mappedData.length}`);
    }

    console.log(`[API] 成功获取 ${mappedData.length} 个应用数据`);
    return mappedData;

  } catch (error: any) {
    console.error('[API] 获取应用数据失败:', error?.message || error);
    console.error(`[API] 请求上下文: country=${countryCode} category=${category} genre=${genreId ?? 'all'} url=${appleUrl}`);
    
    if (error.message && error.message.includes('API 返回数据格式错误')) {
      throw error;
    }
    throw new Error('无法连接到 App Store，请检查网络连接');
  }
}

export interface DiscoverSection {
  title: string;
  type: CategoryType;
  data: AppData[];
  error?: string;
}

/**
 * 获取 Discover (发现) 页面数据
 * 功能: 并行获取多个榜单的数据，用于构建首页的聚合视图。
 * 包含: Top Free, Top Paid, Top Grossing, 以及游戏榜单。
 */
export async function fetchDiscoverData(
  countryCode: string = 'cn',
  genreId?: number
): Promise<DiscoverSection[]> {
  // 定义需要获取的版块
  const categories: { type: CategoryType; title: string; genreId?: number }[] = [
    { type: 'top-free', title: 'Top Free Apps' },
    { type: 'top-paid', title: 'Top Paid Apps' },
    { type: 'top-grossing', title: 'Top Grossing Apps' }
  ];

  // 如果是在主发现页 (没有指定特定分类)，额外添加游戏榜单
  if (!genreId) {
    categories.push(
      { type: 'top-free-games', title: 'Top Free Games', genreId: 6014 },
      { type: 'top-paid-games', title: 'Top Paid Games', genreId: 6014 }
    );
  }

  // 并行发起所有请求 (Promise.allSettled 确保即使部分失败，页面也能渲染成功的版块)
  const results = await Promise.allSettled(
    categories.map(cat => fetchAppStoreData(cat.type, countryCode, genreId || cat.genreId))
  );

  const sections: DiscoverSection[] = [];

  console.log(`[Discover] 聚合结果: country=${countryCode} genre=${genreId ?? 'all'} sections=${categories.map(c=>c.type).join(',')}`);

  // 处理结果
  results.forEach((result, index) => {
    const base = {
      title: categories[index].title,
      type: categories[index].type,
    } as const;

    if (result.status === 'fulfilled') {
      const value = result.value || [];
       console.log(`[Discover] ${base.type} 获取成功: count=${value.length}`);
      sections.push({
        ...base,
        data: value,
        error: value.length === 0 ? 'Empty data' : undefined
      });
    } else {
      console.warn(`[Discover] Failed to fetch ${categories[index].type}:`, (result.reason && (result.reason.message || String(result.reason))) || result.reason);
      sections.push({
        ...base,
        data: [],
        error: (result.reason && (result.reason.message || String(result.reason))) || 'Network error'
      });
    }
  });

  return sections;
}

/**
 * 渐进式获取 Discover 数据
 * 特性: 每个榜单完成后立即通过回调返回，提升用户感知速度
 * 使用场景: 前端希望“先出一点数据再慢慢补全”，而不是等全部完成
 */
export async function fetchDiscoverDataProgressive(
  countryCode: string = 'cn',
  genreId?: number,
  onSection?: (section: DiscoverSection) => void
): Promise<DiscoverSection[]> {
  const categories: { type: CategoryType; title: string; genreId?: number }[] = [
    { type: 'top-free', title: 'Top Free Apps' },
    { type: 'top-paid', title: 'Top Paid Apps' },
    { type: 'top-grossing', title: 'Top Grossing Apps' }
  ];
  if (!genreId) {
    categories.push(
      { type: 'top-free-games', title: 'Top Free Games', genreId: 6014 },
      { type: 'top-paid-games', title: 'Top Paid Games', genreId: 6014 }
    );
  }

  console.log(`[Discover] 渐进式获取: country=${countryCode} genre=${genreId ?? 'all'} sections=${categories.map(c=>c.type).join(',')}`);

  const sections: DiscoverSection[] = [];

  await Promise.allSettled(
    categories.map(async (cat) => {
      try {
        const data = await fetchAppStoreData(cat.type, countryCode, genreId || cat.genreId);
        const section: DiscoverSection = {
          title: cat.title,
          type: cat.type,
          data,
          error: data.length === 0 ? 'Empty data' : undefined
        };
        sections.push(section);
        if (onSection) {
          console.log(`[Discover] 渐进式回调: ${cat.type} count=${data.length}`);
          onSection(section);
        }
      } catch (e: any) {
        console.warn(`[Discover] 渐进式失败: ${cat.type}`, e?.message || e);
        const section: DiscoverSection = {
          title: cat.title,
          type: cat.type,
          data: [],
          error: e?.message || 'Network error'
        };
        sections.push(section);
        if (onSection) onSection(section);
      }
    })
  );

  return sections;
}

/**
 * 获取应用详情
 * 功能: 使用 iTunes Lookup API 获取特定应用的详细元数据。
 * 用途: 详情页展示更丰富的信息 (如评分、截图、版本号等)，因为 RSS Feed 中的信息比较简略。
 */
export async function fetchAppDetails(appId: string, countryCode: string): Promise<AppDetail | null> {
  const url = `${API_BASE_LOOKUP}?id=${appId}&country=${countryCode}&entity=macSoftware`;
  try {
    const data: LookupResponse = await smartFetch(url);
    
    if (!data || typeof data.resultCount !== 'number') {
      throw new Error("详情接口返回格式异常");
    }

    return data.results && data.results.length > 0 ? data.results[0] : null;
  } catch (err: any) {
    console.error(`[API] 获取应用详情失败: ${appId} in ${countryCode}`, err.message);
    throw err;
  }
}

// ==========================================
// 辅助工具函数 (HTML 解析与数据清洗)
// ==========================================

// 解码 HTML 实体 (如 &amp; -> &)
function decodeHtmlEntities(input: string): string {
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

// 转义正则特殊字符
function escapeRegExp(input: string): string {
  return String(input ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 截断调试日志字符串
function clipDebug(input: string, maxLen: number = 180): string {
  const s = String(input ?? '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...(+${s.length - maxLen})`;
}

// 规范化 Apple URL (处理转义字符并解析相对路径)
function normalizeAppleUrl(href: string, baseUrl: string): string {
  const raw = decodeHtmlEntities(String(href ?? '')).trim();
  if (!raw) return '';
  const normalized = raw
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003F/gi, '?')
    .replace(/\\u003D/gi, '=');
  try {
    return new URL(normalized, baseUrl).toString();
  } catch {
    return normalized;
  }
}

/**
 * 在 HTML 中查找特定 Label 对应的链接
 * 用途: 网页爬虫辅助函数，用于从 HTML 源码中提取特定按钮或链接的 URL。
 */
function findHrefByLabel(html: string, baseUrl: string, label: string): string {
  const target = String(label ?? '').toLowerCase();
  console.log(`[Discover] 查找链接: label=${label} base=${baseUrl} htmlLength=${html.length}`);

  // 1. 尝试使用 DOMParser 解析 (浏览器环境)
  const hasDomParser = typeof DOMParser !== 'undefined';
  if (hasDomParser) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // 打印doc的内容
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    console.log(`[Discover] DOM 解析完成: anchors=${anchors.length}`);

    let matchedCount = 0;
    for (const a of anchors) {
      // 检查多个属性以匹配标签文本
      const candidates = [
        a.getAttribute('aria-label') || '',
        a.getAttribute('data-analytics-title') || '',
        a.getAttribute('data-analytics-label') || '',
        a.getAttribute('title') || '',
        a.textContent || ''
      ]
        .map(s => decodeHtmlEntities(s).toLowerCase())
        .filter(Boolean);

      const isMatch = candidates.some(v => v.includes(target));
      if (!isMatch) continue;
      matchedCount += 1;

      const href = a.getAttribute('href') || '';
      const url = normalizeAppleUrl(href, baseUrl);
      
      if (url) {
        console.log(`[Discover] 选定链接: label=${label} url=${url}`);
        return url;
      }

      if (matchedCount >= 8) {
        break;
      }
    }
  } else {
    const escaped = escapeRegExp(label);
    const mdRe = new RegExp(`\\[[^\\]]*${escaped}[^\\]]*\\]\\(([^)\\s]+)\\)`, 'i');
    const mdMatch = html.match(mdRe);
    if (mdMatch && mdMatch[1]) {
      const normalized = normalizeAppleUrl(mdMatch[1], baseUrl);
      if (normalized) {
        console.log(`[Discover] Markdown 回退解析命中: label=${label} url=${normalized}`);
        return normalized;
      }
    }
    console.warn(`[Discover] 当前环境无 DOMParser，且 Markdown 回退解析未命中: label=${label}`);
  }

  // 2. 尝试使用正则表达式匹配 (作为 DOMParser 的回退或补充)
  const idx = html.indexOf(label);
  if (idx >= 0) {
    const window = html.slice(Math.max(0, idx - 800), Math.min(html.length, idx + 1200));
    const escaped = escapeRegExp(label);
    const patterns = [
      new RegExp(`"label"\\s*:\\s*"${escaped}"[\\s\\S]{0,600}?"href"\\s*:\\s*"([^"]+)"`, 'i'),
      new RegExp(`"label"\\s*:\\s*"${escaped}"[\\s\\S]{0,600}?"url"\\s*:\\s*"([^"]+)"`, 'i'),
      new RegExp(`${escaped}[\\s\\S]{0,600}?href="([^"]+)"`, 'i'),
      new RegExp(`"name"\\s*:\\s*"${escaped}"[\\s\\S]{0,600}?"url"\\s*:\\s*"([^"]+)"`, 'i')
    ];
    for (const re of patterns) {
      const m = window.match(re);
      if (m && m[1]) {
        const extracted = String(m[1]);
        const normalized = normalizeAppleUrl(extracted, baseUrl);
        return normalized;
      }
    }
  }
  
  return '';
}

/**
 * 从发现页 HTML 中提取 App ID
 * 用途: 网页爬虫辅助函数，分析 HTML 中的所有 App Store 链接，提取其中的 App ID。
 */
function extractAppIdsFromDiscover(html: string, countryCode: string, baseUrl: string): { id: string; url: string }[] {
  const items: { id: string; url: string }[] = [];
  const seen = new Set<string>();

  // 1. DOM 解析
  const hasDomParser = typeof DOMParser !== 'undefined';
  if (hasDomParser) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    anchors.forEach(a => {
      const href = a.getAttribute('href') || '';
      const absUrl = normalizeAppleUrl(href, baseUrl);
      // 过滤非 App 链接
      if (!absUrl.includes('apps.apple.com')) return;
      if (!absUrl.includes('/app/')) return;
      if (!absUrl.includes(`/${countryCode}/`)) return;
      
      // 提取 ID
      const m = absUrl.match(/id(\d+)/);
      if (m) {
        const id = m[1];
        if (!seen.has(id)) {
          seen.add(id);
          items.push({ id, url: absUrl.split('?')[0] + '?platform=mac' });
        }
      }
    });
  }

  // 2. 正则回退
  if (items.length === 0) {
    const re = new RegExp(`https?:\\/\\/apps\\.apple\\.com\\/${countryCode}\\/app\\/[^"\\s>]*?id(\\d+)`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const id = m[1];
      if (!seen.has(id)) {
        seen.add(id);
        items.push({ id, url: `https://apps.apple.com/${countryCode}/app/id${id}?platform=mac` });
      }
    }
  }

  console.log(`[Discover] 解析到应用链接: count=${items.length} country=${countryCode}`);
  return items;
}

// 将详情对象转换为 AppData 列表对象
function mapDetailToAppData(detail: AppDetail, rank: number): AppData {
  const anyDetail = detail as any;
  const iconUrl = anyDetail.artworkUrl100 || anyDetail.artworkUrl60 || detail.artworkUrl512 || '';
  return {
    id: String(detail.trackId),
    rank,
    name: detail.trackName,
    developer: detail.artistName || detail.sellerName,
    iconUrl: iconUrl,
    category: detail.primaryGenreName || (detail.genres && detail.genres[0]) || '未分类',
    price: typeof detail.price === 'number' && detail.price === 0 ? '免费' : (detail.formattedPrice || '免费'),
    appUrl: (detail.trackViewUrl || '').replace(/\?.*$/, '') + '?platform=mac',
    summary: detail.description || ''
  };
}

/**
 * 从网页抓取 Discover 数据
 * 实现逻辑参考 print-discover.js:
 * 1. 访问 Discover 首页
 * 2. 寻找 "Top Paid Apps" (付费榜) 等链接
 * 3. 抓取该榜单页面并解析 App ID
 * 4. 调用 Lookup API 获取详细信息
 */
export async function fetchDiscoverFromWeb(countryCode: string = 'us'): Promise<DiscoverSection[]> {
  console.log(`[DiscoverWeb] 开始从网页抓取 Discover 数据: country=${countryCode}`);
  const discoverUrl = `https://apps.apple.com/${countryCode}/mac/discover`;
  const sections: DiscoverSection[] = [];

  try {
    // 1. 获取 Discover 首页 HTML
    console.log(`[DiscoverWeb] 请求 Discover 首页: ${discoverUrl}`);
    const html = await smartFetchText(discoverUrl);
    console.log(`[DiscoverWeb] Discover 首页获取成功: length=${html.length}`);

    // 2. 查找 "Top Paid Apps" 链接
    // 注意: 不同国家/语言的 Label 可能不同，这里目前主要支持英文环境 (us) 或寻找通用特征
    // 如果是中文环境，可能需要查找 "付费排行" 等
    // 暂时先尝试英文 Label "Top Paid Apps"
    const targetLabel = 'Top Paid Apps'; 
    const topPaidHref = findHrefByLabel(html, discoverUrl, targetLabel);

    if (topPaidHref) {
      console.log(`[DiscoverWeb] 找到榜单链接: label=${targetLabel} url=${topPaidHref}`);
      
      // 3. 获取榜单页面
      console.log(`[DiscoverWeb] 请求榜单页面: ${topPaidHref}`);
      const listHtml = await smartFetchText(topPaidHref);
      console.log(`[DiscoverWeb] 榜单页面获取成功: length=${listHtml.length}`);

      // 4. 解析 App ID
      const appLinks = extractAppIdsFromDiscover(listHtml, countryCode, topPaidHref);
      console.log(`[DiscoverWeb] 解析到应用链接: count=${appLinks.length}`);

      // 5. 获取应用详情 (限制前 20 个，避免请求过多)
      const limit = 20;
      const pickedLinks = appLinks.slice(0, limit);
      const apps: AppData[] = [];

      for (let i = 0; i < pickedLinks.length; i++) {
        const { id } = pickedLinks[i];
        try {
          console.log(`[DiscoverWeb] 获取详情 (${i + 1}/${pickedLinks.length}): id=${id}`);
          // 串行请求以避免触发频率限制，或者可以使用 Promise.all 但需要控制并发
          const detail = await fetchAppDetails(id, countryCode);
          if (detail) {
            const appData = mapDetailToAppData(detail, i + 1);
            apps.push(appData);
          }
        } catch (e) {
          console.warn(`[DiscoverWeb] 获取详情失败: id=${id}`, e);
        }
      }

      if (apps.length > 0) {
        sections.push({
          title: 'Top Paid Apps (Web)',
          type: 'top-paid',
          data: apps
        });
        console.log(`[DiscoverWeb] 成功构建版块: title="Top Paid Apps (Web)" count=${apps.length}`);
      }
    } else {
      console.warn(`[DiscoverWeb] 未找到目标榜单链接: label=${targetLabel}`);
    }

  } catch (error) {
    console.error('[DiscoverWeb] 抓取流程发生错误:', error);
  }

  return sections;
}

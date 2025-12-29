import { CategoryType, AppData, AppDetail, LookupResponse } from '../types';
import { API_BASE_LOOKUP } from '../constants';

// 代理配置
const PROXY_LIST = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/'
];

// 缓存配置
const CACHE_KEY_PREFIX = 'app_store_data_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存

// 类别映射：将通用类别转换为 iTunes RSS 支持的格式
// 注意：Mac App Store 的 RSS Feed 与 iOS 不同，许多 "new" 榜单不支持
const CATEGORY_MAP: Record<string, string> = {
  'top-free': 'topfreemacapps',
  'top-paid': 'toppaidmacapps',
  'top-grossing': 'topgrossingmacapps',
  
  // Mac App Store 不支持 new-apps, new-free, new-paid 等榜单 (会返回 400)
  // 我们使用 topmacapps (Top Overall) 作为 new-apps 的回退
  // 使用 topfreemacapps 作为 new-free 的回退
  // 使用 toppaidmacapps 作为 new-paid 的回退
  'new-apps': 'topmacapps', 
  'new-free': 'topfreemacapps',
  'new-paid': 'toppaidmacapps',
  'top-free-games': 'topfreemacapps',
  'top-paid-games': 'toppaidmacapps'
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * 带有重试和代理回退机制的 Fetch 函数
 * @param url 目标 URL
 * @param retries 重试次数
 */
async function smartFetch(url: string, retries = 3): Promise<any> {
  let lastError: any;

  // 尝试直接请求 (适用于非浏览器环境或支持 CORS 的 API)
  try {
    console.debug(`[网络] 尝试直接请求: ${url}`);
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[网络] 直接请求失败，尝试使用代理...');
  }

  // 尝试使用代理列表
  for (const proxyBase of PROXY_LIST) {
    const proxyUrl = `${proxyBase}${encodeURIComponent(url)}`;
    console.debug(`[网络] 尝试代理: ${proxyBase}`);
    
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`代理响应错误: ${response.status}`);
      }

      const data = await response.json();
      
      // AllOrigins 返回的数据在 contents 字段中，且是字符串格式
      if (proxyBase.includes('allorigins')) {
        return JSON.parse(data.contents);
      }
      
      return data;
    } catch (error) {
      console.warn(`[网络] 代理 ${proxyBase} 失败:`, error);
      lastError = error;
      continue; // 尝试下一个代理
    }
  }

  throw lastError || new Error('所有网络请求方式均失败');
}

/**
 * 获取 App Store 数据 (带缓存和优化)
 * @param category 榜单类别
 * @param countryCode 国家代码 (默认 cn)
 * @param genreId 分类 ID (可选)
 */
export async function fetchAppStoreData(
  category: CategoryType, 
  countryCode: string = 'cn',
  genreId?: number
): Promise<AppData[]> {
  const rssCategory = CATEGORY_MAP[category] || category;
  const cacheKey = `${CACHE_KEY_PREFIX}${countryCode}_${category}_${genreId || 'all'}`;

  // 1. 检查缓存 (仅在浏览器环境)
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached) as CacheItem<AppData[]>;
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.debug(`[缓存] 命中缓存: ${category}`);
          return data;
        }
      } catch (e) {
        console.warn('[缓存] 解析缓存失败，将重新获取');
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // 2. 发起网络请求
  // Base: https://itunes.apple.com/{country}/rss/{chart}/limit=50/json
  // Genre: https://itunes.apple.com/{country}/rss/{chart}/limit=50/genre={id}/json
  const baseUrl = `https://itunes.apple.com/${countryCode}/rss/${rssCategory}/limit=50`;
  const appleUrl = genreId 
    ? `${baseUrl}/genre=${genreId}/json`
    : `${baseUrl}/json`;
  
  try {
    const data = await smartFetch(appleUrl);
    const rawEntry = data.feed.entry;
    let entries: any[] = [];

    if (Array.isArray(rawEntry)) {
      entries = rawEntry;
    } else if (rawEntry) {
      // 如果只有一个条目，API 可能返回对象而不是数组
      entries = [rawEntry];
    } else {
      // 如果没有 entry 字段，说明没有数据，返回空数组
      console.warn(`[API] ${category} 在 ${countryCode} 返回空列表`);
      entries = [];
    }

    // 3. 数据转换
    const mappedData: AppData[] = entries.map((entry: any, index: number) => {
      // 安全获取图片 URL，优先获取大图
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

    // 4. 更新缓存 (仅在浏览器环境)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: mappedData,
        timestamp: Date.now()
      }));
    }

    console.log(`[API] 成功获取 ${mappedData.length} 个应用数据`);
    return mappedData;

  } catch (error: any) {
    console.error('[API] 获取应用数据失败:', error);
    // 透传数据格式错误，以便上层处理或调试
    if (error.message && error.message.includes('API 返回数据格式错误')) {
      throw error;
    }
    throw new Error('无法连接到 App Store，请检查网络连接');
  }
}

/**
 * 获取特定应用的详细信息 (iTunes Lookup API)
 * 保持原有功能但使用新的 smartFetch
 */
export interface DiscoverSection {
  title: string;
  type: CategoryType;
  data: AppData[];
}

/**
 * 获取 Discover 页面聚合数据
 * 并行获取 Top Free, Top Paid, Top Grossing
 */
export async function fetchDiscoverData(
  countryCode: string = 'cn',
  genreId?: number
): Promise<DiscoverSection[]> {
  const categories: { type: CategoryType; title: string; genreId?: number }[] = [
    { type: 'top-free', title: 'Top Free Apps' },
    { type: 'top-paid', title: 'Top Paid Apps' },
    { type: 'top-grossing', title: 'Top Grossing Apps' }
  ];

  // If we are on the main Discover page (no specific genre), add Games sections to mimic the Store
  if (!genreId) {
    categories.push(
      { type: 'top-free-games', title: 'Top Free Games', genreId: 6014 },
      { type: 'top-paid-games', title: 'Top Paid Games', genreId: 6014 }
    );
  }

  // 并行发起请求
  const results = await Promise.allSettled(
    categories.map(cat => fetchAppStoreData(cat.type, countryCode, genreId || cat.genreId))
  );

  const sections: DiscoverSection[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      sections.push({
        title: categories[index].title,
        type: categories[index].type,
        data: result.value
      });
    } else {
      console.warn(`[Discover] Failed to fetch ${categories[index].type}:`, 
        result.status === 'rejected' ? result.reason : 'Empty data');
    }
  });

  return sections;
}

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

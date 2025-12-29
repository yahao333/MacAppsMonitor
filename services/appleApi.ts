
import { API_BASE_RSS, API_BASE_LOOKUP } from '../constants';
import { ChartType, RankingResponse, LookupResponse, AppDetail } from '../types';

/**
 * 代理类型定义
 */
type ProxyType = 'none' | 'corsproxy' | 'allorigins';

/**
 * 通用的请求函数，包含多级代理回退逻辑，解决 CORS 问题
 * @param url 目标 URL
 * @param proxyType 当前使用的代理类型
 */
async function smartFetch(url: string, proxyType: ProxyType = 'none'): Promise<any> {
  let targetUrl = url;
  
  if (proxyType === 'corsproxy') {
    // 使用 corsproxy.io 作为首选代理
    targetUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  } else if (proxyType === 'allorigins') {
    // 作为次选代理方案
    targetUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  }

  console.debug(`[网络] 发起请求 (${proxyType}): ${targetUrl}`);
  
  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      console.error(`[网络] 响应状态异常: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (proxyType === 'allorigins') {
      console.debug(`[网络] AllOrigins 响应已接收，解析内部内容...`);
      if (!data || !data.contents) {
        throw new Error("AllOrigins 返回内容为空");
      }
      try {
        return JSON.parse(data.contents);
      } catch (e) {
        throw new Error("无法解析代理返回的 JSON 内容");
      }
    }

    return data;
  } catch (error: any) {
    const isNetworkError = error instanceof TypeError || (error.message && error.message.toLowerCase().includes('fetch'));
    
    if (proxyType === 'none' && isNetworkError) {
      console.warn(`[网络] 直接请求失败 (疑似 CORS)，尝试使用 corsproxy.io 重试...`);
      return smartFetch(url, 'corsproxy');
    }
    
    if (proxyType === 'corsproxy' && isNetworkError) {
      console.warn(`[网络] corsproxy.io 失败，尝试使用 allorigins.win 重试...`);
      return smartFetch(url, 'allorigins');
    }

    console.error(`[网络] 请求在 ${proxyType} 阶段最终失败:`, error.message);
    throw error;
  }
}

/**
 * 获取排行榜数据 (RSS API)
 * @param countryCode 国家代码
 * @param chart 榜单类型
 * @param retryWithAltUrl 是否尝试备用 URL 结构
 */
export async function fetchRankings(countryCode: string, chart: ChartType, retryWithAltUrl: boolean = false): Promise<RankingResponse> {
  const fileName = retryWithAltUrl ? 'mac-apps.json' : 'apps.json';
  const limit = 50; 
  const url = `${API_BASE_RSS}/${countryCode}/apps/${chart}/${limit}/${fileName}`;
  
  try {
    const data = await smartFetch(url);
    
    let results = null;
    if (data?.feed?.results) {
      results = data.feed.results;
    } else if (data?.results) {
      results = data.results;
    } else if (data?.feed?.entry) {
      results = data.feed.entry;
    }

    if (!results || !Array.isArray(results)) {
      if (!retryWithAltUrl) {
        console.warn(`[API] ${fileName} 结构未找到结果，尝试切换备用文件名...`);
        return fetchRankings(countryCode, chart, true);
      }
      throw new Error("results_missing");
    }
    
    console.debug(`[API] 排行榜获取成功: ${countryCode} ${chart}, 数量: ${results.length}`);
    
    return {
      feed: {
        results: results
      }
    };
  } catch (err: any) {
    console.error(`[API] 获取排行榜过程发生异常: ${countryCode} ${chart}`, err.message);
    throw err;
  }
}

/**
 * 获取特定应用的详细信息 (iTunes Lookup API)
 * @param appId 应用 ID
 * @param countryCode 国家代码
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

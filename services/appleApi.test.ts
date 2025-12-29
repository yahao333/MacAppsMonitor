import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAppStoreData } from './appleApi';

// Mock 数据 (基于真实 API 返回)
const mockEntry = {
  "im:name": { "label": "汽水音乐 - 随时听好歌" },
  "im:image": [
    { "label": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/10/39/ff/1039ffc6-7040-4a90-c107-bcae2a890d64/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/53x53bb.png", "attributes": { "height": "53" } },
    { "label": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/10/39/ff/1039ffc6-7040-4a90-c107-bcae2a890d64/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/75x75bb.png", "attributes": { "height": "75" } },
    { "label": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/10/39/ff/1039ffc6-7040-4a90-c107-bcae2a890d64/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/100x100bb.png", "attributes": { "height": "100" } }
  ],
  "summary": { "label": "汽水音乐APP是抖音旗下音乐APP..." },
  "im:price": { "label": "获取", "attributes": { "amount": "0.00", "currency": "CNY" } },
  "im:contentType": { "attributes": { "term": "Application", "label": "程序" } },
  "rights": { "label": "© 2022 Beijing Douyin Technology Co., Ltd." },
  "title": { "label": "汽水音乐 - 随时听好歌 - Beijing Douyin Technology Co., Ltd." },
  "link": [
    { "attributes": { "rel": "alternate", "type": "text/html", "href": "https://apps.apple.com/cn/app/%E6%B1%BD%E6%B0%B4%E9%9F%B3%E4%B9%90-%E9%9A%8F%E6%97%B6%E5%90%AC%E5%A5%BD%E6%AD%8C/id1605585211?uo=2" } },
    { "im:duration": { "label": "0" }, "attributes": { "title": "试听/预览", "rel": "enclosure", "type": "image/jpeg", "href": "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/4a/cf/06/4acf06da-c0ee-fdb7-e30e-a7323258ae51/oYIhI3AKEiEpNUAgSRzZKBEBhAYrB6AfQBkiAk.jpg/1024x1024bb.jpg", "im:assetType": "preview" } }
  ],
  "id": {
    "label": "https://apps.apple.com/cn/app/%E6%B1%BD%E6%B0%B4%E9%9F%B3%E4%B9%90-%E9%9A%8F%E6%97%B6%E5%90%AC%E5%A5%BD%E6%AD%8C/id1605585211?uo=2",
    "attributes": { "im:id": "1605585211", "im:bundleId": "com.soda.music" }
  },
  "im:artist": { "label": "Beijing Douyin Technology Co., Ltd.", "attributes": { "href": "https://apps.apple.com/cn/developer/beijing-douyin-technology-co-ltd/id1170416082?uo=2" } },
  "category": {
    "attributes": {
      "im:id": "6011",
      "term": "Music",
      "scheme": "https://apps.apple.com/cn/genre/ios-%E9%9F%B3%E4%B9%90/id6011?uo=2",
      "label": "音乐"
    }
  },
  "im:releaseDate": { "label": "2022-03-03T00:00:00-07:00", "attributes": { "label": "2022年03月03日" } }
};

const mockResponse = {
  feed: {
    author: { name: { label: 'iTunes Store' }, uri: { label: 'http://www.apple.com/itunes/' } },
    entry: [mockEntry],
    updated: { label: '2025-12-28T19:56:24-07:00' },
    rights: { label: 'Copyright 2008 Apple Inc.' },
    title: { label: 'iTunes Store：免费 App 排行' },
    icon: { label: 'http://itunes.apple.com/favicon.ico' },
    link: [
      { attributes: { rel: 'alternate', type: 'text/html', href: 'https://itunes.apple.com/WebObjects/MZStore.woa/wa/viewTop?cc=cn&id=29099&popId=96' } },
      { attributes: { rel: 'self', href: 'https://itunes.apple.com/cn/rss/topfreeapplications/limit=5/json' } }
    ],
    id: { label: 'https://itunes.apple.com/cn/rss/topfreeapplications/limit=5/json' }
  }
};

describe('fetchAppStoreData', () => {
  beforeEach(() => {
    // 清除所有 mocks
    vi.clearAllMocks();
    // 清除 localStorage
    localStorage.clear();
    // Mock 全局 fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch data successfully directly', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const data = await fetchAppStoreData('top-free', 'cn');
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://itunes.apple.com/cn/rss/topfreemacapps/limit=50/json'));
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('汽水音乐 - 随时听好歌');
    expect(data[0].id).toBe('1605585211');
    expect(data[0].appUrl).toContain('platform=mac');
  });

  it('should use cache if available and not expired', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // 第一次请求，应该调用 API
    await fetchAppStoreData('top-free', 'cn');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 第二次请求，应该使用缓存
    const data = await fetchAppStoreData('top-free', 'cn');
    expect(mockFetch).toHaveBeenCalledTimes(1); // 调用次数不变
    expect(data).toHaveLength(1);
  });

  it('should retry with proxy if direct request fails', async () => {
    const mockFetch = global.fetch as any;
    
    // 1. 直接请求失败 (network error or non-200)
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));
    
    // 2. 代理请求成功 (AllOrigins)
    // AllOrigins 返回的数据在 contents 字段中，且是字符串格式
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contents: JSON.stringify(mockResponse)
      }),
    });

    const data = await fetchAppStoreData('top-free', 'cn');
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // 验证第二次调用是 AllOrigins 代理
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('api.allorigins.win'));
    expect(data).toHaveLength(1);
  });

  it('should try next proxy if first proxy fails', async () => {
    const mockFetch = global.fetch as any;
    
    // 1. 直接请求失败
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));
    // 2. AllOrigins 失败 (fetch error or status error)
    mockFetch.mockRejectedValueOnce(new Error('Proxy Error'));
    // 3. Corsproxy 成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const data = await fetchAppStoreData('top-free', 'cn');
    
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('corsproxy.io'));
    expect(data).toHaveLength(1);
  });

  it('should throw error if all attempts fail', async () => {
    const mockFetch = global.fetch as any;
    // 模拟所有请求都失败
    mockFetch.mockRejectedValue(new Error('Failed'));

    await expect(fetchAppStoreData('top-free', 'cn')).rejects.toThrow('无法连接到 App Store');
  });

  it('should handle API response without entry array (return empty list)', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ feed: {} }), // 缺少 entry
    });

    const data = await fetchAppStoreData('top-free', 'cn');
    expect(data).toEqual([]);
  });

  it('should use fallback category for new-apps', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchAppStoreData('new-apps', 'cn');
    
    // 验证 new-apps 被映射到了 topmacapps (或者其他 fallback)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://itunes.apple.com/cn/rss/topmacapps/limit=50/json'));
  });
});

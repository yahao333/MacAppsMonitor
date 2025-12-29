import { describe, it, expect } from 'vitest';
import { fetchAppStoreData } from './appleApi';

describe('App Store API Integration (Real Data)', () => {
  it('should fetch real data from App Store', async () => {
    // 使用真实网络请求，增加超时时间
    const data = await fetchAppStoreData('top-free', 'cn');
    
    // 验证返回数据不为空
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    
    // 验证第一条数据的结构完整性
    const firstApp = data[0];
    console.log('Fetched App:', firstApp.name);
    
    // 验证是否包含 Mac 应用特有的特征 (虽然 RSS 没明确标识，但可以通过 URL 检查)
    // Mac App Store URL 通常包含 /mac/ 或 mt=12
    console.log('App URL:', firstApp.appUrl);

    expect(firstApp.id).toBeDefined();
    expect(firstApp.name).toBeDefined();
    expect(typeof firstApp.name).toBe('string');
    expect(firstApp.name.length).toBeGreaterThan(0);
    
    expect(firstApp.iconUrl).toBeDefined();
    expect(firstApp.iconUrl).toMatch(/^https?:\/\//);
    
    // 验证价格格式 (可能是 "免费" 或 "¥X.XX")
    expect(firstApp.price).toBeDefined();
    
    // 验证 URL
    expect(firstApp.appUrl).toBeDefined();
    expect(firstApp.appUrl).toMatch(/^https?:\/\/apps\.apple\.com\//);
    expect(firstApp.appUrl).toContain('platform=mac');
  }, 15000); // 设置 15秒超时，防止网络波动
});

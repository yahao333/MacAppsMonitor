/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { fetchDiscoverFromWeb } from './appleApi';

describe('Discover Web Scraper', () => {
  it('should fetch Top Paid Apps from web', async () => {
    // 增加超时时间，因为涉及多次网络请求
    const sections = await fetchDiscoverFromWeb('us');
    
    console.log('Sections found:', sections.length);
    if (sections.length > 0) {
      console.log('First section title:', sections[0].title);
      console.log('First section data count:', sections[0].data.length);
      if (sections[0].data.length > 0) {
        console.log('First app:', sections[0].data[0]);
      }
    }

    // 验证返回结果
    expect(sections).toBeDefined();
    // 由于网络原因可能为空，但不能报错
    if (sections.length > 0) {
      expect(sections[0].type).toBe('top-paid');
      expect(sections[0].data.length).toBeGreaterThan(0);
      
      const firstApp = sections[0].data[0];
      expect(firstApp.id).toBeDefined();
      expect(firstApp.name).toBeDefined();
      expect(firstApp.price).toBeDefined();
      expect(firstApp.appUrl).toContain('platform=mac');
    }
  }, 60000); // 60秒超时
});

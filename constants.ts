
import { ChartType, RefreshInterval, Language, Country } from './types';

export const API_BASE_RSS = 'https://rss.marketingtools.apple.com/api/v2';
export const API_BASE_LOOKUP = 'https://itunes.apple.com/lookup';

export const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'us', name: { en: 'United States', zh: '美国' } },
  { code: 'cn', name: { en: 'China', zh: '中国' } },
  { code: 'jp', name: { en: 'Japan', zh: '日本' } },
  { code: 'gb', name: { en: 'United Kingdom', zh: '英国' } },
  { code: 'de', name: { en: 'Germany', zh: '德国' } },
  { code: 'fr', name: { en: 'France', zh: '法国' } },
  { code: 'ca', name: { en: 'Canada', zh: '加拿大' } },
  { code: 'au', name: { en: 'Australia', zh: '澳大利亚' } },
];

export const CHART_LABELS: Record<Language, Record<ChartType, string>> = {
  en: {
    'top-free': 'Top Free',
    'top-paid': 'Top Paid'
  },
  zh: {
    'top-free': '免费榜',
    'top-paid': '付费榜'
  }
};

export const REFRESH_INTERVALS: RefreshInterval[] = [
  { label: '1 Hour', value: 3600000 },
  { label: '6 Hours', value: 21600000 },
  { label: '12 Hours', value: 43200000 },
  { label: '24 Hours', value: 86400000 },
];

export const DEFAULT_INTERVAL = REFRESH_INTERVALS[1]; // 6 hours

export const LOCAL_STORAGE_KEYS = {
  CHART_CACHE: 'mac_app_monitor_charts_v2', // 升级版本以隔离旧数据
  DETAILS_CACHE: 'mac_app_monitor_details',
  SETTINGS: 'mac_app_monitor_settings'
};

export const TRANSLATIONS: Record<Language, any> = {
  en: {
    title: 'Mac App Store Monitor',
    lastSync: 'Last Sync',
    never: 'Never',
    refresh: 'Refresh',
    settings: 'Settings',
    loadingRankings: 'Fetching rankings securely...',
    noData: 'No data available for this chart.',
    retry: 'Retry',
    footerCredit: 'Mac App Store Rank Monitoring Tool',
    footerProxy: 'Connected via secure proxy to Apple Marketing Tools API',
    settingsTitle: 'Settings',
    updateFreq: 'Update Frequency',
    every: 'Every',
    autoRefreshNote: 'Dashboard automatically refreshes in background.',
    saveAndClose: 'Save & Close',
    language: 'Language',
    langEn: 'English',
    langZh: '简体中文',
    country: 'Country/Region',
    loadingDetails: 'Deep scanning app data...',
    findError: 'Unable to find details for this app.',
    loadError: 'Error loading details. Please try again.',
    viewOnAppStore: 'View on App Store',
    screenshots: 'Screenshots',
    description: 'Description',
    appProfile: 'App Profile',
    version: 'Version',
    lastUpdated: 'Last Updated',
    genres: 'Genres',
    supportedDevices: 'Devices',
    errorFetch: 'Unable to fetch {chart} rankings for {country}',
    errorFormat: ': API data format error',
    errorNetwork: ': Network timeout or proxy failure'
  },
  zh: {
    title: 'Mac 应用商店监控',
    lastSync: '上次同步',
    never: '尚未同步',
    refresh: '刷新',
    settings: '设置',
    loadingRankings: '正在安全获取排行榜数据...',
    noData: '当前榜单暂无数据。',
    retry: '重试',
    footerCredit: 'Mac App Store 排名监控工具',
    footerProxy: '通过安全代理连接 Apple Marketing Tools API',
    settingsTitle: '设置',
    updateFreq: '刷新频率',
    every: '每',
    autoRefreshNote: '仪表板将在后台自动刷新。',
    saveAndClose: '保存并关闭',
    language: '语言',
    langEn: 'English',
    langZh: '简体中文',
    country: '国家/地区',
    loadingDetails: '深度扫描应用数据中...',
    findError: '无法找到该应用的详细信息。',
    loadError: '加载详情时出错。请稍后再试。',
    viewOnAppStore: '在 App Store 查看',
    screenshots: '截图展示',
    description: '详细描述',
    appProfile: '应用档案',
    version: '版本',
    lastUpdated: '最后更新',
    genres: '详细分类',
    supportedDevices: '支持设备',
    errorFetch: '无法获取 {country} 的 {chart} 排行榜',
    errorFormat: ': API 数据格式异常',
    errorNetwork: ': 网络连接超时或代理失效'
  }
};

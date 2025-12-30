
import { ChartType, RefreshInterval, Language, Country } from './types';

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
    'top-free': 'Top Free Apps',
    'top-paid': 'Top Paid Apps',
    'top-grossing': 'Top Grossing Apps',
    'new-apps': 'New Apps',
    'new-free': 'New Free Apps',
    'new-paid': 'New Paid Apps',
    'top-free-games': 'Top Free Games',
    'top-paid-games': 'Top Paid Games'
  },
  zh: {
    'top-free': '免费应用榜',
    'top-paid': '付费应用榜',
    'top-grossing': '畅销应用榜',
    'new-apps': '新上架',
    'new-free': '新免费',
    'new-paid': '新付费',
    'top-free-games': '免费游戏榜',
    'top-paid-games': '付费游戏榜'
  }
};

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  type: 'group' | 'category' | 'link';
  genreId?: number;
  disabled?: boolean;
  children?: SidebarItem[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'discover', label: 'Discover', type: 'link', icon: 'Star' },
  { id: 'arcade', label: 'Arcade', type: 'link', icon: 'GameController', genreId: undefined, disabled: true },
  { 
    id: 'create', label: 'Create', type: 'group', icon: 'Brush',
    children: [
      { id: 'graphics-design', label: 'Graphics & Design', type: 'category', genreId: 6027 },
      { id: 'music', label: 'Music', type: 'category', genreId: 6011 },
      { id: 'photo-video', label: 'Photo & Video', type: 'category', genreId: 6008 },
      { id: 'entertainment', label: 'Entertainment', type: 'category', genreId: 6016 }
    ]
  },
  {
    id: 'work', label: 'Work', type: 'group', icon: 'Briefcase', disabled: true,
    children: [
      { id: 'productivity', label: 'Productivity', type: 'category', genreId: 6007 },
      { id: 'business', label: 'Business', type: 'category', genreId: 6000 },
      { id: 'finance', label: 'Finance', type: 'category', genreId: 6015 },
      { id: 'utilities', label: 'Utilities', type: 'category', genreId: 6002 }
    ]
  },
  {
    id: 'play', label: 'Play', type: 'group', icon: 'Rocket',
    children: [
      { id: 'games', label: 'Games', type: 'category', genreId: 6014 }
    ]
  },
  {
    id: 'develop', label: 'Develop', type: 'group', icon: 'Code',
    children: [
      { id: 'developer-tools', label: 'Developer Tools', type: 'category', genreId: 6026 }
    ]
  },
  {
    id: 'categories', label: 'Categories', type: 'group', icon: 'Grid',
    children: [
      { id: 'cat-productivity', label: 'Productivity', type: 'category', genreId: 6007 },
      { id: 'cat-utilities', label: 'Utilities', type: 'category', genreId: 6002 },
      { id: 'cat-photo-video', label: 'Photo & Video', type: 'category', genreId: 6008 },
      { id: 'cat-games', label: 'Games', type: 'category', genreId: 6014 },
      { id: 'cat-business', label: 'Business', type: 'category', genreId: 6000 },
      { id: 'cat-education', label: 'Education', type: 'category', genreId: 6017 },
      { id: 'cat-music', label: 'Music', type: 'category', genreId: 6011 },
      { id: 'cat-social', label: 'Social Networking', type: 'category', genreId: 6005 },
      { id: 'cat-lifestyle', label: 'Lifestyle', type: 'category', genreId: 6012 },
      { id: 'cat-news', label: 'News', type: 'category', genreId: 6009 },
      { id: 'cat-medical', label: 'Medical', type: 'category', genreId: 6020 },
      { id: 'cat-sports', label: 'Sports', type: 'category', genreId: 6004 },
      { id: 'cat-travel', label: 'Travel', type: 'category', genreId: 6003 },
      { id: 'cat-health', label: 'Health & Fitness', type: 'category', genreId: 6013 },
      { id: 'cat-weather', label: 'Weather', type: 'category', genreId: 6001 },
      { id: 'cat-navigation', label: 'Navigation', type: 'category', genreId: 6010 },
      { id: 'cat-shopping', label: 'Shopping', type: 'category', genreId: 6024 },
      { id: 'cat-reference', label: 'Reference', type: 'category', genreId: 6006 },
      { id: 'cat-finance', label: 'Finance', type: 'category', genreId: 6015 }
    ]
  }
];

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
    ,versionDisplay: 'Version display'
    ,show: 'Show'
    ,hide: 'Hide'
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
    ,versionDisplay: '版本号显示'
    ,show: '显示'
    ,hide: '隐藏'
  }
};

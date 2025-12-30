import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChartType, AppData, AppSettings } from './types';
import { 
  CHART_LABELS, 
  DEFAULT_INTERVAL, 
  LOCAL_STORAGE_KEYS,
  TRANSLATIONS,
  SUPPORTED_COUNTRIES,
  SIDEBAR_ITEMS,
  SidebarItem
} from './constants';
import { fetchAppStoreData, fetchDiscoverData, DiscoverSection, fetchDiscoverFromWeb, fetchDiscoverDataProgressive } from './services/appleApi';
import { RefreshIcon, SettingsIcon, MailIcon } from './components/Icons';
import AppDetails from './components/AppDetails';
import Settings from './components/Settings';

// Sidebar Icon Component Helper
const SidebarIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'Star': return <span className="mr-2">★</span>;
    case 'GameController': return <span className="mr-2">🎮</span>;
    case 'Brush': return <span className="mr-2">🎨</span>;
    case 'Briefcase': return <span className="mr-2">💼</span>;
    case 'Rocket': return <span className="mr-2">🚀</span>;
    case 'Code': return <span className="mr-2">💻</span>;
    case 'Grid': return <span className="mr-2">⊞</span>;
    default: return <span className="mr-2">•</span>;
  }
};

const FALLBACK_ICON_SVG = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><path d="M38 86V42h10l16 26 16-26h10v44H80V60l-16 26-16-26v26H38z" fill="#475569"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
})();

// 横向滚动的 App 列表组件
const SectionList = ({ 
  title, 
  apps, 
  onAppClick,
  error
}: { 
  title: string; 
  apps: AppData[]; 
  onAppClick: (appId: string) => void;
  error?: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 800; // Scroll roughly 2-3 columns
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-8" key={title}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <div className="flex items-center gap-3">
          {apps.length === 0 && error && (
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
              {error}
            </span>
          )}
          <button 
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ←
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            →
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="grid grid-rows-3 grid-flow-col gap-x-4 gap-y-3 overflow-x-auto pb-4 pt-2 px-2 snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {apps.map((app, index) => (
          <div 
            key={app.id}
            className="w-[320px] snap-start bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer flex items-center"
            onClick={() => onAppClick(app.id)}
          >
            <div className="flex items-center gap-3 relative w-full">
              <span className="text-lg font-bold text-slate-400 dark:text-slate-500 w-6 text-center flex-shrink-0">
                {app.rank}
              </span>
              <img 
                src={app.iconUrl || FALLBACK_ICON_SVG} 
                alt={app.name} 
                className="w-14 h-14 rounded-[12px] shadow-sm border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (e.currentTarget.src !== FALLBACK_ICON_SVG) {
                    console.warn(`[图片] 图标加载失败，使用占位图: id=${app.id} url=${app.iconUrl}`);
                    e.currentTarget.src = FALLBACK_ICON_SVG;
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm leading-tight mb-0.5" title={app.name}>{app.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">{app.category}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    app.price === '免费' || app.price === 'Free'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {app.price}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // ChartType 不再作为顶部 Tab，而是内部逻辑
  // const [activeChart, setActiveChart] = useState<ChartType>('top-free');
  
  // 聚合数据 State
  const [discoverData, setDiscoverData] = useState<DiscoverSection[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  // Sidebar State
  const [selectedSidebarId, setSelectedSidebarId] = useState<string>('discover');
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  // 当前选中的 Sidebar Item 的 Label，用于显示标题
  const [currentTitle, setCurrentTitle] = useState<string>('Discover');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("[设置] 解析失败，使用默认值");
      }
    }
    return {
      refreshInterval: DEFAULT_INTERVAL,
      language: 'en',
      countryCode: 'us'
    };
  });

  const lang = settings.language;
  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === settings.countryCode) || SUPPORTED_COUNTRIES[0];
  const t = TRANSLATIONS[lang];

  // 构造特定于国家和榜单和分类的缓存键
  const getCacheKey = (country: string, chart: string, genre: number | undefined) => 
    `${country}_${chart}_${genre || 'all'}`;

  const loadData = useCallback(async (force: boolean = false) => {
    const cacheKey = getCacheKey(settings.countryCode, 'discover_view', selectedGenre);
    console.log(`[Discover] 开始获取聚合数据: country=${settings.countryCode} genre=${selectedGenre}`);
    setLoading(true);
    setError(null);

    try {
      setDiscoverData([]);
      const merged = new Map<string, DiscoverSection>();

      // 1) 渐进式获取 RSS 榜单，完成一个就更新一次 UI
      const rssPromise = fetchDiscoverDataProgressive(
        settings.countryCode,
        selectedGenre,
        (section) => {
          const existing = merged.get(section.type);
          if (!existing || (existing.data.length === 0 && section.data.length > 0)) {
            merged.set(section.type, section);
            setDiscoverData(Array.from(merged.values()));
          }
        }
      );

      // 2) 同时启动网页抓取，完成后再合并
      const webPromise = fetchDiscoverFromWeb(settings.countryCode);

      const [rssRes, webRes] = await Promise.allSettled([rssPromise, webPromise]);
      const webSections = webRes.status === 'fulfilled' ? (webRes.value || []) : [];
      webSections.forEach(sec => {
        const existing = merged.get(sec.type);
        if (!existing || (existing.data.length === 0 && sec.data.length > 0)) {
          merged.set(sec.type, sec);
        }
      });
      setDiscoverData(Array.from(merged.values()));

      const rssFailed = rssRes.status === 'rejected';
      const webFailed = webRes.status === 'rejected';
      if ((rssFailed && webFailed) || (Array.from(merged.values()).length === 0)) {
        setError(t.errorNetwork);
      }
      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error(`[Discover] 获取失败:`, err);
      setError(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  }, [settings.countryCode, selectedGenre, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 定时刷新
  useEffect(() => {
    const timer = setInterval(() => loadData(), 60000 * 5); // 5分钟刷新一次
    return () => clearInterval(timer);
  }, [loadData]);

  const handleSidebarClick = (item: SidebarItem) => {
    if (item.disabled) return;
    if (item.type === 'link' && item.id === 'discover') {
      setSelectedSidebarId(item.id);
      setSelectedGenre(undefined);
      setCurrentTitle('Discover');
      return;
    }

    if (item.type === 'category' && item.genreId) {
      setSelectedSidebarId(item.id);
      setSelectedGenre(item.genreId);
      setCurrentTitle(item.label);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    });
  };

  const renderSidebarItem = (item: SidebarItem, depth = 0) => {
    const isSelected = selectedSidebarId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isDisabled = !!item.disabled;
    
    return (
      <div key={item.id} className="select-none">
        <div 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} mb-1 transition-colors
            ${isSelected 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' 
              : `${isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            ${depth > 0 ? 'ml-4' : ''}`}
          onClick={() => { if (!isDisabled) handleSidebarClick(item); }}
        >
          {item.icon && <SidebarIcon name={item.icon} />}
          <span className="truncate flex-1">{item.label}</span>
        </div>
        {hasChildren && (
          <div className="mt-1">
            {item.children!.map(child => renderSidebarItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedApp = useMemo(() => {
    if (!selectedAppId) return null;
    for (const section of discoverData) {
      const found = section.data.find(app => app.id === selectedAppId);
      if (found) return found;
    }
    return null;
  }, [selectedAppId, discoverData]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 flex-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-[10px] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 flex-shrink-0">
              M
            </div>
            <div className="flex flex-col justify-center h-11">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 leading-none mb-1">
                MacAppsMonitor
              </h1>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-none">
                {currentCountry.name[lang]}
              </span>
            </div>
            <span className="mx-2 text-slate-300 dark:text-slate-700 h-8 flex items-center">|</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{currentTitle}</span>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={() => loadData(true)} 
               disabled={loading}
               className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all ${loading ? 'animate-spin' : 'hover:rotate-180'}`}
               title={t.refresh}
             >
               <RefreshIcon />
             </button>

             <button 
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
               title={t.settings}
             >
               <SettingsIcon className="w-6 h-6" />
             </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 py-8 pl-4 pr-2 hidden md:block overflow-y-auto custom-scrollbar">
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map(item => renderSidebarItem(item))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 py-8 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                 <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => loadData(true)} className="text-red-700 dark:text-red-300 text-xs font-bold underline">{t.retry}</button>
            </div>
          )}

          {loading && discoverData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-500 font-medium animate-pulse">{t.loadingRankings}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {discoverData.length === 0 ? (
                 <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">{t.noData}</p>
                 </div>
              ) : (
                discoverData.map((section) => (
                  <div key={section.type}>
                    <SectionList 
                      title={CHART_LABELS[lang][section.type] || section.title}
                      apps={section.data}
                      onAppClick={setSelectedAppId}
                      error={section.error ? `${t.errorFetch.replace('{chart}', CHART_LABELS[lang][section.type] || section.title).replace('{country}', currentCountry.name[lang])} ${section.error}` : undefined}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/30">
                    M
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">MacAppsMonitor</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.copyright}
                </p>
              </div>
              
              <div className="flex items-center gap-6">
                <a 
                  href="mailto:apprank@outlook.com" 
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                  title={t.contact}
                >
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                    <MailIcon className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Jax</span>
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <AppDetails 
        app={selectedApp} 
        isOpen={!!selectedAppId} 
        onClose={() => setSelectedAppId(null)}
        countryCode={settings.countryCode}
      />
      
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
};

export default App;

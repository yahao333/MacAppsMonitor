
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChartType, AppRankingItem, RefreshInterval, CacheData, Language, AppSettings } from './types';
import { 
  CHART_LABELS, 
  DEFAULT_INTERVAL, 
  LOCAL_STORAGE_KEYS,
  TRANSLATIONS,
  SUPPORTED_COUNTRIES
} from './constants';
import { fetchRankings } from './services/appleApi';
import { RefreshIcon, SettingsIcon } from './components/Icons';
import AppDetails from './components/AppDetails';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [activeChart, setActiveChart] = useState<ChartType>('top-free');
  const [chartData, setChartData] = useState<Record<string, AppRankingItem[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, number | null>>({});
  
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

  // 构造特定于国家和榜单的缓存键
  const getCacheKey = (country: string, chart: ChartType) => `${country}_${chart}`;

  useEffect(() => {
    console.debug("[缓存] 加载全局排行榜缓存...");
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.CHART_CACHE);
    if (cached) {
      try {
        const parsed: Record<string, CacheData<AppRankingItem[]>> = JSON.parse(cached);
        const newData: Record<string, AppRankingItem[]> = {};
        const newTimes: Record<string, number | null> = {};
        
        Object.keys(parsed).forEach(key => {
          newData[key] = parsed[key].data;
          newTimes[key] = parsed[key].timestamp;
        });
        
        setChartData(newData);
        setLastUpdated(newTimes);
      } catch (e) {
        console.error("[缓存] 解析失败:", e);
      }
    }
  }, []);

  const loadChartData = useCallback(async (chart: ChartType, force: boolean = false) => {
    const cacheKey = getCacheKey(settings.countryCode, chart);
    const now = Date.now();
    const lastTime = lastUpdated[cacheKey];
    
    if (!force && lastTime && (now - lastTime < settings.refreshInterval.value) && chartData[cacheKey]) {
      return;
    }

    console.debug(`[榜单] 开始获取数据: ${settings.countryCode} - ${chart}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetchRankings(settings.countryCode, chart);
      const results = response?.feed?.results;
      
      if (!results) throw new Error("results_missing");
      
      setChartData(prev => ({ ...prev, [cacheKey]: results }));
      setLastUpdated(prev => ({ ...prev, [cacheKey]: now }));

      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEYS.CHART_CACHE);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      existing[cacheKey] = { timestamp: now, data: results };
      localStorage.setItem(LOCAL_STORAGE_KEYS.CHART_CACHE, JSON.stringify(existing));

    } catch (err: any) {
      console.error(`[榜单] ${settings.countryCode} ${chart} 失败:`, err);
      let msg = t.errorFetch
        .replace('{chart}', CHART_LABELS[lang][chart])
        .replace('{country}', currentCountry.name[lang]);
      if (err.message === 'results_missing') msg += t.errorFormat;
      else msg += t.errorNetwork;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [lastUpdated, chartData, settings.refreshInterval, settings.countryCode, lang, t, currentCountry]);

  useEffect(() => {
    loadChartData(activeChart);
  }, [activeChart, loadChartData]);

  useEffect(() => {
    const timer = setInterval(() => loadChartData(activeChart), 60000); 
    return () => clearInterval(timer);
  }, [activeChart, loadChartData]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    console.debug("[设置] 已更新:", newSettings);
  };

  const currentList = useMemo(() => {
    const key = getCacheKey(settings.countryCode, activeChart);
    return chartData[key] || [];
  }, [chartData, activeChart, settings.countryCode]);

  const currentUpdate = useMemo(() => {
    const key = getCacheKey(settings.countryCode, activeChart);
    return lastUpdated[key] || null;
  }, [lastUpdated, activeChart, settings.countryCode]);

  return (
    <div className="min-h-screen pb-12 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
              </svg>
            </div>
            <div className="flex flex-col">
               <h1 className="font-bold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                {t.title.split(' ')[0]} <span className="text-blue-500">{t.title.split(' ').slice(1).join(' ')}</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">
                {currentCountry.name[lang]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <div className="hidden md:flex flex-col items-end mr-2 text-[10px] text-slate-500 uppercase font-semibold">
              <span>{t.lastSync}</span>
              <span className="text-slate-900 dark:text-slate-300">
                {currentUpdate ? new Date(currentUpdate).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US') : t.never}
              </span>
            </div>
            
            <button 
              onClick={() => loadChartData(activeChart, true)}
              className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${loading ? 'animate-spin' : ''}`}
              title={t.refresh}
              disabled={loading}
            >
              <RefreshIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={t.settings}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-3 overflow-x-auto no-scrollbar">
            {(['top-free', 'top-paid'] as ChartType[]).map((chart) => (
              <button
                key={chart}
                onClick={() => setActiveChart(chart)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeChart === chart
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {CHART_LABELS[lang][chart]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => loadChartData(activeChart, true)} className="text-red-700 dark:text-red-300 text-xs font-bold underline">{t.retry}</button>
          </div>
        )}

        {loading && currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse">{t.loadingRankings}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
            {currentList.length > 0 ? (
              currentList.map((item, index) => (
                <button
                  key={`${settings.countryCode}_${item.id}`}
                  onClick={() => setSelectedAppId(item.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <span className="w-8 text-lg font-bold text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors tabular-nums">
                    {index + 1}
                  </span>
                  <img 
                    src={item.artworkUrl100} 
                    alt={item.name} 
                    className="w-12 h-12 rounded-xl shadow-sm bg-slate-100 dark:bg-slate-800 flex-none"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.artistName}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            ) : !loading && (
               <div className="py-20 text-center text-slate-500">
                  {t.noData}
               </div>
            )}
          </div>
        )}
      </main>

      <AppDetails 
        appId={selectedAppId} 
        onClose={() => setSelectedAppId(null)} 
        language={lang}
        countryCode={settings.countryCode}
      />
      
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSettingsChange={updateSettings}
      />

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400 text-xs transition-colors">
        <p>© {new Date().getFullYear()} {t.footerCredit} · {currentCountry.name[lang]}</p>
        <p className="mt-1">{t.footerProxy}</p>
      </footer>
    </div>
  );
};

export default App;

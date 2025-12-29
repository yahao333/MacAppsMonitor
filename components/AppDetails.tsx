
import React, { useState, useEffect } from 'react';
import { AppDetail, Language } from '../types';
import { fetchAppDetails } from '../services/appleApi';
import { CloseIcon, StarIcon, ExternalLinkIcon } from './Icons';
import { LOCAL_STORAGE_KEYS, TRANSLATIONS } from '../constants';

interface AppDetailsProps {
  appId: string | null;
  onClose: () => void;
  language: Language;
  countryCode: string;
}

const AppDetails: React.FC<AppDetailsProps> = ({ appId, onClose, language, countryCode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<AppDetail | null>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (!appId) {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const cacheKey = `${countryCode}_${appId}`;
        const cachedStr = localStorage.getItem(LOCAL_STORAGE_KEYS.DETAILS_CACHE);
        const cache = cachedStr ? JSON.parse(cachedStr) : {};
        
        if (cache[cacheKey]) {
          setDetails(cache[cacheKey]);
          setLoading(false);
          return;
        }

        const data = await fetchAppDetails(appId, countryCode);
        if (data) {
          setDetails(data);
          cache[cacheKey] = data;
          localStorage.setItem(LOCAL_STORAGE_KEYS.DETAILS_CACHE, JSON.stringify(cache));
        } else {
          setError(t.findError);
        }
      } catch (err) {
        console.error(`[详情] 异常:`, err);
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [appId, countryCode, t]);

  if (!appId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors z-10"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-500 font-medium">{t.loadingDetails}</p>
          </div>
        )}

        {error && (
          <div className="p-12 text-center">
            <p className="text-red-500 mb-4 font-medium">{error}</p>
            <button 
              onClick={onClose}
              className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              {t.saveAndClose.split(' ')[t.saveAndClose.split(' ').length - 1]}
            </button>
          </div>
        )}

        {details && !loading && (
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:row items-start sm:flex-row gap-6 mb-8">
              <img 
                src={details.artworkUrl512} 
                alt={details.trackName} 
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-[22.5%] shadow-xl object-cover bg-slate-200 dark:bg-slate-800 flex-none"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1 break-words">
                  {details.trackName}
                </h2>
                <p className="text-lg text-blue-500 dark:text-blue-400 font-semibold mb-3">
                  {details.sellerName}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 text-sm mb-5">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full text-slate-700 dark:text-slate-300">
                    <StarIcon className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{details.averageUserRating?.toFixed(1) || '0.0'}</span>
                    <span className="text-slate-500 text-xs">({details.userRatingCount?.toLocaleString()})</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full font-bold text-slate-700 dark:text-slate-300">
                    {details.formattedPrice}
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full font-bold text-slate-700 dark:text-slate-300">
                    {details.primaryGenreName}
                  </div>
                </div>

                <a 
                  href={details.trackViewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                >
                  {t.viewOnAppStore}
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="mb-12 overflow-hidden">
              <h3 className="text-[10px] font-bold mb-4 uppercase tracking-[0.2em] text-slate-400">{t.screenshots}</h3>
              <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 no-scrollbar">
                {details.screenshotUrls.map((url, idx) => (
                  <img 
                    key={idx} 
                    src={url} 
                    alt="screenshot" 
                    className="h-64 sm:h-96 rounded-2xl shadow-lg bg-slate-100 dark:bg-slate-800 flex-none border border-slate-200 dark:border-slate-800 transition-colors"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <h3 className="text-[10px] font-bold mb-4 uppercase tracking-[0.2em] text-slate-400">{t.description}</h3>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap text-sm sm:text-base pr-4">
                  {details.description}
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <h3 className="text-[10px] font-bold mb-6 uppercase tracking-[0.2em] text-slate-400">{t.appProfile}</h3>
                <dl className="space-y-6">
                  <div>
                    <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.version}</dt>
                    <dd className="text-sm font-bold text-slate-900 dark:text-slate-100">{details.version}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.lastUpdated}</dt>
                    <dd className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {new Date(details.currentVersionReleaseDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.genres}</dt>
                    <dd className="text-sm flex flex-wrap gap-1.5 mt-2">
                      {details.genres.map((g, i) => (
                        <span key={i} className="bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-600">{g}</span>
                      ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.supportedDevices}</dt>
                    <dd className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {details.supportedDevices.slice(0, 8).join(', ')}
                      {details.supportedDevices.length > 8 && '...'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDetails;

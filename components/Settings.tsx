
import React from 'react';
import { RefreshInterval, AppSettings, Language } from '../types';
import { REFRESH_INTERVALS, TRANSLATIONS, SUPPORTED_COUNTRIES } from '../constants';
import { CloseIcon } from './Icons';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[settings.language];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">{t.settingsTitle}</h2>
        
        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Language Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {t.language}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSettingsChange({ language: 'en' })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  settings.language === 'en'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500'
                }`}
              >
                {t.langEn}
              </button>
              <button
                onClick={() => onSettingsChange({ language: 'zh' })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  settings.language === 'zh'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500'
                }`}
              >
                {t.langZh}
              </button>
            </div>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {t.country}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORTED_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => onSettingsChange({ countryCode: country.code })}
                  className={`px-2 py-3 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1 ${
                    settings.countryCode === country.code
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500'
                  }`}
                >
                  <span className="text-lg uppercase tracking-tight">{country.code}</span>
                  <span className="opacity-80 text-[10px] truncate w-full text-center">{country.name[settings.language]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Frequency */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {t.updateFreq}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REFRESH_INTERVALS.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => onSettingsChange({ refreshInterval: interval })}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    settings.refreshInterval.value === interval.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500'
                  }`}
                >
                  {t.every} {interval.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-500 italic px-1">
              {t.autoRefreshNote}
            </p>
          </div>

          {/* App Version */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {t.appVersion}
            </label>
            <div className="px-4 py-2.5 rounded-xl text-sm font-bold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              {import.meta.env.APP_VERSION || '0.0.0'}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
             <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              {t.saveAndClose}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

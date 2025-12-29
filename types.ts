
export type ChartType = 'top-free' | 'top-paid';
export type Language = 'en' | 'zh';

export interface Country {
  code: string;
  name: {
    en: string;
    zh: string;
  };
}

export interface AppRankingItem {
  id: string;
  name: string;
  artistName: string;
  artworkUrl100: string;
  url: string;
}

export interface RankingResponse {
  feed: {
    results: AppRankingItem[];
  };
}

export interface AppDetail {
  trackId: number;
  trackName: string;
  sellerName: string;
  trackViewUrl: string;
  genres: string[];
  primaryGenreName: string;
  formattedPrice: string;
  price: number;
  averageUserRating: number;
  userRatingCount: number;
  description: string;
  features: string[];
  screenshotUrls: string[];
  supportedDevices: string[];
  version: string;
  currentVersionReleaseDate: string;
  artworkUrl512: string;
}

export interface LookupResponse {
  resultCount: number;
  results: AppDetail[];
}

export interface RefreshInterval {
  label: string;
  value: number; // in milliseconds
}

export interface CacheData<T> {
  timestamp: number;
  data: T;
}

export interface AppSettings {
  refreshInterval: RefreshInterval;
  language: Language;
  countryCode: string;
}

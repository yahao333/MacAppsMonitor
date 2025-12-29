
export type ChartType = 'top-free' | 'top-paid' | 'top-grossing' | 'new-apps' | 'new-free' | 'new-paid' | 'top-free-games' | 'top-paid-games';
export type CategoryType = ChartType; // Alias for compatibility

export interface AppData {
  id: string;
  rank: number;
  name: string;
  developer: string;
  iconUrl: string;
  category: string;
  price: string;
  appUrl: string;
  summary: string;
}

export interface Entry {
  'im:name': { label: string };
  'im:image': Array<{
    label: string;
    attributes: { height: string };
  }>;
  summary: { label: string };
  'im:price': {
    label: string;
    attributes: { amount: string; currency: string };
  };
  'im:contentType': {
    attributes: { term: string; label: string };
  };
  rights: { label: string };
  title: { label: string };
  link: Array<{
    attributes: { rel: string; type?: string; href: string; title?: string };
    'im:duration'?: { label: string };
  }> | { attributes: { rel: string; type?: string; href: string } }; // link can be array or object
  id: {
    label: string;
    attributes: { 'im:id': string; 'im:bundleId': string };
  };
  'im:artist': {
    label: string;
    attributes?: { href: string };
  };
  category: {
    attributes: {
      'im:id': string;
      term: string;
      scheme: string;
      label: string;
    };
  };
  'im:releaseDate': {
    label: string;
    attributes: { label: string };
  };
}

export interface FeedResponse {
  feed: {
    entry: Entry[];
    updated: { label: string };
    title: { label: string };
    icon: { label: string };
    link: any[];
    id: { label: string };
  }
}

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
  bundleId?: string;
  minimumOsVersion?: string;
  contentAdvisoryRating?: string;
  fileSizeBytes?: string;
  releaseDate?: string;
  artistId?: number;
  artistViewUrl?: string;
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

export type Timeframe = '1D' | '1W';

export type OrderBlockType = 'Bullish' | 'Bearish';

export type OrderBlockStatus = 'WAITING' | 'ACTIVE' | 'BELOW' | 'ABOVE' | 'INVALID';

export type AlertTypePreference = 'BOTH' | 'BULLISH_ONLY' | 'BEARISH_ONLY' | 'DISABLED';

export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlock {
  id: string;
  symbol: string;
  type: OrderBlockType;
  timeframe: Timeframe;
  high: number;
  low: number;
  meanThreshold: number;
  referenceCandleDate: string;
  referenceCandleIndex: number;
  formationPrice: number;
  marketStructureInfo: string;
  status: OrderBlockStatus;
  distancePercent: number;
  isPriceInside: boolean;
  identifiedAt: string;
}

export interface StockOverview {
  symbol: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  market: string;
  exchange: string;
  currency: string;
  currencySymbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  sector: string;
  lastUpdated: string;
}

export interface StockAnalysis {
  stock: StockOverview;
  timeframe: Timeframe;
  candles: Candle[];
  bullishOrderBlocks: OrderBlock[];
  bearishOrderBlocks: OrderBlock[];
  activeOrderBlocks: OrderBlock[];
  isInBullishOB: boolean;
  isInBearishOB: boolean;
}

export interface WatchlistStockItem {
  id: number;
  userId: number;
  symbol: string;
  stockName: string;
  country: string;
  flag: string;
  exchange: string;
  currency: string;
  currencySymbol: string;
  currentPrice: number;
  changePercent: number;
  dailyBullishOBCount: number;
  dailyBearishOBCount: number;
  weeklyBullishOBCount: number;
  weeklyBearishOBCount: number;
  hasActiveOB: boolean;
  activeOBType?: OrderBlockType;
  activeOBTimeframe?: Timeframe;
  addedAt: string;
}

export interface NotificationRecord {
  id: number;
  userId: number;
  symbol: string;
  stockName: string;
  timeframe: Timeframe;
  obType: OrderBlockType;
  obHigh: number;
  obLow: number;
  currentPrice: number;
  currencySymbol: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: number;
  alertTypePreference: AlertTypePreference;
  dailyAlertsEnabled: boolean;
  weeklyAlertsEnabled: boolean;
  appNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  emailAddress: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isOwner: boolean;
  createdAt: string;
}

export interface SentEmailLog {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
  symbol: string;
}

export interface MarketInfo {
  name: string;
  code: string;
  flag: string;
  exchange?: string;
  currency?: string;
  count?: number;
}

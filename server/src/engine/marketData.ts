import { Candle, StockOverview, Timeframe } from '../types/index.js';
import { aggregateToWeekly } from './orderBlockDetector.js';
import {
  fetchLiveYahooCandles,
  getLiveCachedOverview,
  warmUpYahooFinanceCache,
  getCurrencySymbol,
  YAHOO_TICKER_MAP
} from './yahooFinanceEngine.js';

export interface StockMeta {
  symbol: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  market: string;
  exchange: string;
  currency: string;
  currencySymbol: string;
  basePrice: number;
  sector: string;
}

export const GLOBAL_STOCK_UNIVERSE: StockMeta[] = [
  // 🇮🇳 BENCHMARK & SECTORAL INDICES
  {
    symbol: 'NIFTY50',
    name: 'Nifty 50 Benchmark Index',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 23950.00,
    sector: 'Benchmark Index'
  },
  {
    symbol: 'BANKNIFTY',
    name: 'Nifty Bank Index',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 51200.00,
    sector: 'Banking Index'
  },
  {
    symbol: 'SENSEX',
    name: 'BSE S&P Sensex Index',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'Bombay Stock Exchange',
    exchange: 'BSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 78500.00,
    sector: 'Benchmark Index'
  },
  {
    symbol: 'FINNIFTY',
    name: 'Nifty Financial Services Index',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 23800.00,
    sector: 'Finance Index'
  },
  {
    symbol: 'MIDCPNIFTY',
    name: 'Nifty Midcap Select Index',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 12400.00,
    sector: 'Midcap Index'
  },

  // 🇮🇳 NIFTY 50 & LARGE CAP GIANTS
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1310.00,
    sector: 'Energy & Conglomerate'
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2345.00,
    sector: 'Information Technology'
  },
  {
    symbol: 'INFY',
    name: 'Infosys Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1135.00,
    sector: 'Information Technology'
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 708.00,
    sector: 'Banking'
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1440.00,
    sector: 'Banking'
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1030.00,
    sector: 'PSU Banking'
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1862.00,
    sector: 'Telecommunications'
  },
  {
    symbol: 'ITC',
    name: 'ITC Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 265.00,
    sector: 'FMCG'
  },
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 182.00,
    sector: 'Metals & Mining'
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4000.00,
    sector: 'Capital Goods & Infrastructure'
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 177.00,
    sector: 'Information Technology'
  },
  {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 12860.00,
    sector: 'Automobile'
  },
  {
    symbol: 'M&M',
    name: 'Mahindra & Mahindra Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 3178.00,
    sector: 'Automobile'
  },
  {
    symbol: 'BAJAJ-AUTO',
    name: 'Bajaj Auto Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 9450.00,
    sector: 'Automobile'
  },
  {
    symbol: 'HEROMOTOCO',
    name: 'Hero MotoCorp Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4850.00,
    sector: 'Automobile'
  },
  {
    symbol: 'EICHERMOT',
    name: 'Eicher Motors Ltd (Royal Enfield)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4950.00,
    sector: 'Automobile'
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1048.00,
    sector: 'Finance & NBFC'
  },
  {
    symbol: 'BAJAJFINSV',
    name: 'Bajaj Finserv Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1970.00,
    sector: 'Finance & NBFC'
  },
  {
    symbol: 'ASIANPAINT',
    name: 'Asian Paints Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2520.00,
    sector: 'Paints & Consumer'
  },
  {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1966.00,
    sector: 'FMCG'
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 423.00,
    sector: 'Banking'
  },
  {
    symbol: 'AXISBANK',
    name: 'Axis Bank Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1272.00,
    sector: 'Banking'
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1918.00,
    sector: 'Pharmaceuticals'
  },
  {
    symbol: 'DRREDDY',
    name: 'Dr. Reddy Laboratories Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1260.00,
    sector: 'Pharmaceuticals'
  },
  {
    symbol: 'CIPLA',
    name: 'Cipla Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1510.00,
    sector: 'Pharmaceuticals'
  },
  {
    symbol: 'DIVISLAB',
    name: 'Divi Laboratories Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 5850.00,
    sector: 'Pharmaceuticals'
  },
  {
    symbol: 'APOLLOHOSP',
    name: 'Apollo Hospitals Enterprise Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 7120.00,
    sector: 'Healthcare'
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 5004.00,
    sector: 'Consumer Goods & Luxury'
  },
  {
    symbol: 'TRENT',
    name: 'Trent Limited (Westside/Zudio)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2860.00,
    sector: 'Retail'
  },
  {
    symbol: 'ULTRACEMCO',
    name: 'UltraTech Cement Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 11340.00,
    sector: 'Cement'
  },
  {
    symbol: 'NESTLEIND',
    name: 'Nestle India Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2240.00,
    sector: 'FMCG'
  },
  {
    symbol: 'BRITANNIA',
    name: 'Britannia Industries Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4890.00,
    sector: 'FMCG'
  },
  {
    symbol: 'TATACONSUM',
    name: 'Tata Consumer Products Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1021.00,
    sector: 'FMCG'
  },
  {
    symbol: 'POWERGRID',
    name: 'Power Grid Corporation of India',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 268.00,
    sector: 'Power Utilities'
  },
  {
    symbol: 'NTPC',
    name: 'NTPC Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 331.00,
    sector: 'Power Utilities'
  },
  {
    symbol: 'ONGC',
    name: 'Oil & Natural Gas Corporation',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 235.00,
    sector: 'Oil & Gas'
  },
  {
    symbol: 'COALINDIA',
    name: 'Coal India Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 420.00,
    sector: 'Energy & Mining'
  },
  {
    symbol: 'BPCL',
    name: 'Bharat Petroleum Corp Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 305.00,
    sector: 'Oil & Gas'
  },
  {
    symbol: 'JSWSTEEL',
    name: 'JSW Steel Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1300.00,
    sector: 'Metals & Mining'
  },
  {
    symbol: 'HINDALCO',
    name: 'Hindalco Industries Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 660.00,
    sector: 'Metals & Mining'
  },
  {
    symbol: 'GRASIM',
    name: 'Grasim Industries Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2540.00,
    sector: 'Diversified Conglomerate'
  },
  {
    symbol: 'TECHM',
    name: 'Tech Mahindra Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1680.00,
    sector: 'Information Technology'
  },
  {
    symbol: 'HCLTECH',
    name: 'HCL Technologies Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1318.00,
    sector: 'Information Technology'
  },
  {
    symbol: 'INDUSINDBK',
    name: 'IndusInd Bank Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1010.00,
    sector: 'Banking'
  },
  {
    symbol: 'SBILIFE',
    name: 'SBI Life Insurance Co Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1560.00,
    sector: 'Insurance'
  },
  {
    symbol: 'HDFCLIFE',
    name: 'HDFC Life Insurance Co Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 635.00,
    sector: 'Insurance'
  },
  {
    symbol: 'SHRIRAMFIN',
    name: 'Shriram Finance Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 3200.00,
    sector: 'Finance & NBFC'
  },

  // 🇮🇳 DEFENSE & AEROSPACE TITANS
  {
    symbol: 'HAL',
    name: 'Hindustan Aeronautics Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4790.00,
    sector: 'Defense & Aerospace'
  },
  {
    symbol: 'BEL',
    name: 'Bharat Electronics Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 409.00,
    sector: 'Defense & Aerospace'
  },
  {
    symbol: 'MAZDOCK',
    name: 'Mazagon Dock Shipbuilders Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2482.00,
    sector: 'Defense & Shipbuilders'
  },
  {
    symbol: 'COCHINSHIP',
    name: 'Cochin Shipyard Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1420.00,
    sector: 'Defense & Shipbuilders'
  },
  {
    symbol: 'GRSE',
    name: 'Garden Reach Shipbuilders Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1750.00,
    sector: 'Defense & Shipbuilders'
  },
  {
    symbol: 'BDL',
    name: 'Bharat Dynamics Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1120.00,
    sector: 'Defense & Missiles'
  },

  // 🇮🇳 RAILWAY & INFRASTRUCTURE TITANS
  {
    symbol: 'IRFC',
    name: 'Indian Railway Finance Corp Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 83.00,
    sector: 'Railway & PSU'
  },
  {
    symbol: 'RVNL',
    name: 'Rail Vikas Nigam Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 209.00,
    sector: 'Railway & PSU'
  },
  {
    symbol: 'IRCTC',
    name: 'Indian Railway Catering & Tourism',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 810.00,
    sector: 'Railway & Tourism'
  },
  {
    symbol: 'RAILTEL',
    name: 'RailTel Corporation of India',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 380.00,
    sector: 'Railway & Telecom'
  },
  {
    symbol: 'TITAGARH',
    name: 'Titagarh Rail Systems Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1180.00,
    sector: 'Railway & Wagons'
  },

  // 🇮🇳 HIGH MOMENTUM MID & SMALL CAP LEADERS
  {
    symbol: 'SUZLON',
    name: 'Suzlon Energy Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 46.17,
    sector: 'Renewable Energy & Wind'
  },
  {
    symbol: 'IREDA',
    name: 'Indian Renewable Energy Dev Agency',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 113.20,
    sector: 'Green Energy & Finance'
  },
  {
    symbol: 'TATAPOWER',
    name: 'Tata Power Company Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 368.00,
    sector: 'Power & EV Infra'
  },
  {
    symbol: 'BHEL',
    name: 'Bharat Heavy Electricals Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 428.00,
    sector: 'Heavy Engineering & Power'
  },
  {
    symbol: 'SAIL',
    name: 'Steel Authority of India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 118.00,
    sector: 'Metals & Mining'
  },
  {
    symbol: 'HUDCO',
    name: 'Housing & Urban Dev Corp Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 215.00,
    sector: 'Housing Finance & PSU'
  },
  {
    symbol: 'NBCC',
    name: 'NBCC (India) Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 98.00,
    sector: 'Construction & PSU'
  },
  {
    symbol: 'YESBANK',
    name: 'Yes Bank Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 22.36,
    sector: 'Banking'
  },
  {
    symbol: 'IDEA',
    name: 'Vodafone Idea Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 7.80,
    sector: 'Telecommunications'
  },
  {
    symbol: 'GTLINFRA',
    name: 'GTL Infrastructure Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 2.30,
    sector: 'Telecom Infra'
  },
  {
    symbol: 'NHPC',
    name: 'NHPC Limited (Hydro Power)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 85.00,
    sector: 'Hydro Power & Green Energy'
  },
  {
    symbol: 'SJVN',
    name: 'SJVN Limited (Hydro Power)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 108.00,
    sector: 'Power Utilities'
  },
  {
    symbol: 'POLYCAB',
    name: 'Polycab India Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 6200.00,
    sector: 'Wires & Cables'
  },
  {
    symbol: 'KALYANKJIL',
    name: 'Kalyan Jewellers India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 680.00,
    sector: 'Jewellery & Retail'
  },
  {
    symbol: 'VBL',
    name: 'Varun Beverages Limited (PepsiCo)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 410.00,
    sector: 'Beverages & FMCG'
  },
  {
    symbol: 'DMART',
    name: 'Avenue Supermarts Ltd (DMart)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 3780.00,
    sector: 'Retail Supermarket'
  },

  // 🇮🇳 NEW-AGE INTERNET & FINTECH
  {
    symbol: 'ZOMATO',
    name: 'Zomato Limited (Blinkit)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'Bombay Stock Exchange / NSE',
    exchange: 'BSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 254.00,
    sector: 'Food Delivery & Quick Commerce'
  },
  {
    symbol: 'SWIGGY',
    name: 'Swiggy Limited (Instamart)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 264.00,
    sector: 'Food Delivery & Quick Commerce'
  },
  {
    symbol: 'PAYTM',
    name: 'One97 Communications (Paytm)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1628.00,
    sector: 'Fintech & Payments'
  },
  {
    symbol: 'JIOFIN',
    name: 'Jio Financial Services Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 238.00,
    sector: 'Fintech & NBFC'
  },

  // 🚀 FUTURE GROWTH POTENTIAL & MULTIBAGGERS (User TradingView Watchlist)
  {
    symbol: 'C2C',
    name: 'C2C Advanced Systems Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 221.00,
    sector: 'Future Growth & Defense AI'
  },
  {
    symbol: 'E2E',
    name: 'E2E Networks Ltd (AI Cloud)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 599.75,
    sector: 'Future Growth & AI Cloud'
  },
  {
    symbol: 'UNIMECH',
    name: 'Unimech Aerospace & Mfg Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1467.30,
    sector: 'Future Growth & Aerospace'
  },
  {
    symbol: 'CFF',
    name: 'CFF Fluid Control Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'Bombay Stock Exchange',
    exchange: 'BSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1001.45,
    sector: 'Future Growth & Defense Submarine'
  },
  {
    symbol: 'BLUESTARCO',
    name: 'Blue Star Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1489.70,
    sector: 'Future Growth & Appliances'
  },
  {
    symbol: 'ANANTRAJ',
    name: 'Anant Raj Ltd (Data Centers)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 637.50,
    sector: 'Future Growth & Data Centers'
  },
  {
    symbol: 'ASTRAMICRO',
    name: 'Astra Microwave Products Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1678.50,
    sector: 'Future Growth & Radar Satellites'
  },
  {
    symbol: 'HFCL',
    name: 'HFCL Limited (5G & Optics)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 222.00,
    sector: 'Future Growth & 5G Telecom'
  },
  {
    symbol: 'DCXINDIA',
    name: 'DCX Systems Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 171.82,
    sector: 'Future Growth & Defense Cables'
  },
  {
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 3532.00,
    sector: 'Future Growth & Semiconductors'
  },
  {
    symbol: 'CGPOWER',
    name: 'CG Power & Industrial Solutions',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 889.00,
    sector: 'Future Growth & Power Transformers'
  },
  {
    symbol: 'MARINE',
    name: 'Marine Electricals (India) Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 436.30,
    sector: 'Future Growth & Navy Electricals'
  },
  {
    symbol: 'ORIENTTECH',
    name: 'Orient Technologies Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 239.62,
    sector: 'Future Growth & Cloud Solutions'
  },
  {
    symbol: 'ANURAS',
    name: 'Anupam Rasayan India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1239.60,
    sector: 'Future Growth & Specialty Chemicals'
  },
  {
    symbol: 'DATAPATTNS',
    name: 'Data Patterns (India) Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4616.50,
    sector: 'Future Growth & Defense Radar'
  },
  {
    symbol: 'ABB',
    name: 'ABB India Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 7426.00,
    sector: 'Future Growth & Robotics'
  },
  {
    symbol: 'SOLARINDS',
    name: 'Solar Industries India Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 21455.00,
    sector: 'Future Growth & Defense Drones'
  },
  {
    symbol: 'NETWEB',
    name: 'Netweb Technologies India Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 5356.50,
    sector: 'Future Growth & AI Supercomputers'
  },
  {
    symbol: 'TATACHEM',
    name: 'Tata Chemicals Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 636.00,
    sector: 'Future Growth & Chemicals'
  },
  {
    symbol: 'SIEMENS',
    name: 'Siemens Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4071.20,
    sector: 'Future Growth & Energy Automation'
  },
  {
    symbol: 'FLUOROCHEM',
    name: 'Gujarat Fluorochemicals Ltd',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 4750.00,
    sector: 'Future Growth & EV Battery Chem'
  },
  {
    symbol: 'BBOX',
    name: 'Black Box Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 731.50,
    sector: 'Future Growth & IT Networking'
  },
  {
    symbol: 'TEJASNET',
    name: 'Tejas Networks Ltd (Tata)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 575.00,
    sector: 'Future Growth & 5G Telecom'
  },
  {
    symbol: 'ZENTEC',
    name: 'Zen Technologies Ltd (Drones)',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 1835.10,
    sector: 'Future Growth & Anti-Drone Systems'
  },
  {
    symbol: 'APSISAERO',
    name: 'Apsis Aerocom Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 587.60,
    sector: 'Future Growth & Aerospace'
  },
  {
    symbol: 'CENTUM',
    name: 'Centum Electronics Limited',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 3723.00,
    sector: 'Future Growth & Space Electronics'
  }
];

// In-memory candle cache and live prices
const candleCache = new Map<string, Candle[]>();
const livePrices = new Map<string, number>();

// Price overrides for testing alerts
const priceOverrides = new Map<string, number>();

/**
 * Generates realistic institutional historical OHLCV daily data
 */
function generateHistoricalCandles(meta: StockMeta, numDays: number = 220): Candle[] {
  const candles: Candle[] = [];
  const now = new Date();
  
  let currentPrice = meta.basePrice * 0.86;
  const volatility = 0.014;

  const days: Date[] = [];
  for (let i = numDays; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Skip weekends
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d);
    }
  }

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const dateStr = d.toISOString().split('T')[0];

    const wave1 = Math.sin(i / 14) * 0.018;
    const wave2 = Math.cos(i / 6) * 0.011;
    const randomNoise = (Math.random() - 0.49) * volatility;
    
    // Inject institutional expansion impulse (displacement candle)
    let impulse = 0;
    if (i % 21 === 0) {
      impulse = 0.034; // Bullish displacement
    } else if (i % 33 === 0) {
      impulse = -0.031; // Bearish displacement
    }

    const dailyReturn = wave1 + wave2 + randomNoise + impulse;
    const open = currentPrice;
    let close = open * (1 + dailyReturn);

    // Guide the price to converge to basePrice near the current date
    if (i > days.length - 12) {
      const targetDiff = (meta.basePrice - close) * 0.22;
      close += targetDiff;
    }

    const high = Math.max(open, close) * (1 + Math.random() * 0.007 + 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.007 - 0.002);
    const volume = Math.floor(600000 + Math.random() * 2500000 + (Math.abs(dailyReturn) > 0.02 ? 2000000 : 0));

    candles.push({
      time: dateStr,
      timestamp: d.getTime(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Initialize candle data for all Indian stocks & warm up live Yahoo Finance feeds
 */
export function initMarketData(): void {
  for (const meta of GLOBAL_STOCK_UNIVERSE) {
    const candles = generateHistoricalCandles(meta, 220);
    candleCache.set(meta.symbol, candles);
    const latestClose = candles[candles.length - 1].close;
    livePrices.set(meta.symbol, latestClose);
  }

  // Asynchronously synchronize live real-time candles from Yahoo Finance
  warmUpYahooFinanceCache(GLOBAL_STOCK_UNIVERSE.map(s => s.symbol)).then(() => {
    for (const meta of GLOBAL_STOCK_UNIVERSE) {
      const live = getLiveCachedOverview(meta.symbol);
      if (live && live.candles.length > 0) {
        candleCache.set(meta.symbol, live.candles);
        livePrices.set(meta.symbol, live.livePrice ?? live.candles[live.candles.length - 1].close);
      }
    }
  }).catch(e => console.warn('Yahoo Finance warmup note:', e));
}

/**
 * Finds or synthesizes stock metadata for any Indian stock (NSE/BSE)
 */
export function findStockMeta(symbol: string): StockMeta {
  const sym = symbol.toUpperCase().trim();
  const existing = GLOBAL_STOCK_UNIVERSE.find(s => s.symbol === sym);
  if (existing) return existing;

  const live = getLiveCachedOverview(sym);

  // Fallback for custom Indian stock search
  return {
    symbol: sym,
    name: live?.longName || `${sym} Limited`,
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    market: 'National Stock Exchange of India',
    exchange: 'NSE',
    currency: 'INR',
    currencySymbol: '₹',
    basePrice: 150.00,
    sector: 'Indian Equities'
  };
}

/**
 * Get stock overview with live real-time market data
 */
export function getStockOverview(symbol: string): StockOverview {
  const meta = findStockMeta(symbol);
  const sym = meta.symbol;

  const live = getLiveCachedOverview(sym);
  if (live && live.candles.length > 0) {
    const currentPrice = priceOverrides.get(sym) ?? (live.livePrice ?? live.candles[live.candles.length - 1].close);
    const previousClose = live.previousClose ?? (live.candles.length > 1 ? live.candles[live.candles.length - 2].close : currentPrice);
    const change = priceOverrides.has(sym)
      ? Number((currentPrice - previousClose).toFixed(2))
      : (live.change ?? Number((currentPrice - previousClose).toFixed(2)));
    const changePercent = priceOverrides.has(sym)
      ? Number(((change / previousClose) * 100).toFixed(2))
      : (live.changePercent ?? Number(((change / previousClose) * 100).toFixed(2)));

    const currency = live.currency || meta.currency;
    const currencySymbol = live.currencySymbol || meta.currencySymbol;
    const isIndia = currency === 'INR';

    return {
      symbol: meta.symbol,
      name: live.longName || meta.name,
      country: isIndia ? 'India' : meta.country,
      countryCode: isIndia ? 'IN' : meta.countryCode,
      flag: isIndia ? '🇮🇳' : meta.flag,
      market: isIndia ? 'National Stock Exchange of India' : meta.market,
      exchange: isIndia ? 'NSE' : meta.exchange,
      currency: currency,
      currencySymbol: currencySymbol,
      currentPrice: Number(currentPrice.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      high24h: Number((live.high24h ?? currentPrice).toFixed(2)),
      low24h: Number((live.low24h ?? currentPrice).toFixed(2)),
      volume24h: live.volume24h ?? 1000000,
      sector: meta.sector,
      lastUpdated: new Date().toISOString()
    };
  }

  // Trigger non-blocking live refresh
  fetchLiveYahooCandles(sym).then(candles => {
    if (candles && candles.length > 0) {
      candleCache.set(sym, candles);
    }
    const l = getLiveCachedOverview(sym);
    if (l?.livePrice) livePrices.set(sym, l.livePrice);
  }).catch(() => {});

  let candles = candleCache.get(sym);
  if (!candles || candles.length === 0) {
    candles = generateHistoricalCandles(meta, 220);
    candleCache.set(sym, candles);
  }

  const fallbackPrice = meta.basePrice || 100;
  const lastCandle = candles[candles.length - 1] || { 
    close: fallbackPrice, 
    high: fallbackPrice, 
    low: fallbackPrice, 
    open: fallbackPrice, 
    volume: 1000000,
    time: new Date().toISOString().split('T')[0],
    timestamp: Date.now()
  };
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

  const currentPrice = priceOverrides.get(sym) ?? (livePrices.get(sym) ?? lastCandle.close);
  const previousClose = prevCandle.close || fallbackPrice;
  const change = Number((currentPrice - previousClose).toFixed(2));
  const changePercent = Number(((change / previousClose) * 100).toFixed(2));

  return {
    symbol: meta.symbol,
    name: meta.name,
    country: meta.country,
    countryCode: meta.countryCode,
    flag: meta.flag,
    market: meta.market,
    exchange: meta.exchange,
    currency: meta.currency,
    currencySymbol: meta.currencySymbol,
    currentPrice: Number(currentPrice.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    change,
    changePercent,
    high24h: Number(Math.max(lastCandle.high, currentPrice).toFixed(2)),
    low24h: Number(Math.min(lastCandle.low, currentPrice).toFixed(2)),
    volume24h: lastCandle.volume,
    sector: meta.sector,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Indian stock search with sector & market segment filtering
 */
export function searchStocks(query: string, categoryFilter?: string): StockOverview[] {
  let list = GLOBAL_STOCK_UNIVERSE;

  if (categoryFilter && categoryFilter !== 'ALL') {
    const filterLower = categoryFilter.toLowerCase();
    list = list.filter(s => 
      s.sector.toLowerCase().includes(filterLower) || 
      (filterLower === 'growth' && (s.sector.toLowerCase().includes('future') || s.sector.toLowerCase().includes('growth'))) ||
      (filterLower === 'largecap' && ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'MARUTI', 'M&M', 'BAJFINANCE', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'NTPC', 'POWERGRID', 'ONGC', 'COALINDIA', 'HCLTECH', 'ADANIENT', 'ADANIPORTS'].includes(s.symbol)) ||
      (filterLower === 'midcap' && ['SUZLON', 'IREDA', 'YESBANK', 'MAZDOCK', 'COCHINSHIP', 'BHEL', 'HUDCO', 'NBCC', 'CDSL', 'BSE', 'ZOMATO', 'SWIGGY', 'PAYTM', 'IRFC', 'RVNL', 'TATAPOWER', 'VBL', 'DMART'].includes(s.symbol)) ||
      (filterLower === 'defense' && (s.sector.toLowerCase().includes('defense') || s.sector.toLowerCase().includes('shipbuilder') || s.sector.toLowerCase().includes('missile') || ['HAL', 'BEL', 'MAZDOCK', 'COCHINSHIP', 'GRSE', 'BDL', 'ZENTEC', 'DATAPATTNS', 'ASTRAMICRO', 'DCXINDIA', 'SOLARINDS', 'UNIMECH', 'CFF'].includes(s.symbol))) ||
      (filterLower === 'railway' && s.sector.toLowerCase().includes('railway')) ||
      (filterLower === 'banking' && (s.sector.toLowerCase().includes('bank') || s.sector.toLowerCase().includes('finance') || s.sector.toLowerCase().includes('nbfc'))) ||
      (filterLower === 'power' && (s.sector.toLowerCase().includes('power') || s.sector.toLowerCase().includes('energy') || s.sector.toLowerCase().includes('wind') || s.sector.toLowerCase().includes('solar'))) ||
      (filterLower === 'it' && (s.sector.toLowerCase().includes('technology') || s.sector.toLowerCase().includes('software') || s.sector.toLowerCase().includes('ai') || s.sector.toLowerCase().includes('cloud'))) ||
      (filterLower === 'auto' && s.sector.toLowerCase().includes('auto')) ||
      (filterLower === 'pharma' && (s.sector.toLowerCase().includes('pharma') || s.sector.toLowerCase().includes('health'))) ||
      (filterLower === 'fmcg' && (s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('retail') || s.sector.toLowerCase().includes('food') || s.sector.toLowerCase().includes('beverage')))
    );
  }

  if (!query || !query.trim()) {
    return list.map(s => getStockOverview(s.symbol));
  }

  const q = query.trim().toUpperCase();
  const matches = list.filter(
    s => s.symbol.toUpperCase().includes(q) ||
         s.name.toUpperCase().includes(q) ||
         s.exchange.toUpperCase().includes(q) ||
         s.sector.toUpperCase().includes(q)
  );

  if (matches.length === 0 && (!categoryFilter || categoryFilter === 'ALL') && !q.includes(' ')) {
    // If not in pre-defined universe, allow direct single ticker lookup
    return [getStockOverview(q)];
  }

  return matches.map(s => getStockOverview(s.symbol));
}

/**
 * Asynchronously searches the entire universe + dynamic real-time Yahoo search across all 5,000+ Indian NSE & BSE stocks
 */
export async function searchStocksAsync(query: string, categoryFilter?: string): Promise<StockOverview[]> {
  const localResults = searchStocks(query, categoryFilter);

  if (!query || !query.trim() || (categoryFilter && categoryFilter !== 'ALL')) {
    return localResults;
  }

  const q = query.trim();
  const seen = new Set(localResults.map(s => s.symbol.toUpperCase()));

  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data: any = await res.json();
      const quotes = data.quotes || [];
      const indianQuotes = quotes.filter((item: any) => 
        item.symbol && 
        (item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO') || item.symbol.includes('-SM.NS'))
      );

      for (const item of indianQuotes) {
        let cleanSymbol = item.symbol.replace(/\.NS$/, '').replace(/\.BO$/, '');
        if (cleanSymbol.endsWith('-SM')) {
          cleanSymbol = cleanSymbol.replace(/-SM$/, '');
        }
        const symUpper = cleanSymbol.toUpperCase();

        if (!seen.has(symUpper)) {
          seen.add(symUpper);
          // Register ticker in map if special
          YAHOO_TICKER_MAP[symUpper] = item.symbol;
          try {
            const ov = await fetchStockOverviewAsync(symUpper);
            if (ov && ov.currentPrice > 0) {
              if (item.shortname || item.longname) {
                ov.name = item.shortname || item.longname;
              }
              localResults.push(ov);
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  return localResults;
}

/**
 * Get candles for Daily (1D) or Weekly (1W) timeframe using real live data
 */
export function getStockCandles(symbol: string, timeframe: Timeframe = '1D'): Candle[] {
  const meta = findStockMeta(symbol);
  const sym = meta.symbol;

  const live = getLiveCachedOverview(sym);
  let dailyCandles = (live && live.candles.length > 0)
    ? live.candles
    : (candleCache.get(sym) || []);

  if (!dailyCandles || dailyCandles.length === 0) {
    dailyCandles = generateHistoricalCandles(meta, 220);
    candleCache.set(sym, dailyCandles);
  }

  if (timeframe === '1W') {
    return aggregateToWeekly(dailyCandles);
  }

  return dailyCandles;
}

/**
 * Asynchronously fetch freshest live stock overview from Yahoo Finance
 */
export async function fetchStockOverviewAsync(symbol: string): Promise<StockOverview> {
  const meta = findStockMeta(symbol);
  const sym = meta.symbol;
  try {
    await fetchLiveYahooCandles(sym);
  } catch (e) {}
  return getStockOverview(sym);
}

/**
 * Asynchronously fetch freshest live candles from Yahoo Finance
 */
export async function fetchStockCandlesAsync(symbol: string, timeframe: Timeframe = '1D'): Promise<Candle[]> {
  const meta = findStockMeta(symbol);
  const sym = meta.symbol;
  try {
    await fetchLiveYahooCandles(sym);
  } catch (e) {}
  return getStockCandles(sym, timeframe);
}

/**
 * Updates live price (simulates small market ticks)
 */
export function tickLivePrice(symbol: string): number {
  const sym = symbol.toUpperCase();
  const current = livePrices.get(sym) || 100;
  const deltaPercent = (Math.random() - 0.5) * 0.003;
  const nextPrice = Number((current * (1 + deltaPercent)).toFixed(2));
  livePrices.set(sym, nextPrice);
  return nextPrice;
}

/**
 * Override price for manual alert testing
 */
export function setPriceOverride(symbol: string, price: number | null): void {
  const sym = symbol.toUpperCase();
  if (price === null) {
    priceOverrides.delete(sym);
  } else {
    priceOverrides.set(sym, price);
  }
}

// src/modules/polymarket/types/data.types.ts

// ============================================
// Data API Response Types
// Base URL: https://data-api.polymarket.com
// ============================================

// ========================================
// Enums
// ========================================

export type LeaderboardCategory =
  | 'OVERALL'
  | 'POLITICS'
  | 'SPORTS'
  | 'CRYPTO'
  | 'CULTURE'
  | 'MENTIONS'
  | 'WEATHER'
  | 'ECONOMICS'
  | 'TECH'
  | 'FINANCE';

export type LeaderboardTimePeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';

export type LeaderboardOrderBy = 'PNL' | 'VOL';

export type TradeSide = 'BUY' | 'SELL';

export type ActivityType =
  | 'TRADE'
  | 'SPLIT'
  | 'MERGE'
  | 'REDEEM'
  | 'REWARD'
  | 'CONVERSION'
  | 'MAKER_REBATE';

export type PositionSortBy =
  | 'CURRENT'
  | 'INITIAL'
  | 'TOKENS'
  | 'CASHPNL'
  | 'PERCENTPNL'
  | 'TITLE'
  | 'RESOLVING'
  | 'PRICE'
  | 'AVGPRICE';

export type SortDirection = 'ASC' | 'DESC';

export type TradeFilterType = 'CASH' | 'TOKENS';

export type ActivitySortBy = 'TIMESTAMP' | 'TOKENS' | 'CASH';

// ========================================
// GET /v1/leaderboard
// ========================================

export interface LeaderboardParams {
  category?: LeaderboardCategory;
  timePeriod?: LeaderboardTimePeriod;
  orderBy?: LeaderboardOrderBy;
  limit?: number;    // 1-50, default 25
  offset?: number;   // 0-1000, default 0
  user?: string;     // Filter by user address
  userName?: string; // Filter by username
}

export interface LeaderboardEntry {
  rank: string;
  proxyWallet: string;  // 0x-prefixed address
  userName?: string;
  vol: number;          // Trading volume
  pnl: number;          // Profit and loss
  profileImage?: string;
  xUsername?: string;   // X (Twitter) username
  verifiedBadge?: boolean;
}

// ========================================
// GET /positions
// ========================================

export interface PositionsParams {
  user: string;              // Required: User address
  market?: string[];         // Condition IDs (mutually exclusive with eventId)
  eventId?: number[];        // Event IDs (mutually exclusive with market)
  sizeThreshold?: number;    // Default 1
  redeemable?: boolean;      // Default false
  mergeable?: boolean;       // Default false
  limit?: number;            // 0-500, default 100
  offset?: number;           // 0-10000, default 0
  sortBy?: PositionSortBy;   // Default 'TOKENS'
  sortDirection?: SortDirection; // Default 'DESC'
  title?: string;            // Max 100 chars
}

export interface PositionEntry {
  proxyWallet: string;       // User address
  asset: string;
  conditionId: string;       // 0x-prefixed 64-hex string
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon?: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome?: string;
  oppositeAsset?: string;
  endDate?: string;
  negativeRisk?: boolean;
}

// ========================================
// GET /trades
// ========================================

export interface TradesParams {
  limit?: number;            // 0-10000, default 100
  offset?: number;           // 0-10000, default 0
  takerOnly?: boolean;       // Default true
  filterType?: TradeFilterType;
  filterAmount?: number;     // Must be provided with filterType
  market?: string[];         // Condition IDs (mutually exclusive with eventId)
  eventId?: number[];        // Event IDs (mutually exclusive with market)
  user?: string;             // User address
  side?: TradeSide;
}

export interface TradeEntry {
  proxyWallet: string;       // User address
  side: TradeSide;
  asset: string;
  conditionId: string;       // 0x-prefixed 64-hex string
  size: number;
  price: number;
  timestamp: number;         // Unix timestamp (int64)
  title?: string;
  slug?: string;
  icon?: string;
  eventSlug?: string;
  outcome?: string;
  outcomeIndex?: number;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  transactionHash?: string;
}

// ========================================
// GET /activity
// ========================================

export interface ActivityParams {
  user: string;              // Required: User address
  limit?: number;            // 0-500, default 100
  offset?: number;           // 0-10000, default 0
  market?: string[];         // Condition IDs (mutually exclusive with eventId)
  eventId?: number[];        // Event IDs (mutually exclusive with market)
  type?: ActivityType[];
  start?: number;            // Unix timestamp
  end?: number;              // Unix timestamp
  sortBy?: ActivitySortBy;   // Default 'TIMESTAMP'
  sortDirection?: SortDirection; // Default 'DESC'
  side?: TradeSide;
}

export interface ActivityEntry {
  proxyWallet: string;       // User address
  timestamp: number;         // Unix timestamp (int64)
  conditionId: string;       // 0x-prefixed 64-hex string
  type: ActivityType;
  size: number;
  usdcSize: number;
  transactionHash?: string;
  price?: number;
  asset?: string;
  side?: TradeSide;
  outcomeIndex?: number;
  title?: string;
  slug?: string;
  icon?: string;
  eventSlug?: string;
  outcome?: string;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
}

// ========================================
// Legacy types (for backward compatibility)
// ========================================

/** @deprecated Use LeaderboardEntry instead */
export interface DataAPILeaderboardEntry {
  user_address: string;
  rank: number;
  total_pnl: string;
  total_volume: string;
  markets_traded: number;
  win_rate: number;
  avg_position_size: string;
}

/** @deprecated Use PositionEntry instead */
export interface DataAPIPosition {
  market_id: string;
  asset_id: string;
  user_address: string;
  size: string;
  entry_price: string;
  current_price: string;
  pnl: string;
  updated_at: string;
}

/** @deprecated Market activity is computed from trades */
export interface DataAPIMarketActivity {
  market_id: string;
  volume_24h: string;
  trades_24h: number;
  unique_traders_24h: number;
  price_change_24h: string;
}

// ========================================
// WebSocket / RTDS Types (if needed)
// ========================================

export interface RTDSMessage {
  topic: string;
  type: string;
  timestamp: number;
  payload: any;
}

export interface CryptoPriceMessage extends RTDSMessage {
  topic: 'crypto_prices' | 'crypto_prices_chainlink';
  payload: {
    symbol: string;
    value: string;
    timestamp: number;
  };
}

export interface CommentMessage extends RTDSMessage {
  topic: 'comments';
  type: 'comment_created' | 'comment_removed' | 'reaction_created' | 'reaction_removed';
  payload: {
    id: string;
    body?: string;
    parent_entity_id: string;
    parent_entity_type: string;
    user_address: string;
    created_at: string;
  };
}

// src/modules/polymarket/types/aggregation.types.ts

export enum PipelinePhase {
  IDLE = 'idle',
  FETCHING_EVENTS = 'fetching_events',
  FETCHING_MARKETS = 'fetching_markets',
  FETCHING_PRICES = 'fetching_prices',
  FETCHING_ORDERBOOKS = 'fetching_orderbooks',
  FETCHING_MARKET_ACTIVITY = 'fetching_market_activity',
  FETCHING_TRADERS = 'fetching_traders',
  FETCHING_POSITIONS = 'fetching_positions',
  TRANSFORMING = 'transforming',
  STORING = 'storing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface PipelineConfig {
  topTradersLimit: number; // 0 = fetch all traders
  enableOrderbookFetch: boolean;
  enableMarketActivity: boolean;
  enableTraderPositions: boolean;

  // ========================================
  // TEST LIMITS - Set to 0 for unlimited (production)
  // Location: src/modules/polymarket/types/aggregation.types.ts
  // ========================================
  maxEvents: number;        // 0 = unlimited, e.g., 1000 for testing
  maxMarkets: number;       // 0 = unlimited, e.g., 10000 for testing
  maxTotalTrades: number;   // 0 = unlimited, e.g., 100000 for testing
}

export interface PipelineProgress {
  eventsFetched: number;
  marketsFetched: number;
  activeMarkets: number;
  pricesFetched: number;
  orderbooksFetched: number;
  marketActivityFetched: number;
  tradesFetched: number;
  tradersFetched: number;
  positionsFetched: number;
  eventsStored: number;
  marketsStored: number;
  tradesStored: number;
  tradersStored: number;
  positionsStored: number;
}

export interface PipelineStatus {
  runId: string;
  isRunning: boolean;
  currentPhase: PipelinePhase;
  progress: PipelineProgress;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

// Enriched data types for storage
export interface EnrichedEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  created_at: Date;
  market_count: number;
  total_volume: number;
  total_liquidity: number;
  active_markets: number;
  closed_markets: number;
  fetched_at: Date;
}

export interface EnrichedMarket {
  id: string;
  event_id: string;
  slug: string;
  question: string;
  description: string;
  condition_id: string;
  market_type: string;
  outcomes: string[];
  outcome_prices: number[];
  clob_token_ids: string[];
  best_bid: number;
  best_ask: number;
  mid_price: number;
  spread: number;
  orderbook_bid_depth: number;
  orderbook_ask_depth: number;
  volume: number;
  liquidity: number;
  volume_24h: number;
  trades_24h: number;
  unique_traders_24h: number;
  active: number; // UInt8 in ClickHouse
  closed: number; // UInt8 in ClickHouse
  start_date: Date;
  end_date: Date;
  created_at: Date;
  fetched_at: Date;
}

export interface EnrichedTrader {
  user_address: string;
  rank: number;
  total_pnl: number;
  total_volume: number;
  markets_traded: number;
  win_rate: number;
  avg_position_size: number;
  fetched_at: Date;
}

export interface EnrichedPosition {
  user_address: string;
  market_id: string;
  asset_id: string;
  size: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  position_updated_at: Date;
  fetched_at: Date;
}

// Intermediate data types used during pipeline processing
export interface OrderbookSummary {
  tokenId: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  bidDepth: number;
  askDepth: number;
}

export interface MarketActivityData {
  marketId: string;
  volume24h: number;
  trades24h: number;
  uniqueTraders24h: number;
}

export interface PriceData {
  tokenId: string;
  price: number;
}

// Raw API response types (normalized for internal use)
export interface LeaderboardEntry {
  address: string;
  rank?: number;
  profit?: number;
  pnl?: number;
  volume?: number;
  marketsTraded?: number;
  markets_traded?: number;
  winRate?: number;
  win_rate?: number;
  avgPositionSize?: number;
  avg_position_size?: number;
  // Additional fields from actual API
  userName?: string;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
}

export interface PositionEntry {
  marketId?: string;
  market_id?: string;
  assetId?: string;
  asset_id?: string;
  size?: number;
  amount?: number;
  entryPrice?: number;
  entry_price?: number;
  avgPrice?: number;
  avg_price?: number;
  currentPrice?: number;
  current_price?: number;
  pnl?: number;
  profit?: number;
  updatedAt?: string;
  updated_at?: string;
  // Additional fields from actual API
  title?: string;
  slug?: string;
  outcome?: string;
  outcomeIndex?: number;
}

export interface OrderbookResponse {
  bids?: Array<{ price: string; size: string } | [string, string]>;
  asks?: Array<{ price: string; size: string } | [string, string]>;
}

// Pipeline run record for tracking
export interface PipelineRun {
  id: string;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  events_fetched: number;
  markets_fetched: number;
  traders_fetched: number;
  positions_fetched: number;
  error_message: string;
}

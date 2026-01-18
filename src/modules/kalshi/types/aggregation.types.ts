// src/modules/kalshi/types/aggregation.types.ts

// ============================================
// Pipeline Configuration & Status Types
// ============================================

export interface KalshiPipelineConfig {
  topTradersLimit: number;
  enableOrderbookFetch: boolean;
  enableCandlestickFetch: boolean;

  // Limits (0 = unlimited/production mode)
  maxEvents: number;
  maxMarkets: number;
  maxTotalTrades: number;

  // Test mode presets
  testMode?: 'quick' | 'moderate' | 'production';
}

export enum KalshiPipelinePhase {
  IDLE = 'IDLE',
  FETCHING_EVENTS = 'FETCHING_EVENTS',
  FETCHING_MARKETS = 'FETCHING_MARKETS',
  FETCHING_ORDERBOOKS = 'FETCHING_ORDERBOOKS',
  FETCHING_CANDLESTICKS = 'FETCHING_CANDLESTICKS',
  STORING = 'STORING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface KalshiPipelineProgress {
  eventsFetched: number;
  marketsFetched: number;
  activeMarkets: number;
  orderbooksFetched: number;
  candlesticksFetched: number;
  tradesFetched: number;
  eventsStored: number;
  marketsStored: number;
  tradesStored: number;
}

export interface KalshiPipelineStatus {
  runId: string;
  isRunning: boolean;
  currentPhase: KalshiPipelinePhase;
  progress: KalshiPipelineProgress;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

// ============================================
// Enriched Data Types (for storage)
// ============================================

export interface EnrichedKalshiEvent {
  id: string;                    // event_ticker
  slug: string;                  // event_ticker
  title: string;
  description: string;           // sub_title
  category: string;
  series_ticker: string;
  start_date: Date;              // strike_date
  end_date: Date | null;
  created_at: Date;
  market_count: number;
  total_volume: number;
  total_liquidity: number;
  active_markets: number;
  closed_markets: number;
  protocol: 'kalshi';
  fetched_at: Date;
}

export interface EnrichedKalshiMarket {
  id: string;                    // ticker
  event_id: string;              // event_ticker
  slug: string;                  // ticker
  question: string;              // title
  description: string;           // rules_primary
  condition_id: string;          // ticker (Kalshi uses ticker as unique ID)
  market_type: string;           // market_type
  outcomes: string[];            // ['Yes', 'No'] for binary
  outcome_prices: number[];      // [yes_price, no_price]
  clob_token_ids: string[];      // [ticker] - Kalshi uses ticker for orderbook
  best_bid: number;              // yes_bid_dollars
  best_ask: number;              // yes_ask_dollars
  mid_price: number;
  spread: number;
  orderbook_bid_depth: number;
  orderbook_ask_depth: number;
  volume: number;
  liquidity: number;             // liquidity_dollars
  volume_24h: number;            // volume_24h
  trades_24h: number;
  unique_traders_24h: number;
  active: number;                // 1 if status is 'active'
  closed: number;                // 1 if status is 'closed' or beyond
  start_date: Date;              // open_time
  end_date: Date;                // close_time
  created_at: Date;              // created_time
  protocol: 'kalshi';
  fetched_at: Date;
}

export interface EnrichedKalshiTrade {
  id: string;
  market_id: string;             // ticker
  condition_id: string;          // ticker
  asset: string;                 // market_ticker
  user_address: string;          // empty for public trades
  side: string;                  // taker_side
  price: number;                 // yes_price_dollars
  size: number;                  // count
  timestamp: Date;
  transaction_hash: string;      // empty for Kalshi
  outcome: string;               // taker_side
  outcome_index: number;
  title: string;
  slug: string;
  event_slug: string;
  protocol: 'kalshi';
  fetched_at: Date;
}

export interface EnrichedKalshiTrader {
  user_address: string;
  rank: number;
  total_pnl: number;
  total_volume: number;
  markets_traded: number;
  win_rate: number;
  avg_position_size: number;
  protocol: 'kalshi';
  fetched_at: Date;
}

// ============================================
// Orderbook Summary
// ============================================

export interface KalshiOrderbookSummary {
  ticker: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  bidDepth: number;
  askDepth: number;
  timestamp: Date;
}

// ============================================
// WebSocket Channel Types
// ============================================

export type KalshiWSChannel =
  | 'orderbook_delta'
  | 'ticker'
  | 'trade'
  | 'fill'
  | 'market_positions'
  | 'market_lifecycle_v2'
  | 'event_lifecycle';

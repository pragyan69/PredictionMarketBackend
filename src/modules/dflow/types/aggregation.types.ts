// src/modules/dflow/types/aggregation.types.ts

export interface DFlowPipelineConfig {
  maxEvents: number;
  maxMarkets: number;
  maxTrades: number;
  enableOrderbookFetch: boolean;
}

export enum DFlowPipelinePhase {
  IDLE = 'IDLE',
  FETCHING_EVENTS = 'FETCHING_EVENTS',
  FETCHING_MARKETS = 'FETCHING_MARKETS',
  FETCHING_PRICES = 'FETCHING_PRICES',
  FETCHING_ORDERBOOKS = 'FETCHING_ORDERBOOKS',
  FETCHING_TRADES = 'FETCHING_TRADES',
  STORING = 'STORING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface DFlowPipelineProgress {
  eventsFetched: number;
  marketsFetched: number;
  activeMarkets: number;
  orderbooksFetched: number;
  tradesFetched: number;
  eventsStored: number;
  marketsStored: number;
  tradesStored: number;
}

export interface DFlowPipelineStatus {
  runId: string;
  isRunning: boolean;
  currentPhase: DFlowPipelinePhase;
  progress: DFlowPipelineProgress;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

// Enriched types for database storage
export interface EnrichedDFlowEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  series_ticker: string;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date | null;
  market_count: number;
  total_volume: number;
  total_liquidity: number;
  active_markets: number;
  closed_markets: number;
  protocol: 'dflow';
  fetched_at: Date;
}

export interface EnrichedDFlowMarket {
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
  active: number;
  closed: number;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date | null;
  protocol: 'dflow';
  fetched_at: Date;
}

export interface EnrichedDFlowTrade {
  id: string;
  market_id: string;
  condition_id: string;
  asset: string;
  user_address: string;
  side: string;
  price: number;
  size: number;
  timestamp: Date;
  transaction_hash: string;
  outcome: string;
  outcome_index: number;
  title: string;
  slug: string;
  event_slug: string;
  protocol: 'dflow';
  fetched_at: Date;
}

export interface DFlowOrderbookSummary {
  marketId: string;
  ticker: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  bidDepth: number;
  askDepth: number;
}

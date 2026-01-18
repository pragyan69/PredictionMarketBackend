// src/modules/kalshi/types/kalshi.types.ts

// ============================================
// Kalshi API Response Types
// Base URL: https://api.elections.kalshi.com/trade-api/v2
// ============================================

// Price range definition
export interface KalshiPriceRange {
  start: string;
  end: string;
  step: string;
}

// MVE (Multivariate Event) selected leg
export interface KalshiMveSelectedLeg {
  event_ticker: string;
  market_ticker: string;
  side: string;
  yes_settlement_value_dollars: string;
}

// Market type enum
export type KalshiMarketType = 'binary' | 'scalar';

// Market status enum
export type KalshiMarketStatus =
  | 'initialized'
  | 'inactive'
  | 'active'
  | 'closed'
  | 'determined'
  | 'disputed'
  | 'amended'
  | 'finalized';

// Strike type enum
export type KalshiStrikeType =
  | 'greater'
  | 'greater_or_equal'
  | 'less'
  | 'less_or_equal'
  | 'between'
  | 'functional'
  | 'custom'
  | 'structured';

// Result enum
export type KalshiResult = 'yes' | 'no' | '';

// GET /markets and GET /markets/{ticker}
export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: KalshiMarketType;
  title: string;
  subtitle: string;
  yes_sub_title: string;
  no_sub_title: string;
  created_time: string;  // ISO 8601
  open_time: string;     // ISO 8601
  close_time: string;    // ISO 8601
  expiration_time: string; // ISO 8601 (deprecated)
  latest_expiration_time: string; // ISO 8601
  settlement_timer_seconds: number;
  status: KalshiMarketStatus;
  response_price_units: string; // deprecated
  yes_bid: number;              // deprecated
  yes_bid_dollars: string;
  yes_ask: number;              // deprecated
  yes_ask_dollars: string;
  no_bid: number;               // deprecated
  no_bid_dollars: string;
  no_ask: number;               // deprecated
  no_ask_dollars: string;
  last_price: number;           // deprecated
  last_price_dollars: string;
  volume: number;
  volume_fp: string;
  volume_24h: number;
  volume_24h_fp: string;
  result: KalshiResult;
  can_close_early: boolean;
  open_interest: number;
  open_interest_fp: string;
  notional_value: number;        // deprecated
  notional_value_dollars: string;
  previous_yes_bid: number;      // deprecated
  previous_yes_bid_dollars: string;
  previous_yes_ask: number;      // deprecated
  previous_yes_ask_dollars: string;
  previous_price: number;        // deprecated
  previous_price_dollars: string;
  liquidity: number;             // deprecated
  liquidity_dollars: string;
  expiration_value: string;
  tick_size: number;             // deprecated
  rules_primary: string;
  rules_secondary: string;
  price_level_structure: string;
  price_ranges: KalshiPriceRange[];
  expected_expiration_time?: string | null;
  settlement_value?: number | null;
  settlement_value_dollars?: string | null;
  settlement_ts?: string | null;
  fee_waiver_expiration_time?: string | null;
  early_close_condition?: string | null;
  strike_type?: KalshiStrikeType;
  floor_strike?: number | null;
  cap_strike?: number | null;
  functional_strike?: string | null;
  custom_strike?: Record<string, any>;
  mve_collection_ticker?: string;
  mve_selected_legs?: KalshiMveSelectedLeg[];
  primary_participant_key?: string | null;
  is_provisional?: boolean;
}

// GET /markets response
export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor: string;
}

// GET /markets/{ticker} response
export interface KalshiMarketResponse {
  market: KalshiMarket;
}

// Product metadata
export interface KalshiProductMetadata {
  [key: string]: any;
}

// GET /events and GET /events/{event_ticker}
export interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  sub_title: string;
  title: string;
  collateral_return_type: string;
  mutually_exclusive: boolean;
  category: string;
  available_on_brokers: boolean;
  product_metadata: KalshiProductMetadata;
  strike_date: string;  // ISO 8601
  strike_period: string;
  markets?: KalshiMarket[];
}

// Milestone
export interface KalshiMilestone {
  id: string;
  category: string;
  type: string;
  start_date: string;
  related_event_tickers: string[];
  title: string;
  notification_message: string;
  details: Record<string, any>;
  primary_event_tickers: string[];
  last_updated_ts: string;
  end_date: string;
  source_id: string;
}

// GET /events response
export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
  milestones?: KalshiMilestone[];
}

// GET /events/{event_ticker} response
export interface KalshiEventResponse {
  event: KalshiEvent;
  markets: KalshiMarket[];
}

// ============================================
// Candlestick Types
// ============================================

export interface KalshiOHLC {
  open: number;
  open_dollars: string;
  low: number;
  low_dollars: string;
  high: number;
  high_dollars: string;
  close: number;
  close_dollars: string;
}

export interface KalshiPriceOHLC extends KalshiOHLC {
  mean: number;
  mean_dollars: string;
  previous: number;
  previous_dollars: string;
  min: number;
  min_dollars: string;
  max: number;
  max_dollars: string;
}

export interface KalshiCandlestick {
  end_period_ts: number;
  yes_bid: KalshiOHLC;
  yes_ask: KalshiOHLC;
  price: KalshiPriceOHLC;
  volume: number;
  volume_fp: string;
  open_interest: number;
  open_interest_fp: string;
}

// GET /series/{series_ticker}/markets/{ticker}/candlesticks response
export interface KalshiMarketCandlesticksResponse {
  ticker: string;
  candlesticks: KalshiCandlestick[];
}

// GET /series/{series_ticker}/events/{ticker}/candlesticks response
export interface KalshiEventCandlesticksResponse {
  market_tickers: string[];
  market_candlesticks: KalshiCandlestick[][];
  adjusted_end_ts: number;
}

// ============================================
// Live Data Types
// ============================================

export interface KalshiLiveData {
  type: string;
  details: Record<string, any>;
  milestone_id: string;
}

export interface KalshiLiveDataResponse {
  live_data: KalshiLiveData;
}

export interface KalshiBatchLiveDataResponse {
  live_datas: KalshiLiveData[];
}

// ============================================
// Trade Types (from WebSocket)
// ============================================

export interface KalshiPublicTrade {
  market_ticker: string;
  yes_price: number;
  yes_price_dollars: string;
  no_price: number;
  no_price_dollars: string;
  count: number;
  taker_side: string;
  ts: number;  // Unix timestamp in seconds
}

// ============================================
// Orderbook Types (from WebSocket)
// ============================================

export interface KalshiOrderbookLevel {
  price: number;
  price_dollars: string;
  contracts: number;
}

export interface KalshiOrderbookSnapshot {
  market_ticker: string;
  yes: [number, number][];       // [price_in_cents, contracts]
  yes_dollars: [string, number][];  // [price_in_dollars, contracts]
  no: [number, number][];
  no_dollars: [string, number][];
}

export interface KalshiOrderbookDelta {
  market_ticker: string;
  price: number;
  price_dollars: string;
  delta: number;
  side: 'yes' | 'no';
}

// ============================================
// WebSocket Message Types
// ============================================

export interface KalshiWSSubscribeParams {
  channels: string[];
  market_ticker?: string;
  market_tickers?: string[];
  send_initial_snapshot?: boolean;
}

export interface KalshiWSSubscribeCommand {
  id: number;
  cmd: 'subscribe';
  params: KalshiWSSubscribeParams;
}

export interface KalshiWSUnsubscribeCommand {
  id: number;
  cmd: 'unsubscribe';
  params: {
    sids: number[];
  };
}

export interface KalshiWSUpdateSubscriptionCommand {
  id: number;
  cmd: 'update_subscription';
  params: {
    sid?: number;
    sids?: number[];
    market_ticker?: string;
    market_tickers?: string[];
    send_initial_snapshot?: boolean;
    action?: 'add_markets' | 'delete_markets';
  };
}

// WebSocket Response types
export interface KalshiWSSubscribedResponse {
  id?: number;
  type: 'subscribed';
  msg: {
    channel: string;
    sid: number;
  };
}

export interface KalshiWSUnsubscribedResponse {
  sid: number;
  type: 'unsubscribed';
}

export interface KalshiWSOkResponse {
  id?: number;
  sid?: number;
  seq?: number;
  type: 'ok';
  market_tickers?: string[];
}

export interface KalshiWSErrorResponse {
  id?: number;
  type: 'error';
  msg: {
    code: number;
    reason: string;
    details?: string;
    cmd?: string;
  };
}

export interface KalshiWSTickerUpdate {
  type: 'ticker';
  sid: number;
  msg: {
    market_ticker: string;
    price?: number;
    yes_bid?: number;
    yes_ask?: number;
    price_dollars?: string;
    yes_bid_dollars?: string;
    no_bid_dollars?: string;
    volume?: number;
    open_interest?: number;
    dollar_volume?: number;
    dollar_open_interest?: number;
    ts: number;
  };
}

export interface KalshiWSOrderbookSnapshotMessage {
  type: 'orderbook_snapshot';
  sid: number;
  seq: number;
  msg: KalshiOrderbookSnapshot;
}

export interface KalshiWSOrderbookDeltaMessage {
  type: 'orderbook_delta';
  sid: number;
  seq: number;
  msg: KalshiOrderbookDelta;
}

export interface KalshiWSTradeMessage {
  type: 'trade';
  sid: number;
  msg: KalshiPublicTrade;
}

export interface KalshiWSFillMessage {
  type: 'fill';
  sid: number;
  msg: {
    trade_id: string;
    order_id: string;
    market_ticker: string;
    is_taker: boolean;
    side: string;
    yes_price: number;
    yes_price_dollars: string;
    count: number;
    action: string;
    ts: number;
    client_order_id?: string;
    post_position?: number;
    purchased_side?: string;
  };
}

export interface KalshiWSMarketPositionMessage {
  type: 'market_position';
  sid: number;
  msg: {
    user_id: string;
    market_ticker: string;
    position: number;
    position_cost: number;
    realized_pnl: number;
    fees_paid: number;
    volume: number;
  };
}

export interface KalshiWSMarketLifecycleMessage {
  type: 'market_lifecycle_v2';
  sid: number;
  msg: {
    market_ticker: string;
    event_type: 'created' | 'activated' | 'deactivated' | 'close_date_updated' | 'determined' | 'settled';
    open_ts?: number;
    close_ts?: number;
    additional_metadata?: {
      name?: string;
      title?: string;
      yes_sub_title?: string;
      no_sub_title?: string;
      rules_primary?: string;
      can_close_early?: boolean;
      expected_expiration_ts?: number;
      strike_type?: string;
      floor_strike?: string;
    };
  };
}

export interface KalshiWSEventLifecycleMessage {
  type: 'event_lifecycle';
  sid: number;
  msg: {
    event_ticker: string;
    title: string;
    sub_title: string;
    collateral_return_type: string;
    series_ticker: string;
    strike_date: number;
  };
}

export type KalshiWSMessage =
  | KalshiWSSubscribedResponse
  | KalshiWSUnsubscribedResponse
  | KalshiWSOkResponse
  | KalshiWSErrorResponse
  | KalshiWSTickerUpdate
  | KalshiWSOrderbookSnapshotMessage
  | KalshiWSOrderbookDeltaMessage
  | KalshiWSTradeMessage
  | KalshiWSFillMessage
  | KalshiWSMarketPositionMessage
  | KalshiWSMarketLifecycleMessage
  | KalshiWSEventLifecycleMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Parse price string (e.g., "0.5600") to number
 */
export function parsePriceDollars(priceStr: string | undefined | null): number {
  if (!priceStr) return 0;
  const parsed = parseFloat(priceStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse volume string (e.g., "10.00") to number
 */
export function parseVolumeFp(volumeStr: string | undefined | null): number {
  if (!volumeStr) return 0;
  const parsed = parseFloat(volumeStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert Kalshi market status to a standard status
 */
export function normalizeMarketStatus(status: KalshiMarketStatus): 'active' | 'closed' | 'settled' | 'unknown' {
  switch (status) {
    case 'active':
      return 'active';
    case 'closed':
    case 'determined':
    case 'disputed':
    case 'amended':
      return 'closed';
    case 'finalized':
      return 'settled';
    case 'initialized':
    case 'inactive':
    default:
      return 'unknown';
  }
}

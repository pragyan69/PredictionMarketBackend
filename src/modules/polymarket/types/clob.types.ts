// src/modules/polymarket/types/clob.types.ts

export interface CLOBTrade {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  fee_rate_bps: string;
  timestamp: number;
  trader_address: string;
  transaction_hash?: string;
}

export interface CLOBOrderBook {
  market: string;
  asset_id: string;
  timestamp: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
}

export interface OrderLevel {
  price: string;
  size: string;
}

export interface CLOBPrice {
  market: string;
  asset_id: string;
  price: string;
  timestamp: number;
}

// WebSocket Message Types
export interface CLOBWSMessage {
  event_type: string;
  market?: string;
  asset_id?: string;
  timestamp: number;
  [key: string]: any;
}

export interface BookMessage extends CLOBWSMessage {
  event_type: 'book';
  bids: OrderLevel[];
  asks: OrderLevel[];
}

export interface PriceChangeMessage extends CLOBWSMessage {
  event_type: 'price_change';
  price_changes: Array<{
    asset_id: string;
    old_price: string;
    new_price: string;
  }>;
}

export interface LastTradePriceMessage extends CLOBWSMessage {
  event_type: 'last_trade_price';
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  fee_rate_bps: string;
}

export interface TickSizeChangeMessage extends CLOBWSMessage {
  event_type: 'tick_size_change';
  old_tick_size: string;
  new_tick_size: string;
}

export interface BestBidAskMessage extends CLOBWSMessage {
  event_type: 'best_bid_ask';
  best_bid: string;
  best_ask: string;
  spread: string;
}

export interface NewMarketMessage extends CLOBWSMessage {
  event_type: 'new_market';
  id: string;
  question: string;
  description: string;
  outcomes: string[];
  assets_ids: string[];
}

export interface MarketResolvedMessage extends CLOBWSMessage {
  event_type: 'market_resolved';
  winning_asset_id: string;
  winning_outcome: string;
}

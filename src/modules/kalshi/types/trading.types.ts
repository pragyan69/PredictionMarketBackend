// src/modules/kalshi/types/trading.types.ts

// Order side
export type KalshiOrderSide = 'yes' | 'no';

// Order action
export type KalshiOrderAction = 'buy' | 'sell';

// Order type
export type KalshiOrderType = 'limit' | 'market';

// Time in force
export type KalshiTimeInForce = 'fill_or_kill' | 'good_till_canceled' | 'immediate_or_cancel';

// Order status
export type KalshiOrderStatus =
  | 'resting'
  | 'canceled'
  | 'executed'
  | 'pending';

// Self trade prevention type
export type KalshiSelfTradePreventionType = 'taker_at_cross' | 'maker';

// Create order request
export interface KalshiCreateOrderRequest {
  ticker: string;
  side: KalshiOrderSide;
  action: KalshiOrderAction;
  type?: KalshiOrderType;
  count?: number;
  count_fp?: string;
  yes_price?: number; // 1-99 cents
  no_price?: number; // 1-99 cents
  yes_price_dollars?: string; // e.g., "0.5600"
  no_price_dollars?: string;
  expiration_ts?: number;
  time_in_force?: KalshiTimeInForce;
  buy_max_cost?: number; // Max cost in cents (auto FoK)
  post_only?: boolean;
  reduce_only?: boolean;
  client_order_id?: string;
  self_trade_prevention_type?: KalshiSelfTradePreventionType;
  order_group_id?: string;
  cancel_order_on_pause?: boolean;
  subaccount?: number;
}

// Order response
export interface KalshiOrder {
  order_id: string;
  user_id: string;
  client_order_id?: string;
  ticker: string;
  side: KalshiOrderSide;
  action: KalshiOrderAction;
  type: KalshiOrderType;
  status: KalshiOrderStatus;
  yes_price: number;
  no_price: number;
  yes_price_dollars: string;
  no_price_dollars: string;
  fill_count: number;
  fill_count_fp: string;
  remaining_count: number;
  remaining_count_fp: string;
  initial_count: number;
  initial_count_fp: string;
  taker_fees: number;
  maker_fees: number;
  taker_fill_cost: number;
  maker_fill_cost: number;
  taker_fill_cost_dollars: string;
  maker_fill_cost_dollars: string;
  queue_position: number;
  taker_fees_dollars: string;
  maker_fees_dollars: string;
  expiration_time?: string;
  created_time: string;
  last_update_time: string;
  self_trade_prevention_type?: KalshiSelfTradePreventionType;
  order_group_id?: string;
  cancel_order_on_pause?: boolean;
}

// Create order response
export interface KalshiCreateOrderResponse {
  order: KalshiOrder;
}

// Get order response
export interface KalshiGetOrderResponse {
  order: KalshiOrder;
}

// Get orders response
export interface KalshiGetOrdersResponse {
  orders: KalshiOrder[];
  cursor?: string;
}

// Cancel order response
export interface KalshiCancelOrderResponse {
  order: KalshiOrder;
  reduced_by?: number;
}

// Batch cancel request
export interface KalshiBatchCancelRequest {
  order_ids: string[];
}

// Batch cancel response
export interface KalshiBatchCancelResponse {
  orders: KalshiOrder[];
}

// Queue position
export interface KalshiQueuePosition {
  order_id: string;
  queue_position: number;
}

// Queue positions response
export interface KalshiQueuePositionsResponse {
  queue_positions: KalshiQueuePosition[];
}

// Order group
export interface KalshiOrderGroup {
  order_group_id: string;
  contracts_limit: number;
  name?: string;
  created_time: string;
}

// Create order group request
export interface KalshiCreateOrderGroupRequest {
  contracts_limit: number;
  name?: string;
}

// Unified order request (for your API)
export interface UnifiedKalshiOrderRequest {
  market_id: string; // ticker
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number; // 0.01 - 0.99
  quantity: number;
  order_type: 'limit' | 'market';
  time_in_force: 'gtc' | 'gtd' | 'fok' | 'ioc';
  expiration_ts?: number;
  post_only?: boolean;
  reduce_only?: boolean;
}

// Unified order response
export interface UnifiedKalshiOrderResponse {
  id: string;
  external_id: string;
  platform: 'kalshi';
  status: string;
  market_id: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  order_type: string;
  time_in_force: string;
  fees: number;
  queue_position: number;
  created_at: string;
}

// Balance response
export interface KalshiBalanceResponse {
  balance: number;
  balance_dollars: string;
}

// Position
export interface KalshiPosition {
  ticker: string;
  position: number;
  position_cost: number;
  position_cost_dollars: string;
  realized_pnl: number;
  realized_pnl_dollars: string;
  resting_orders_count: number;
  total_traded: number;
  total_traded_dollars: string;
}

// Positions response
export interface KalshiPositionsResponse {
  positions: KalshiPosition[];
  cursor?: string;
}

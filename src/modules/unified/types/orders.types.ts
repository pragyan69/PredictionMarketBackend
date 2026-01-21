// src/modules/unified/types/orders.types.ts

// Platform type
export type Platform = 'polymarket' | 'kalshi';

// Unified create order request
export interface UnifiedCreateOrderRequest {
  platform: Platform;
  market_id: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number; // 0.01 - 0.99
  quantity: number;
  order_type: 'limit' | 'market';
  time_in_force: 'gtc' | 'gtd' | 'fok' | 'ioc';
  expiration_ts?: number;
  post_only?: boolean;
  reduce_only?: boolean;
  // Polymarket specific
  private_key?: string; // For order signing (should be handled client-side in production)
}

// Unified order response
export interface UnifiedOrderResponse {
  id: string;
  external_id: string;
  platform: Platform;
  status: string;
  market_id: string;
  market_name?: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  order_type: string;
  time_in_force: string;
  fees?: number;
  queue_position?: number;
  created_at: string;
  updated_at?: string;
}

// Unified orders list response
export interface UnifiedOrdersResponse {
  orders: UnifiedOrderResponse[];
  total?: number;
}

// Cancel order response
export interface UnifiedCancelResponse {
  success: boolean;
  canceled_ids: string[];
  failed_ids: { [id: string]: string };
}

// Portfolio summary
export interface UnifiedPortfolioSummary {
  total_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  open_orders_count: number;
  positions_count: number;
  polymarket: {
    connected: boolean;
    balance?: number;
    positions_count?: number;
  };
  kalshi: {
    connected: boolean;
    balance?: number;
    positions_count?: number;
  };
}

// Unified position
export interface UnifiedPosition {
  id: string;
  platform: Platform;
  market_id: string;
  market_name?: string;
  side: 'yes' | 'no';
  quantity: number;
  average_price: number;
  current_price?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
}

// Unified balance
export interface UnifiedBalance {
  platform: Platform;
  currency: string;
  available: number;
  locked?: number;
  total: number;
}

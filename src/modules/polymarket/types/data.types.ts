// src/modules/polymarket/types/data.types.ts

export interface DataAPILeaderboardEntry {
  user_address: string;
  rank: number;
  total_pnl: string;
  total_volume: string;
  markets_traded: number;
  win_rate: number;
  avg_position_size: string;
}

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

export interface DataAPIMarketActivity {
  market_id: string;
  volume_24h: string;
  trades_24h: number;
  unique_traders_24h: number;
  price_change_24h: string;
}

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

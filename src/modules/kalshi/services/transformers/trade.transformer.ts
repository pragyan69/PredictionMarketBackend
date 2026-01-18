// src/modules/kalshi/services/transformers/trade.transformer.ts

import { KalshiPublicTrade, parsePriceDollars } from '../../types/kalshi.types';
import { EnrichedKalshiTrade } from '../../types/aggregation.types';

export class KalshiTradeTransformer {
  /**
   * Transform a Kalshi public trade (from WebSocket) to enriched format
   */
  transformTrade(trade: KalshiPublicTrade, eventTicker?: string): EnrichedKalshiTrade {
    const now = new Date();
    const timestamp = new Date(trade.ts * 1000);

    return {
      id: `kalshi-${trade.market_ticker}-${trade.ts}-${Math.random().toString(36).substring(7)}`,
      market_id: trade.market_ticker,
      condition_id: trade.market_ticker,
      asset: trade.market_ticker,
      user_address: '', // Not available in public trades
      side: trade.taker_side,
      price: parsePriceDollars(trade.yes_price_dollars),
      size: trade.count,
      timestamp,
      transaction_hash: '', // Not applicable for Kalshi
      outcome: trade.taker_side === 'yes' ? 'Yes' : 'No',
      outcome_index: trade.taker_side === 'yes' ? 0 : 1,
      title: '',
      slug: trade.market_ticker,
      event_slug: eventTicker || '',
      protocol: 'kalshi' as const,
      fetched_at: now,
    };
  }

  /**
   * Transform multiple trades
   */
  transformTrades(trades: KalshiPublicTrade[], eventTicker?: string): EnrichedKalshiTrade[] {
    return trades.map(trade => this.transformTrade(trade, eventTicker));
  }
}

export const kalshiTradeTransformer = new KalshiTradeTransformer();

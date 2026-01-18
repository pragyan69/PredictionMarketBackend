// src/modules/kalshi/services/transformers/market.transformer.ts

import { KalshiMarket, parsePriceDollars, parseVolumeFp } from '../../types/kalshi.types';
import { EnrichedKalshiMarket, KalshiOrderbookSummary } from '../../types/aggregation.types';

export class KalshiMarketTransformer {
  /**
   * Transform raw Kalshi markets into enriched markets
   */
  transform(
    markets: KalshiMarket[],
    orderbookMap?: Map<string, KalshiOrderbookSummary>
  ): EnrichedKalshiMarket[] {
    const now = new Date();

    return markets.map(market => {
      // Get orderbook summary if available
      const orderbook = orderbookMap?.get(market.ticker);

      // Parse prices from dollar strings
      const yesBid = parsePriceDollars(market.yes_bid_dollars);
      const yesAsk = parsePriceDollars(market.yes_ask_dollars);
      const noBid = parsePriceDollars(market.no_bid_dollars);
      const noAsk = parsePriceDollars(market.no_ask_dollars);
      const lastPrice = parsePriceDollars(market.last_price_dollars);

      // Calculate mid price and spread
      const midPrice = orderbook?.midPrice ?? ((yesBid + yesAsk) / 2 || lastPrice);
      const spread = orderbook?.spread ?? ((yesAsk - yesBid) || 0);

      // Determine active/closed status
      const isActive = market.status === 'active' ? 1 : 0;
      const isClosed = ['closed', 'determined', 'disputed', 'amended', 'finalized'].includes(market.status) ? 1 : 0;

      return {
        id: market.ticker,
        event_id: market.event_ticker,
        slug: market.ticker,
        question: market.title || '',
        description: market.rules_primary || '',
        condition_id: market.ticker, // Kalshi uses ticker as unique identifier
        market_type: market.market_type || 'binary',
        outcomes: this.getOutcomes(market),
        outcome_prices: [lastPrice, 1 - lastPrice], // Yes price, No price
        clob_token_ids: [market.ticker], // Kalshi uses ticker for orderbook subscriptions
        best_bid: orderbook?.bestBid ?? yesBid,
        best_ask: orderbook?.bestAsk ?? yesAsk,
        mid_price: midPrice,
        spread: spread,
        orderbook_bid_depth: orderbook?.bidDepth ?? 0,
        orderbook_ask_depth: orderbook?.askDepth ?? 0,
        volume: market.volume || 0,
        liquidity: parsePriceDollars(market.liquidity_dollars),
        volume_24h: market.volume_24h || 0,
        trades_24h: 0, // Not directly available from market API
        unique_traders_24h: 0, // Not directly available from market API
        active: isActive,
        closed: isClosed,
        start_date: this.parseDate(market.open_time),
        end_date: this.parseDate(market.close_time),
        created_at: this.parseDate(market.created_time),
        protocol: 'kalshi' as const,
        fetched_at: now,
      };
    });
  }

  /**
   * Get outcomes for a market (binary markets have Yes/No)
   */
  private getOutcomes(market: KalshiMarket): string[] {
    if (market.market_type === 'binary') {
      return [
        market.yes_sub_title || 'Yes',
        market.no_sub_title || 'No',
      ];
    }
    // For scalar markets, use subtitles
    return [
      market.yes_sub_title || 'Yes',
      market.no_sub_title || 'No',
    ];
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date(0);

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(0) : date;
    } catch {
      return new Date(0);
    }
  }
}

export const kalshiMarketTransformer = new KalshiMarketTransformer();

// src/modules/polymarket/services/transformers/market.transformer.ts

import { GammaMarket, GammaEvent, getClobTokenIds, getOutcomes, getOutcomePrices } from '../../types/gamma.types';
import {
  EnrichedMarket,
  OrderbookSummary,
  MarketActivityData,
} from '../../types/aggregation.types';

export class MarketTransformer {
  /**
   * Transform raw Gamma markets into enriched markets with prices, orderbook, and activity data
   */
  transform(
    markets: GammaMarket[],
    events: GammaEvent[],
    priceMap: Map<string, number>,
    orderbookMap: Map<string, OrderbookSummary>,
    activityMap: Map<string, MarketActivityData>
  ): EnrichedMarket[] {
    const now = new Date();

    // Create event lookup by checking if markets are embedded in events
    const marketToEventMap = this.createMarketToEventMap(events);

    return markets.map(market => {
      // Parse JSON string fields
      const tokenIds = getClobTokenIds(market);
      const outcomes = getOutcomes(market);

      // Get prices for this market's tokens
      const outcomePricesArr = this.getOutcomePricesFromMap(market, priceMap);

      // Get orderbook summary (use first token's orderbook as representative)
      const primaryTokenId = tokenIds[0];
      const orderbook = primaryTokenId ? orderbookMap.get(primaryTokenId) : undefined;

      // Get activity data
      const activity = activityMap.get(market.conditionId || '') || activityMap.get(market.id);

      // Find parent event
      const eventId = marketToEventMap.get(market.id) || marketToEventMap.get(market.conditionId || '') || '';

      return {
        id: market.id,
        event_id: eventId,
        slug: market.slug || '',
        question: market.question || '',
        description: market.description || '',
        condition_id: market.conditionId || '',
        market_type: market.marketType || 'binary',
        outcomes: outcomes,
        outcome_prices: outcomePricesArr,
        clob_token_ids: tokenIds,
        best_bid: orderbook?.bestBid ?? 0,
        best_ask: orderbook?.bestAsk ?? 0,
        mid_price: orderbook?.midPrice ?? this.calculateMidPrice(outcomePricesArr),
        spread: orderbook?.spread ?? 0,
        orderbook_bid_depth: orderbook?.bidDepth ?? 0,
        orderbook_ask_depth: orderbook?.askDepth ?? 0,
        volume: parseFloat(market.volume || '0'),
        liquidity: parseFloat(market.liquidity || '0'),
        volume_24h: activity?.volume24h ?? 0,
        trades_24h: activity?.trades24h ?? 0,
        unique_traders_24h: activity?.uniqueTraders24h ?? 0,
        active: market.active ? 1 : 0,
        closed: market.closed ? 1 : 0,
        start_date: this.parseDate(market.startDate),
        end_date: this.parseDate(market.endDate),
        created_at: this.parseDate(market.createdAt),
        fetched_at: now,
      };
    });
  }

  /**
   * Get outcome prices from price map for a market's tokens
   */
  private getOutcomePricesFromMap(market: GammaMarket, priceMap: Map<string, number>): number[] {
    const tokenIds = getClobTokenIds(market);

    if (tokenIds.length === 0) {
      // Fall back to outcomePrices from market if available
      const outcomePricesStr = getOutcomePrices(market);
      return outcomePricesStr.map(p => parseFloat(p) || 0);
    }

    return tokenIds.map(tokenId => {
      const price = priceMap.get(tokenId);
      return price ?? 0;
    });
  }

  /**
   * Calculate mid price from outcome prices
   */
  private calculateMidPrice(prices: number[]): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    // For binary markets, mid price is typically the YES price
    return prices[0];
  }

  /**
   * Create a mapping from market ID/conditionId to event ID
   */
  private createMarketToEventMap(events: GammaEvent[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const event of events) {
      if (event.markets) {
        for (const market of event.markets) {
          map.set(market.id, event.id);
          if (market.conditionId) {
            map.set(market.conditionId, event.id);
          }
        }
      }
    }

    return map;
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

export const marketTransformer = new MarketTransformer();

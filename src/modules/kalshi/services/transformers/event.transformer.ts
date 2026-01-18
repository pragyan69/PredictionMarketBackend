// src/modules/kalshi/services/transformers/event.transformer.ts

import { KalshiEvent, KalshiMarket, parsePriceDollars } from '../../types/kalshi.types';
import { EnrichedKalshiEvent } from '../../types/aggregation.types';

export class KalshiEventTransformer {
  /**
   * Transform raw Kalshi events into enriched events
   */
  transform(events: KalshiEvent[], allMarkets: KalshiMarket[]): EnrichedKalshiEvent[] {
    const now = new Date();

    // Create market lookup by event_ticker
    const marketsByEvent = new Map<string, KalshiMarket[]>();
    for (const market of allMarkets) {
      const existing = marketsByEvent.get(market.event_ticker) || [];
      existing.push(market);
      marketsByEvent.set(market.event_ticker, existing);
    }

    return events.map(event => {
      const eventMarkets = marketsByEvent.get(event.event_ticker) || event.markets || [];

      // Calculate aggregates
      const activeMarkets = eventMarkets.filter(m => m.status === 'active').length;
      const closedMarkets = eventMarkets.filter(m =>
        m.status === 'closed' || m.status === 'determined' || m.status === 'finalized'
      ).length;

      const totalVolume = eventMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);
      const totalLiquidity = eventMarkets.reduce((sum, m) => sum + parsePriceDollars(m.liquidity_dollars), 0);

      return {
        id: event.event_ticker,
        slug: event.event_ticker,
        title: event.title || '',
        description: event.sub_title || '',
        category: event.category || '',
        series_ticker: event.series_ticker || '',
        start_date: this.parseDate(event.strike_date),
        end_date: null, // Events don't have explicit end dates in Kalshi
        created_at: this.parseDate(event.strike_date), // Use strike_date as proxy
        market_count: eventMarkets.length,
        total_volume: totalVolume,
        total_liquidity: totalLiquidity,
        active_markets: activeMarkets,
        closed_markets: closedMarkets,
        protocol: 'kalshi' as const,
        fetched_at: now,
      };
    });
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

export const kalshiEventTransformer = new KalshiEventTransformer();

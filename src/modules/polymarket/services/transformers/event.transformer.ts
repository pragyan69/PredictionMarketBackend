// src/modules/polymarket/services/transformers/event.transformer.ts

import { GammaEvent, GammaMarket } from '../../types/gamma.types';
import { EnrichedEvent } from '../../types/aggregation.types';

export class EventTransformer {
  /**
   * Transform raw Gamma events into enriched events with aggregated market stats
   */
  transform(
    events: GammaEvent[],
    allMarkets: GammaMarket[]
  ): EnrichedEvent[] {
    const now = new Date();

    // Create a map of markets by their parent event (if available)
    // Note: Gamma events often come with markets embedded, but we use allMarkets for consistency
    const marketsByEvent = this.groupMarketsByEvent(events, allMarkets);

    return events.map(event => {
      const eventMarkets = marketsByEvent.get(event.id) || event.markets || [];

      // Calculate aggregated stats
      let totalVolume = 0;
      let totalLiquidity = 0;
      let activeMarkets = 0;
      let closedMarkets = 0;

      for (const market of eventMarkets) {
        totalVolume += parseFloat(market.volume || '0');
        totalLiquidity += parseFloat(market.liquidity || '0');

        if (market.active) {
          activeMarkets++;
        }
        if (market.closed) {
          closedMarkets++;
        }
      }

      return {
        id: event.id,
        slug: event.slug || '',
        title: event.title || '',
        description: event.description || '',
        start_date: this.parseDate(event.startDate),
        end_date: this.parseDate(event.endDate),
        created_at: this.parseDate(event.createdAt),
        market_count: eventMarkets.length,
        total_volume: totalVolume,
        total_liquidity: totalLiquidity,
        active_markets: activeMarkets,
        closed_markets: closedMarkets,
        fetched_at: now,
      };
    });
  }

  /**
   * Group markets by their parent event
   * This is a helper since the relationship may not always be direct
   */
  private groupMarketsByEvent(
    events: GammaEvent[],
    allMarkets: GammaMarket[]
  ): Map<string, GammaMarket[]> {
    const marketsByEvent = new Map<string, GammaMarket[]>();

    // First, use the embedded markets in events
    for (const event of events) {
      if (event.markets && event.markets.length > 0) {
        marketsByEvent.set(event.id, event.markets);
      }
    }

    // If events don't have embedded markets, we might need to match by slug or other criteria
    // For now, rely on embedded markets from Gamma API

    return marketsByEvent;
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date(0);

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(0) : date;
    } catch {
      return new Date(0);
    }
  }
}

export const eventTransformer = new EventTransformer();

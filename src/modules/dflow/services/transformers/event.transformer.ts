// src/modules/dflow/services/transformers/event.transformer.ts

import { DFlowEvent, DFlowMarket } from '../../types/dflow.types';
import { EnrichedDFlowEvent } from '../../types/aggregation.types';

export class DFlowEventTransformer {
  transform(events: DFlowEvent[], markets: DFlowMarket[]): EnrichedDFlowEvent[] {
    const now = new Date();

    // Group markets by event
    const marketsByEvent = new Map<string, DFlowMarket[]>();
    for (const market of markets) {
      // Try to match market to event (assuming market has event reference)
      const eventId = this.findEventIdForMarket(market, events);
      if (eventId) {
        const existing = marketsByEvent.get(eventId) || [];
        existing.push(market);
        marketsByEvent.set(eventId, existing);
      }
    }

    return events.map(event => {
      const eventMarkets = marketsByEvent.get(event.id) || event.markets || [];

      const activeMarkets = eventMarkets.filter(m => m.status === 'active').length;
      const closedMarkets = eventMarkets.filter(m => m.status === 'resolved').length;
      const totalVolume = eventMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);
      const totalLiquidity = eventMarkets.reduce((sum, m) => sum + (m.liquidity || 0), 0);

      return {
        id: event.id,
        slug: event.id, // Use ID as slug if not available
        title: event.title || '',
        description: event.description || '',
        category: event.category || '',
        series_ticker: '',
        start_date: null,
        end_date: null,
        created_at: event.createdAt ? new Date(event.createdAt) : null,
        market_count: eventMarkets.length,
        total_volume: totalVolume,
        total_liquidity: totalLiquidity,
        active_markets: activeMarkets,
        closed_markets: closedMarkets,
        protocol: 'dflow' as const,
        fetched_at: now,
      };
    });
  }

  private findEventIdForMarket(market: DFlowMarket, events: DFlowEvent[]): string | null {
    // Check if market is nested in any event
    for (const event of events) {
      if (event.markets?.some(m => m.id === market.id)) {
        return event.id;
      }
    }
    return null;
  }
}

export const dflowEventTransformer = new DFlowEventTransformer();

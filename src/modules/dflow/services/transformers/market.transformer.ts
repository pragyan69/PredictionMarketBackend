// src/modules/dflow/services/transformers/market.transformer.ts

import { DFlowEvent, DFlowMarket } from '../../types/dflow.types';
import { EnrichedDFlowMarket, DFlowOrderbookSummary } from '../../types/aggregation.types';

export class DFlowMarketTransformer {
  transform(
    markets: DFlowMarket[],
    events: DFlowEvent[],
    orderbookMap: Map<string, DFlowOrderbookSummary>
  ): EnrichedDFlowMarket[] {
    const now = new Date();

    // Build event lookup map
    const eventMap = new Map<string, DFlowEvent>();
    for (const event of events) {
      eventMap.set(event.id, event);
      // Also map markets to their parent event
      if (event.markets) {
        for (const m of event.markets) {
          eventMap.set(m.id, event);
        }
      }
    }

    return markets.map(market => {
      const orderbook = orderbookMap.get(market.id);
      const parentEvent = eventMap.get(market.id);

      const yesPrice = market.yesPrice || orderbook?.midPrice || 0;
      const noPrice = market.noPrice || (yesPrice > 0 ? 1 - yesPrice : 0);

      return {
        id: market.id,
        event_id: parentEvent?.id || '',
        slug: market.ticker || market.id,
        question: market.title || '',
        description: market.description || '',
        condition_id: market.id,
        market_type: 'binary',
        outcomes: ['Yes', 'No'],
        outcome_prices: [yesPrice, noPrice],
        clob_token_ids: [
          market.accounts?.yesMint || '',
          market.accounts?.noMint || '',
        ].filter(Boolean),
        best_bid: orderbook?.bestBid || 0,
        best_ask: orderbook?.bestAsk || 0,
        mid_price: orderbook?.midPrice || yesPrice,
        spread: orderbook?.spread || 0,
        orderbook_bid_depth: orderbook?.bidDepth || 0,
        orderbook_ask_depth: orderbook?.askDepth || 0,
        volume: market.volume || 0,
        liquidity: market.liquidity || 0,
        volume_24h: 0,
        trades_24h: 0,
        unique_traders_24h: 0,
        active: market.status === 'active' ? 1 : 0,
        closed: market.status === 'resolved' ? 1 : 0,
        start_date: null,
        end_date: market.expirationTime ? new Date(market.expirationTime) : null,
        created_at: market.createdAt ? new Date(market.createdAt) : null,
        protocol: 'dflow' as const,
        fetched_at: now,
      };
    });
  }
}

export const dflowMarketTransformer = new DFlowMarketTransformer();

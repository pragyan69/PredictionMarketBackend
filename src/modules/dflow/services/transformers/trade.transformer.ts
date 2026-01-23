// src/modules/dflow/services/transformers/trade.transformer.ts

import { DFlowTrade, DFlowMarket } from '../../types/dflow.types';
import { EnrichedDFlowTrade } from '../../types/aggregation.types';

export class DFlowTradeTransformer {
  transform(
    trades: DFlowTrade[],
    marketMap: Map<string, DFlowMarket>
  ): EnrichedDFlowTrade[] {
    const now = new Date();

    return trades.map(trade => {
      const market = marketMap.get(trade.marketId);

      return {
        id: trade.id,
        market_id: trade.marketId,
        condition_id: trade.marketId,
        asset: trade.outcome === 'yes' ? 'YES' : 'NO',
        user_address: trade.taker || trade.maker || '',
        side: trade.side,
        price: trade.price,
        size: trade.size,
        timestamp: new Date(trade.timestamp),
        transaction_hash: trade.txSignature || '',
        outcome: trade.outcome,
        outcome_index: trade.outcome === 'yes' ? 0 : 1,
        title: market?.title || '',
        slug: market?.ticker || trade.marketTicker || '',
        event_slug: '',
        protocol: 'dflow' as const,
        fetched_at: now,
      };
    });
  }
}

export const dflowTradeTransformer = new DFlowTradeTransformer();

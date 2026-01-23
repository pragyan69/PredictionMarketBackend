// src/modules/dflow/services/fetchers/trades.fetcher.ts

import { dflowMetadataClient } from '../../clients/metadata.client';
import { DFlowTrade, DFlowMarket } from '../../types/dflow.types';

export class DFlowTradesFetcher {
  /**
   * Fetch trades for multiple markets
   */
  async fetchTradesForMarkets(
    markets: DFlowMarket[],
    tradesPerMarket: number = 100,
    onProgress?: (marketsDone: number, totalTrades: number) => void
  ): Promise<Map<string, DFlowTrade[]>> {
    console.log(`📥 Fetching trades for ${markets.length} DFlow markets...`);

    const tradesMap = new Map<string, DFlowTrade[]>();
    let totalTrades = 0;
    let marketsDone = 0;

    for (const market of markets) {
      try {
        const response = await dflowMetadataClient.getTrades({
          marketId: market.id,
          marketTicker: market.ticker,
          limit: tradesPerMarket,
        });

        const trades = response.trades || [];
        if (trades.length > 0) {
          tradesMap.set(market.id, trades);
          totalTrades += trades.length;
        }
      } catch {
        // Skip failed markets
      }

      marketsDone++;
      if (onProgress) {
        onProgress(marketsDone, totalTrades);
      }

      // Rate limit delay
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`✅ Fetched ${totalTrades} DFlow trades from ${tradesMap.size} markets`);
    return tradesMap;
  }

  /**
   * Flatten trades map to array
   */
  flattenTrades(tradesMap: Map<string, DFlowTrade[]>): DFlowTrade[] {
    const allTrades: DFlowTrade[] = [];
    for (const trades of tradesMap.values()) {
      allTrades.push(...trades);
    }
    return allTrades;
  }
}

export const dflowTradesFetcher = new DFlowTradesFetcher();

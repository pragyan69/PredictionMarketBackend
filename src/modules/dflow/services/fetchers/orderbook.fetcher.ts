// src/modules/dflow/services/fetchers/orderbook.fetcher.ts

import { dflowMetadataClient } from '../../clients/metadata.client';
import { DFlowOrderbookSummary } from '../../types/aggregation.types';
import { DFlowMarket } from '../../types/dflow.types';

export class DFlowOrderbookFetcher {
  private readonly BATCH_SIZE = 10;

  /**
   * Fetch orderbooks for multiple markets
   */
  async fetchOrderbooks(
    markets: DFlowMarket[],
    onProgress?: (count: number) => void
  ): Promise<Map<string, DFlowOrderbookSummary>> {
    console.log(`📥 Fetching orderbooks for ${markets.length} DFlow markets...`);

    const orderbookMap = new Map<string, DFlowOrderbookSummary>();
    let processed = 0;

    for (let i = 0; i < markets.length; i += this.BATCH_SIZE) {
      const batch = markets.slice(i, i + this.BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (market) => {
          if (!market.ticker) return null;

          try {
            const orderbook = await dflowMetadataClient.getOrderbook(market.ticker);

            const bids = orderbook.bids || [];
            const asks = orderbook.asks || [];

            const bestBid = bids.length > 0 ? bids[0].price : 0;
            const bestAsk = asks.length > 0 ? asks[0].price : 0;
            const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
            const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;

            const bidDepth = bids.reduce((sum, level) => sum + level.size, 0);
            const askDepth = asks.reduce((sum, level) => sum + level.size, 0);

            return {
              marketId: market.id,
              ticker: market.ticker,
              bestBid,
              bestAsk,
              midPrice,
              spread,
              bidDepth,
              askDepth,
            } as DFlowOrderbookSummary;
          } catch {
            return null;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          orderbookMap.set(result.value.marketId, result.value);
        }
      }

      processed += batch.length;
      if (onProgress) {
        onProgress(processed);
      }

      // Rate limit delay
      if (i + this.BATCH_SIZE < markets.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`✅ Fetched ${orderbookMap.size} DFlow orderbooks`);
    return orderbookMap;
  }
}

export const dflowOrderbookFetcher = new DFlowOrderbookFetcher();

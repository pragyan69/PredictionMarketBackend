// src/modules/dflow/services/fetchers/market.fetcher.ts

import { dflowMetadataClient } from '../../clients/metadata.client';
import { DFlowMarket } from '../../types/dflow.types';

export class DFlowMarketFetcher {
  /**
   * Fetch all markets from DFlow API
   */
  async fetchAllMarkets(activeOnly: boolean = true): Promise<DFlowMarket[]> {
    console.log(`📥 Fetching DFlow markets (activeOnly: ${activeOnly})...`);

    try {
      const markets = await dflowMetadataClient.getMarkets({
        status: activeOnly ? 'active' : undefined,
        limit: 500,
      });

      console.log(`✅ Fetched ${markets.length} DFlow markets`);
      return markets;
    } catch (error) {
      console.error('❌ Failed to fetch DFlow markets:', error);
      return [];
    }
  }

  /**
   * Fetch single market by ID
   */
  async fetchMarketById(marketId: string): Promise<DFlowMarket | null> {
    try {
      return await dflowMetadataClient.getMarketById(marketId);
    } catch {
      return null;
    }
  }

  /**
   * Get market mints for trading
   */
  async fetchMarketMints(marketId: string): Promise<{ yesMint: string; noMint: string } | null> {
    return dflowMetadataClient.getMarketMints(marketId);
  }
}

export const dflowMarketFetcher = new DFlowMarketFetcher();

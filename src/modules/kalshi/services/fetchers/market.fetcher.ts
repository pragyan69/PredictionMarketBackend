// src/modules/kalshi/services/fetchers/market.fetcher.ts

import { kalshiClient } from '../../clients/kalshi.client';
import { KalshiMarket } from '../../types/kalshi.types';

export class KalshiMarketFetcher {
  /**
   * Fetch all markets with optional status filter
   * @param activeOnly - If true, only fetch open markets
   */
  async fetchAllMarkets(activeOnly: boolean = false): Promise<KalshiMarket[]> {
    console.log(`📥 Fetching Kalshi markets (activeOnly=${activeOnly})...`);

    const status = activeOnly ? 'open' : undefined;
    const markets = await kalshiClient.getAllMarkets(status);

    console.log(`✅ Fetched ${markets.length} Kalshi markets`);
    return markets;
  }

  /**
   * Fetch a single market by ticker
   */
  async fetchMarket(ticker: string): Promise<KalshiMarket | null> {
    try {
      return await kalshiClient.getMarket(ticker);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch Kalshi market ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Fetch markets for a specific event
   */
  async fetchMarketsForEvent(eventTicker: string): Promise<KalshiMarket[]> {
    try {
      const response = await kalshiClient.getMarkets({ event_ticker: eventTicker, limit: 1000 });
      return response.markets;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch markets for Kalshi event ${eventTicker}:`, error);
      return [];
    }
  }
}

export const kalshiMarketFetcher = new KalshiMarketFetcher();

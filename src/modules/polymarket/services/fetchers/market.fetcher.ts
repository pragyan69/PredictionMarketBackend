// src/modules/polymarket/services/fetchers/market.fetcher.ts

import { gammaClient } from '../../clients/gamma.client';
import { dataClient } from '../../clients/data.client';
import { GammaMarket } from '../../types/gamma.types';
import { MarketActivityData } from '../../types/aggregation.types';

export class MarketFetcher {
  /**
   * Fetch all markets from Gamma API using pagination
   */
  async fetchAllMarkets(): Promise<GammaMarket[]> {
    console.log('📥 Fetching all markets from Gamma API...');

    try {
      const markets = await gammaClient.getAllMarkets();
      console.log(`✅ Fetched ${markets.length} markets`);
      return markets;
    } catch (error) {
      console.error('❌ Failed to fetch markets:', error);
      throw error;
    }
  }

  /**
   * Fetch market activity data for a list of markets
   * Uses rate limiting and concurrent requests with delays
   */
  async fetchMarketActivity(
    marketIds: string[],
    onProgress?: (count: number) => void
  ): Promise<Map<string, MarketActivityData>> {
    console.log(`📥 Fetching market activity for ${marketIds.length} markets...`);

    const activityMap = new Map<string, MarketActivityData>();
    let processed = 0;

    // Process in batches to respect rate limits
    const batchSize = 5; // Match Data API rate limit of 5/s

    for (let i = 0; i < marketIds.length; i += batchSize) {
      const batch = marketIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (marketId) => {
          try {
            const activity = await dataClient.getMarketActivity(marketId, { limit: 100 });
            return { marketId, activity };
          } catch (error) {
            console.warn(`⚠️ Failed to fetch activity for market ${marketId}:`, error);
            return { marketId, activity: null };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.activity) {
          const { marketId, activity } = result.value;

          // Parse activity data - structure may vary
          const activityData = this.parseActivityData(marketId, activity);
          if (activityData) {
            activityMap.set(marketId, activityData);
          }
        }
        processed++;
      }

      if (onProgress) {
        onProgress(processed);
      }

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < marketIds.length) {
        await this.delay(200);
      }
    }

    console.log(`✅ Fetched activity for ${activityMap.size} markets`);
    return activityMap;
  }

  /**
   * Parse activity data from API response
   */
  private parseActivityData(marketId: string, activity: any): MarketActivityData | null {
    if (!activity) return null;

    // Activity could be an array of trades or a summary object
    if (Array.isArray(activity)) {
      // Calculate 24h metrics from trade history
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const recentTrades = activity.filter((trade: any) => {
        const tradeTime = new Date(trade.timestamp || trade.created_at || trade.createdAt).getTime();
        return tradeTime >= oneDayAgo;
      });

      const uniqueTraders = new Set<string>();
      let volume24h = 0;

      for (const trade of recentTrades) {
        const maker = trade.maker || trade.maker_address;
        const taker = trade.taker || trade.taker_address;
        if (maker) uniqueTraders.add(maker);
        if (taker) uniqueTraders.add(taker);

        const size = parseFloat(trade.size || trade.amount || '0');
        const price = parseFloat(trade.price || '0');
        volume24h += size * price;
      }

      return {
        marketId,
        volume24h,
        trades24h: recentTrades.length,
        uniqueTraders24h: uniqueTraders.size,
      };
    }

    // If it's a summary object
    return {
      marketId,
      volume24h: parseFloat(activity.volume24h || activity.volume_24h || '0'),
      trades24h: parseInt(activity.trades24h || activity.trades_24h || '0', 10),
      uniqueTraders24h: parseInt(activity.uniqueTraders24h || activity.unique_traders_24h || '0', 10),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const marketFetcher = new MarketFetcher();

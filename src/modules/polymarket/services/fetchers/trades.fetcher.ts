// src/modules/polymarket/services/fetchers/trades.fetcher.ts

import { dataClient } from '../../clients/data.client';
import { TradeEntry } from '../../types/data.types';

export interface EnrichedTrade {
  id: string;
  market_id: string;
  condition_id: string;
  asset: string;
  user_address: string;
  side: string;
  price: number;
  size: number;
  timestamp: Date;
  transaction_hash: string;
  outcome: string;
  outcome_index: number;
  title: string;
  slug: string;
  event_slug: string;
  fetched_at: Date;
}

export class TradesFetcher {
  private readonly MAX_TRADES_PER_MARKET = 10000; // Limit per market
  private readonly BATCH_SIZE = 100;
  private readonly DELAY_BETWEEN_MARKETS = 200; // ms

  /**
   * Fetch trades for a single market (by conditionId)
   */
  async fetchTradesForMarket(conditionId: string, limit: number = 1000): Promise<EnrichedTrade[]> {
    const allTrades: EnrichedTrade[] = [];
    let offset = 0;
    const now = new Date();

    console.log(`   📊 DEBUG: Fetching trades for conditionId=${conditionId}, limit=${limit}`);
    console.log(`   🔗 URL: ${dataClient.baseUrl}/trades?market=${conditionId}`);

    try {
      while (allTrades.length < limit && allTrades.length < this.MAX_TRADES_PER_MARKET) {
        const trades = await dataClient.getTrades({
          market: [conditionId],
          limit: Math.min(this.BATCH_SIZE, limit - allTrades.length),
          offset,
          takerOnly: true,
        });

        // Debug: Verify actual data
        console.log(`   📊 DEBUG: Batch response - type: ${typeof trades}, isArray: ${Array.isArray(trades)}, length: ${trades?.length ?? 'undefined'}`);

        if (!trades || trades.length === 0) {
          console.log(`   📊 DEBUG: No more trades for this market`);
          break;
        }

        if (allTrades.length === 0 && trades.length > 0) {
          console.log(`   📊 DEBUG: First trade sample:`, JSON.stringify(trades[0], null, 2).substring(0, 500));
        }

        // Transform to enriched format
        const enriched = trades.map((trade, index) => this.transformTrade(trade, conditionId, now, offset + index));
        allTrades.push(...enriched);

        if (trades.length < this.BATCH_SIZE) {
          break; // No more trades
        }

        offset += this.BATCH_SIZE;
      }

      console.log(`   📊 DEBUG: Total trades fetched for ${conditionId}: ${allTrades.length}`);
      return allTrades;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch trades for market ${conditionId}:`, error);
      return [];
    }
  }

  /**
   * Fetch trades for multiple markets
   * @param onProgress - Callback receives (marketsDone, totalTrades, currentTradesMap), returns true to stop
   * @param maxTotalTrades - Maximum total trades to fetch (0 = unlimited)
   */
  async fetchTradesForMarkets(
    conditionIds: string[],
    tradesPerMarket: number = 100,
    onProgress?: (marketsDone: number, totalTrades: number, tradesMap: Map<string, EnrichedTrade[]>) => boolean | void | Promise<boolean | void>,
    maxTotalTrades: number = 0
  ): Promise<Map<string, EnrichedTrade[]>> {
    const limitInfo = maxTotalTrades > 0 ? `(LIMIT: ${maxTotalTrades})` : '(unlimited)';
    console.log(`📥 Fetching trades for ${conditionIds.length} markets (${tradesPerMarket} trades each) ${limitInfo}...`);

    const tradesMap = new Map<string, EnrichedTrade[]>();
    let totalTrades = 0;

    for (let i = 0; i < conditionIds.length; i++) {
      // Check if limit reached before fetching
      if (maxTotalTrades > 0 && totalTrades >= maxTotalTrades) {
        console.log(`  ⚠️ LIMIT REACHED: ${totalTrades} trades - stopping at market ${i}/${conditionIds.length}`);
        break;
      }

      const conditionId = conditionIds[i];

      const trades = await this.fetchTradesForMarket(conditionId, tradesPerMarket);

      if (trades.length > 0) {
        tradesMap.set(conditionId, trades);
        totalTrades += trades.length;
      }

      if (onProgress) {
        // Pass the current tradesMap so caller can store incrementally
        const shouldStop = await onProgress(i + 1, totalTrades, tradesMap);
        if (shouldStop) {
          console.log(`  ⚠️ Stop signal received from callback at ${totalTrades} trades`);
          break;
        }
      }

      // Progress log every 10 markets
      if ((i + 1) % 10 === 0) {
        console.log(`  📊 Processed ${i + 1}/${conditionIds.length} markets, ${totalTrades} trades total`);
      }

      // Delay to avoid rate limiting
      if (i < conditionIds.length - 1) {
        await this.delay(this.DELAY_BETWEEN_MARKETS);
      }
    }

    console.log(`✅ Fetched ${totalTrades} trades for ${tradesMap.size} markets`);
    return tradesMap;
  }

  /**
   * Transform raw trade to enriched format
   */
  private transformTrade(trade: TradeEntry, conditionId: string, fetchedAt: Date, index: number): EnrichedTrade {
    return {
      id: trade.transactionHash || `${conditionId}-${trade.timestamp}-${index}`,
      market_id: conditionId,
      condition_id: conditionId,
      asset: trade.asset || '',
      user_address: (trade.proxyWallet || '').toLowerCase(),
      side: trade.side || 'BUY',
      price: typeof trade.price === 'number' ? trade.price : parseFloat(String(trade.price)) || 0,
      size: typeof trade.size === 'number' ? trade.size : parseFloat(String(trade.size)) || 0,
      timestamp: new Date(typeof trade.timestamp === 'number' ? trade.timestamp * 1000 : trade.timestamp),
      transaction_hash: trade.transactionHash || '',
      outcome: trade.outcome || '',
      outcome_index: trade.outcomeIndex || 0,
      title: trade.title || '',
      slug: trade.slug || '',
      event_slug: trade.eventSlug || '',
      fetched_at: fetchedAt,
    };
  }

  /**
   * Flatten trades map to array for storage
   */
  flattenTrades(tradesMap: Map<string, EnrichedTrade[]>): EnrichedTrade[] {
    const allTrades: EnrichedTrade[] = [];
    for (const trades of tradesMap.values()) {
      allTrades.push(...trades);
    }
    return allTrades;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tradesFetcher = new TradesFetcher();

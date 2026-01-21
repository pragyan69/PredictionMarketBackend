// src/modules/polymarket/services/fetchers/price.fetcher.ts

import { clobClient } from '../../clients/clob.client';
import { PriceData } from '../../types/aggregation.types';

export class PriceFetcher {
  private readonly BATCH_SIZE = 50; // Max tokens per batch request

  /**
   * Fetch prices for multiple tokens in batches
   * Uses the CLOB API which requires both token_id and side parameters
   * Fetches both BUY and SELL sides to calculate mid price
   */
  async fetchPrices(
    tokenIds: string[],
    onProgress?: (count: number) => void
  ): Promise<Map<string, number>> {
    console.log(`📥 Fetching prices for ${tokenIds.length} tokens...`);

    const priceMap = new Map<string, number>();
    let processed = 0;

    // Remove duplicates
    const uniqueTokenIds = [...new Set(tokenIds)];

    // Process in batches
    for (let i = 0; i < uniqueTokenIds.length; i += this.BATCH_SIZE) {
      const batch = uniqueTokenIds.slice(i, i + this.BATCH_SIZE);

      try {
        // Use the new getPricesBothSides method that fetches both BUY and SELL
        const batchPrices = await clobClient.getPricesBothSides(batch);

        // Merge batch prices into main map
        for (const [tokenId, price] of batchPrices) {
          if (price > 0) {
            priceMap.set(tokenId, price);
          }
        }

        processed += batch.length;

        if (onProgress) {
          onProgress(processed);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch prices for batch starting at ${i}:`, error);

        // Try individual fetches as fallback
        for (const tokenId of batch) {
          try {
            const price = await this.fetchSinglePrice(tokenId);
            if (price !== null && price > 0) {
              priceMap.set(tokenId, price);
            }
          } catch (e) {
            // Skip failed tokens
          }
          processed++;
          if (onProgress) {
            onProgress(processed);
          }
        }
      }

      // Add small delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < uniqueTokenIds.length) {
        await this.delay(200);
      }
    }

    console.log(`✅ Fetched prices for ${priceMap.size}/${uniqueTokenIds.length} tokens`);
    return priceMap;
  }

  /**
   * Fetch price for a single token (mid price from both sides)
   */
  async fetchSinglePrice(tokenId: string): Promise<number | null> {
    try {
      const prices = await clobClient.getPriceBothSides(tokenId);
      return prices.mid > 0 ? prices.mid : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch price for a single token with specific side
   * @param tokenId - The token ID
   * @param side - "BUY" (best ask) or "SELL" (best bid)
   */
  async fetchSinglePriceWithSide(tokenId: string, side: "BUY" | "SELL"): Promise<number | null> {
    try {
      const priceData = await clobClient.getPrice(tokenId, side);
      return this.extractPrice(priceData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract price from various response formats
   */
  private extractPrice(data: any): number | null {
    if (data === null || data === undefined) return null;

    if (typeof data === 'number') return data;
    if (typeof data === 'string') {
      const parsed = parseFloat(data);
      return isNaN(parsed) ? null : parsed;
    }

    // Object with price field
    const priceValue =
      data.price ??
      data.mid ??
      data.midPrice ??
      data.mid_price ??
      data.last ??
      data.lastPrice ??
      data.last_price;

    if (priceValue !== undefined) {
      const parsed = parseFloat(priceValue);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const priceFetcher = new PriceFetcher();

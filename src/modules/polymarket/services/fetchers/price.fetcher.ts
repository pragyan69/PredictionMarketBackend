// src/modules/polymarket/services/fetchers/price.fetcher.ts

import { clobClient } from '../../clients/clob.client';
import { PriceData } from '../../types/aggregation.types';

export class PriceFetcher {
  private readonly BATCH_SIZE = 50; // Max tokens per batch request

  /**
   * Fetch prices for multiple tokens in batches
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
        const prices = await clobClient.getPrices(batch);

        // Parse response - could be object or array
        if (prices) {
          this.parsePricesResponse(prices, batch, priceMap);
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
            if (price !== null) {
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

      // Add small delay between batches
      if (i + this.BATCH_SIZE < uniqueTokenIds.length) {
        await this.delay(100);
      }
    }

    console.log(`✅ Fetched prices for ${priceMap.size} tokens`);
    return priceMap;
  }

  /**
   * Fetch price for a single token
   */
  async fetchSinglePrice(tokenId: string): Promise<number | null> {
    try {
      const priceData = await clobClient.getPrice(tokenId);
      return this.extractPrice(priceData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse batch prices response
   */
  private parsePricesResponse(
    response: any,
    requestedTokenIds: string[],
    priceMap: Map<string, number>
  ): void {
    if (Array.isArray(response)) {
      // Response is array of price objects
      for (const item of response) {
        const tokenId = item.token_id || item.tokenId || item.asset_id || item.assetId;
        const price = this.extractPrice(item);
        if (tokenId && price !== null) {
          priceMap.set(tokenId, price);
        }
      }
    } else if (typeof response === 'object') {
      // Response is object with tokenId keys or nested structure
      for (const tokenId of requestedTokenIds) {
        const priceData = response[tokenId];
        if (priceData !== undefined) {
          const price = typeof priceData === 'number'
            ? priceData
            : this.extractPrice(priceData);
          if (price !== null) {
            priceMap.set(tokenId, price);
          }
        }
      }
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

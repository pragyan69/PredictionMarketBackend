// src/modules/polymarket/services/fetchers/orderbook.fetcher.ts

import { clobClient } from '../../clients/clob.client';
import { OrderbookSummary, OrderbookResponse } from '../../types/aggregation.types';

export class OrderbookFetcher {
  private readonly CONCURRENT_LIMIT = 5; // Concurrent requests
  private readonly DELAY_BETWEEN_BATCHES = 500; // ms

  /**
   * Fetch orderbooks for multiple tokens with rate limiting
   */
  async fetchOrderbooks(
    tokenIds: string[],
    onProgress?: (count: number) => void
  ): Promise<Map<string, OrderbookSummary>> {
    console.log(`📥 Fetching orderbooks for ${tokenIds.length} tokens...`);

    const orderbookMap = new Map<string, OrderbookSummary>();
    let processed = 0;

    // Remove duplicates
    const uniqueTokenIds = [...new Set(tokenIds)];

    // Process with concurrency limit
    for (let i = 0; i < uniqueTokenIds.length; i += this.CONCURRENT_LIMIT) {
      const batch = uniqueTokenIds.slice(i, i + this.CONCURRENT_LIMIT);

      const results = await Promise.allSettled(
        batch.map(async (tokenId) => {
          try {
            const orderbook = await clobClient.getOrderBook(tokenId);
            return { tokenId, orderbook };
          } catch (error) {
            return { tokenId, orderbook: null };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.orderbook) {
          const { tokenId, orderbook } = result.value;
          const summary = this.parseOrderbook(tokenId, orderbook);
          if (summary) {
            orderbookMap.set(tokenId, summary);
          }
        }
        processed++;
      }

      if (onProgress) {
        onProgress(processed);
      }

      // Delay between batches to respect rate limits
      if (i + this.CONCURRENT_LIMIT < uniqueTokenIds.length) {
        await this.delay(this.DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`✅ Fetched orderbooks for ${orderbookMap.size} tokens`);
    return orderbookMap;
  }

  /**
   * Fetch orderbook for a single token
   */
  async fetchSingleOrderbook(tokenId: string): Promise<OrderbookSummary | null> {
    try {
      const orderbook = await clobClient.getOrderBook(tokenId);
      return this.parseOrderbook(tokenId, orderbook);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse orderbook response into summary
   */
  private parseOrderbook(tokenId: string, orderbook: OrderbookResponse | null): OrderbookSummary | null {
    if (!orderbook) return null;

    const bids = this.parseOrders(orderbook.bids);
    const asks = this.parseOrders(orderbook.asks);

    if (bids.length === 0 && asks.length === 0) {
      return null;
    }

    const bestBid = bids.length > 0 ? Math.max(...bids.map(o => o.price)) : 0;
    const bestAsk = asks.length > 0 ? Math.min(...asks.map(o => o.price)) : 0;

    const midPrice = bestBid > 0 && bestAsk > 0
      ? (bestBid + bestAsk) / 2
      : bestBid > 0 ? bestBid : bestAsk;

    const spread = bestBid > 0 && bestAsk > 0
      ? bestAsk - bestBid
      : 0;

    const bidDepth = bids.reduce((sum, o) => sum + o.size * o.price, 0);
    const askDepth = asks.reduce((sum, o) => sum + o.size * o.price, 0);

    return {
      tokenId,
      bestBid,
      bestAsk,
      midPrice,
      spread,
      bidDepth,
      askDepth,
    };
  }

  /**
   * Parse order array from various formats
   */
  private parseOrders(orders: any): Array<{ price: number; size: number }> {
    if (!orders || !Array.isArray(orders)) return [];

    return orders
      .map((order) => {
        let price: number;
        let size: number;

        if (Array.isArray(order)) {
          // [price, size] format
          price = parseFloat(order[0]);
          size = parseFloat(order[1]);
        } else if (typeof order === 'object') {
          // { price, size } format
          price = parseFloat(order.price ?? order.p ?? '0');
          size = parseFloat(order.size ?? order.quantity ?? order.q ?? order.amount ?? '0');
        } else {
          return null;
        }

        if (isNaN(price) || isNaN(size)) return null;
        return { price, size };
      })
      .filter((o): o is { price: number; size: number } => o !== null);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const orderbookFetcher = new OrderbookFetcher();

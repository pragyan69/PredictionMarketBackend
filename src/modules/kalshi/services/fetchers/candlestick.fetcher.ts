// src/modules/kalshi/services/fetchers/candlestick.fetcher.ts

import { kalshiClient } from '../../clients/kalshi.client';
import { KalshiCandlestick, KalshiMarket } from '../../types/kalshi.types';

export interface CandlestickFetchResult {
  ticker: string;
  candlesticks: KalshiCandlestick[];
}

export class KalshiCandlestickFetcher {
  private readonly DELAY_BETWEEN_FETCHES = 200; // ms

  /**
   * Fetch candlesticks for a single market
   * @param market - The market to fetch candlesticks for
   * @param startTs - Start timestamp (Unix seconds)
   * @param endTs - End timestamp (Unix seconds)
   * @param periodInterval - Candle period: 1 (minute), 60 (hour), 1440 (day)
   */
  async fetchMarketCandlesticks(
    market: KalshiMarket,
    startTs: number,
    endTs: number,
    periodInterval: 1 | 60 | 1440 = 60
  ): Promise<CandlestickFetchResult> {
    try {
      // Extract series ticker from event ticker
      // Kalshi event tickers often follow pattern: SERIES-DATE or SERIES-DETAILS
      const seriesTicker = this.extractSeriesTicker(market.event_ticker);

      const response = await kalshiClient.getMarketCandlesticks(
        seriesTicker,
        market.ticker,
        startTs,
        endTs,
        periodInterval
      );

      return {
        ticker: market.ticker,
        candlesticks: response.candlesticks,
      };
    } catch (error) {
      console.warn(`⚠️ Failed to fetch candlesticks for market ${market.ticker}:`, error);
      return {
        ticker: market.ticker,
        candlesticks: [],
      };
    }
  }

  /**
   * Fetch candlesticks for multiple markets
   */
  async fetchCandlesticksForMarkets(
    markets: KalshiMarket[],
    startTs: number,
    endTs: number,
    periodInterval: 1 | 60 | 1440 = 60,
    onProgress?: (count: number) => void
  ): Promise<Map<string, KalshiCandlestick[]>> {
    const candlestickMap = new Map<string, KalshiCandlestick[]>();

    console.log(`📥 Fetching candlesticks for ${markets.length} markets...`);

    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      const result = await this.fetchMarketCandlesticks(market, startTs, endTs, periodInterval);

      if (result.candlesticks.length > 0) {
        candlestickMap.set(result.ticker, result.candlesticks);
      }

      if (onProgress) {
        onProgress(i + 1);
      }

      // Progress log every 50 markets
      if ((i + 1) % 50 === 0) {
        console.log(`  📊 Processed ${i + 1}/${markets.length} markets`);
      }

      // Delay to avoid rate limiting
      if (i < markets.length - 1) {
        await this.delay(this.DELAY_BETWEEN_FETCHES);
      }
    }

    console.log(`✅ Fetched candlesticks for ${candlestickMap.size} markets`);
    return candlestickMap;
  }

  /**
   * Extract series ticker from event ticker
   * Event ticker format examples: INXD-23SEP14, FED-23DEC, KXBTCD-25AUG0517
   */
  private extractSeriesTicker(eventTicker: string): string {
    // Series ticker is usually the first part before the dash with date
    const parts = eventTicker.split('-');
    if (parts.length > 0) {
      return parts[0];
    }
    return eventTicker;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const kalshiCandlestickFetcher = new KalshiCandlestickFetcher();

// src/modules/dflow/clients/metadata.client.ts

import axios, { AxiosInstance } from 'axios';
import {
  DFlowEvent,
  DFlowMarket,
  DFlowTrade,
  Orderbook,
  TradesResponse,
  DFLOW_CONSTANTS,
} from '../types/dflow.types';

export class DFlowMetadataClient {
  private client: AxiosInstance;
  public readonly baseUrl: string;

  constructor(apiKey?: string) {
    this.baseUrl = process.env.DFLOW_METADATA_API_URL || DFLOW_CONSTANTS.METADATA_API_URL;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(apiKey && { 'x-api-key': apiKey }),
      },
    });

    // Debug request/response logging
    this.client.interceptors.request.use((config) => {
      console.log('➡️  DFlow Metadata REQUEST', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (res) => {
        const dataInfo = Array.isArray(res.data)
          ? `Array[${res.data.length}]`
          : typeof res.data === 'object'
          ? `Object keys: ${Object.keys(res.data || {}).slice(0, 5).join(', ')}`
          : typeof res.data;
        console.log('✅ DFlow Metadata RESPONSE', {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
          dataType: dataInfo,
        });
        return res;
      },
      (err) => {
        console.error('❌ DFlow Metadata ERROR', {
          message: err.message,
          code: err.code,
          url: err.config?.url,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    console.log(`✅ DFlow Metadata API client ready: ${this.baseUrl}`);
  }

  /**
   * Get all events with their nested markets
   *
   * @param params.limit - Number of events to return
   * @param params.offset - Pagination offset
   * @param params.status - Filter by status ('active', 'resolved', etc.)
   * @param params.category - Filter by category
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
  }): Promise<DFlowEvent[]> {
    const response = await this.client.get('/api/v1/events', { params });
    return response.data;
  }

  /**
   * Get a single event by ID
   */
  async getEventById(eventId: string): Promise<DFlowEvent> {
    const response = await this.client.get(`/api/v1/events/${eventId}`);
    return response.data;
  }

  /**
   * Get all markets
   *
   * @param params.limit - Number of markets to return
   * @param params.offset - Pagination offset
   * @param params.status - Filter by status
   */
  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<DFlowMarket[]> {
    // Try to get markets from events endpoint or direct markets endpoint
    try {
      const response = await this.client.get('/api/v1/markets', { params });
      return response.data;
    } catch (error: any) {
      // Handle 403 Forbidden - API key may be missing or invalid
      if (error?.response?.status === 403) {
        console.error('❌ DFlow getMarkets error: Request failed with status code 403 - API access forbidden. Check DFLOW_API_KEY.');
        return [];
      }
      // Fallback: extract markets from events
      try {
        const events = await this.getEvents(params);
        const markets: DFlowMarket[] = [];
        for (const event of events) {
          if (event.markets) {
            markets.push(...event.markets);
          }
        }
        return markets;
      } catch (fallbackError: any) {
        // If fallback also fails with 403, return empty array instead of throwing
        if (fallbackError?.response?.status === 403) {
          console.error('❌ DFlow getEvents fallback error: Request failed with status code 403 - API access forbidden. Check DFLOW_API_KEY.');
          return [];
        }
        throw fallbackError;
      }
    }
  }

  /**
   * Get a single market by ID
   * Returns market with accounts containing yesMint, noMint, etc.
   */
  async getMarketById(marketId: string): Promise<DFlowMarket> {
    const response = await this.client.get(`/api/v1/market/${marketId}`);
    return response.data;
  }

  /**
   * Get a market by ticker
   */
  async getMarketByTicker(ticker: string): Promise<DFlowMarket> {
    const response = await this.client.get(`/api/v1/market/ticker/${ticker}`);
    return response.data;
  }

  /**
   * Get orderbook for a market
   *
   * @param marketTicker - The market ticker (e.g., "TRUMP-WIN-2024")
   */
  async getOrderbook(marketTicker: string): Promise<Orderbook> {
    const response = await this.client.get(`/api/v1/orderbook/${marketTicker}`);
    return response.data;
  }

  /**
   * Get trades for a market
   *
   * @param params.marketId - Filter by market ID
   * @param params.marketTicker - Filter by market ticker
   * @param params.limit - Number of trades to return
   * @param params.cursor - Pagination cursor for next page
   */
  async getTrades(params?: {
    marketId?: string;
    marketTicker?: string;
    limit?: number;
    cursor?: string;
  }): Promise<TradesResponse> {
    const response = await this.client.get('/api/v1/trades', { params });
    return response.data;
  }

  /**
   * Get market prices
   * Returns both YES and NO prices for a market
   */
  async getMarketPrices(marketId: string): Promise<{ yesPrice: number; noPrice: number }> {
    try {
      const market = await this.getMarketById(marketId);
      return {
        yesPrice: market.yesPrice || 0,
        noPrice: market.noPrice || 0,
      };
    } catch {
      return { yesPrice: 0, noPrice: 0 };
    }
  }

  /**
   * Get market mints (yesMint and noMint addresses)
   * These are needed for creating swap transactions
   */
  async getMarketMints(marketId: string): Promise<{ yesMint: string; noMint: string } | null> {
    try {
      const market = await this.getMarketById(marketId);
      if (market.accounts?.yesMint && market.accounts?.noMint) {
        return {
          yesMint: market.accounts.yesMint,
          noMint: market.accounts.noMint,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search markets by title/description
   */
  async searchMarkets(query: string, limit: number = 20): Promise<DFlowMarket[]> {
    try {
      const response = await this.client.get('/api/v1/markets/search', {
        params: { q: query, limit },
      });
      return response.data;
    } catch {
      // Fallback: get all markets and filter locally
      const allMarkets = await this.getMarkets({ limit: 100 });
      const lowerQuery = query.toLowerCase();
      return allMarkets.filter(
        (m) =>
          m.title?.toLowerCase().includes(lowerQuery) ||
          m.description?.toLowerCase().includes(lowerQuery) ||
          m.ticker?.toLowerCase().includes(lowerQuery)
      );
    }
  }

  /**
   * Get active markets only
   */
  async getActiveMarkets(limit?: number): Promise<DFlowMarket[]> {
    return this.getMarkets({ status: 'active', limit });
  }

  /**
   * Get resolved markets
   */
  async getResolvedMarkets(limit?: number): Promise<DFlowMarket[]> {
    return this.getMarkets({ status: 'resolved', limit });
  }
}

// Export singleton instance
export const dflowMetadataClient = new DFlowMetadataClient(process.env.DFLOW_API_KEY);

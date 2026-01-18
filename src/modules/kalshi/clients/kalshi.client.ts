// src/modules/kalshi/clients/kalshi.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import {
  KalshiMarket,
  KalshiMarketsResponse,
  KalshiMarketResponse,
  KalshiEvent,
  KalshiEventsResponse,
  KalshiEventResponse,
  KalshiMarketCandlesticksResponse,
  KalshiEventCandlesticksResponse,
  KalshiLiveDataResponse,
  KalshiBatchLiveDataResponse,
} from '../types/kalshi.types';
import { rateLimitManager } from '../../polymarket/utils/rateLimit';

export class KalshiAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'kalshi_api';

  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(env.kalshi?.apiKey ? { 'Authorization': `Bearer ${env.kalshi.apiKey}` } : {}),
      },
    });

    // Debug request interceptor
    this.client.interceptors.request.use((config) => {
      console.log('➡️  KALSHI API REQUEST', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    // Debug response/error interceptor
    this.client.interceptors.response.use(
      (res) => {
        const dataInfo = Array.isArray(res.data)
          ? `Array[${res.data.length}]`
          : typeof res.data === 'object'
          ? `Object keys: ${Object.keys(res.data || {}).join(', ')}`
          : typeof res.data;
        console.log('✅ KALSHI API RESPONSE', {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
          dataType: dataInfo,
        });
        return res;
      },
      (err) => {
        console.error('❌ KALSHI API ERROR', {
          message: err.message,
          code: err.code,
          url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
          method: err.config?.method,
          params: err.config?.params,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit?.kalshiApi || 5);

    console.log(`✅ Kalshi API client ready: ${this.baseUrl}`);
  }

  // ============================================
  // Markets Endpoints
  // ============================================

  /**
   * Get a single market by ticker
   * GET /markets/{ticker}
   */
  async getMarket(ticker: string): Promise<KalshiMarket> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiMarketResponse>(`/markets/${ticker}`);
    return response.data.market;
  }

  /**
   * Get markets with pagination and filters
   * GET /markets
   */
  async getMarkets(params?: {
    limit?: number;
    cursor?: string;
    event_ticker?: string;
    series_ticker?: string;
    status?: 'unopened' | 'open' | 'paused' | 'closed' | 'settled';
    tickers?: string;
    mve_filter?: 'only' | 'exclude';
    min_created_ts?: number;
    max_created_ts?: number;
    min_close_ts?: number;
    max_close_ts?: number;
    min_settled_ts?: number;
    max_settled_ts?: number;
  }): Promise<KalshiMarketsResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiMarketsResponse>('/markets', { params });
    return response.data;
  }

  /**
   * Fetch all markets with pagination
   * @param status - Optional filter by status ('open' for active markets)
   */
  async getAllMarkets(status?: 'unopened' | 'open' | 'paused' | 'closed' | 'settled'): Promise<KalshiMarket[]> {
    const allMarkets: KalshiMarket[] = [];
    let cursor: string | undefined;
    const limit = 1000;

    console.log(`📥 Fetching all Kalshi markets (status=${status || 'all'})...`);

    while (true) {
      const params: any = { limit };
      if (cursor) params.cursor = cursor;
      if (status) params.status = status;

      const response = await this.getMarkets(params);

      if (!response.markets || response.markets.length === 0) {
        break;
      }

      allMarkets.push(...response.markets);
      console.log(`  Fetched ${allMarkets.length} markets...`);

      if (response.markets.length < limit || !response.cursor) {
        break;
      }

      cursor = response.cursor;
    }

    console.log(`✅ Total Kalshi markets fetched: ${allMarkets.length}`);
    return allMarkets;
  }

  // ============================================
  // Events Endpoints
  // ============================================

  /**
   * Get a single event by ticker
   * GET /events/{event_ticker}
   */
  async getEvent(eventTicker: string, withNestedMarkets: boolean = false): Promise<KalshiEventResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiEventResponse>(`/events/${eventTicker}`, {
      params: { with_nested_markets: withNestedMarkets },
    });
    return response.data;
  }

  /**
   * Get events with pagination and filters
   * GET /events
   */
  async getEvents(params?: {
    limit?: number;
    cursor?: string;
    with_nested_markets?: boolean;
    with_milestones?: boolean;
    status?: 'open' | 'closed' | 'settled';
    series_ticker?: string;
    min_close_ts?: number;
  }): Promise<KalshiEventsResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiEventsResponse>('/events', { params });
    return response.data;
  }

  /**
   * Fetch all events with pagination
   * @param status - Optional filter by status ('open' for active events)
   */
  async getAllEvents(status?: 'open' | 'closed' | 'settled'): Promise<KalshiEvent[]> {
    const allEvents: KalshiEvent[] = [];
    let cursor: string | undefined;
    const limit = 200;

    console.log(`📥 Fetching all Kalshi events (status=${status || 'all'})...`);

    while (true) {
      const params: any = { limit, with_nested_markets: true };
      if (cursor) params.cursor = cursor;
      if (status) params.status = status;

      const response = await this.getEvents(params);

      if (!response.events || response.events.length === 0) {
        break;
      }

      allEvents.push(...response.events);
      console.log(`  Fetched ${allEvents.length} events...`);

      if (response.events.length < limit || !response.cursor) {
        break;
      }

      cursor = response.cursor;
    }

    console.log(`✅ Total Kalshi events fetched: ${allEvents.length}`);
    return allEvents;
  }

  // ============================================
  // Candlesticks Endpoints
  // ============================================

  /**
   * Get candlesticks for a market
   * GET /series/{series_ticker}/markets/{ticker}/candlesticks
   */
  async getMarketCandlesticks(
    seriesTicker: string,
    marketTicker: string,
    startTs: number,
    endTs: number,
    periodInterval: 1 | 60 | 1440
  ): Promise<KalshiMarketCandlesticksResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiMarketCandlesticksResponse>(
      `/series/${seriesTicker}/markets/${marketTicker}/candlesticks`,
      {
        params: {
          start_ts: startTs,
          end_ts: endTs,
          period_interval: periodInterval,
        },
      }
    );
    return response.data;
  }

  /**
   * Get candlesticks for an event (all markets in the event)
   * GET /series/{series_ticker}/events/{ticker}/candlesticks
   */
  async getEventCandlesticks(
    seriesTicker: string,
    eventTicker: string,
    startTs: number,
    endTs: number,
    periodInterval: 1 | 60 | 1440
  ): Promise<KalshiEventCandlesticksResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiEventCandlesticksResponse>(
      `/series/${seriesTicker}/events/${eventTicker}/candlesticks`,
      {
        params: {
          start_ts: startTs,
          end_ts: endTs,
          period_interval: periodInterval,
        },
      }
    );
    return response.data;
  }

  // ============================================
  // Live Data Endpoints
  // ============================================

  /**
   * Get live data for a milestone
   * GET /live_data/{type}/milestone/{milestone_id}
   */
  async getLiveData(type: string, milestoneId: string): Promise<KalshiLiveDataResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiLiveDataResponse>(`/live_data/${type}/milestone/${milestoneId}`);
    return response.data;
  }

  /**
   * Get live data for multiple milestones
   * GET /live_data/batch
   */
  async getBatchLiveData(milestoneIds: string[]): Promise<KalshiBatchLiveDataResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<KalshiBatchLiveDataResponse>('/live_data/batch', {
      params: { milestone_ids: milestoneIds },
    });
    return response.data;
  }
}

export const kalshiClient = new KalshiAPIClient();

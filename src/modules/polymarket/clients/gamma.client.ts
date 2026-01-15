// src/modules/polymarket/clients/gamma.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { GammaMarket, GammaMarketsResponse, GammaEvent } from '../types/gamma.types';
import { rateLimitManager } from '../utils/rateLimit';

export class GammaAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'gamma_api';

  constructor() {
    this.client = axios.create({
      baseURL: env.polymarket.gammaApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.gammaApi);
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    next_cursor?: string;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
  }): Promise<GammaMarketsResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<GammaMarketsResponse>('/markets', { params });
    return response.data;
  }

  async getMarketBySlug(slug: string): Promise<GammaMarket> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<GammaMarket>(`/markets/${slug}`);
    return response.data;
  }

  async getMarketByConditionId(conditionId: string): Promise<GammaMarket> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<GammaMarket>(`/markets`, {
      params: { condition_id: conditionId },
    });
    return response.data;
  }

  async getEvents(): Promise<GammaEvent[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<GammaEvent[]>('/events');
    return response.data;
  }

  async getEventBySlug(slug: string): Promise<GammaEvent> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<GammaEvent>(`/events/${slug}`);
    return response.data;
  }

  async getAllMarkets(): Promise<GammaMarket[]> {
    const allMarkets: GammaMarket[] = [];
    let nextCursor: string | undefined = undefined;

    do {
      const response = await this.getMarkets({
        limit: 100,
        next_cursor: nextCursor,
      });

      allMarkets.push(...response.data);
      nextCursor = response.next_cursor;

      console.log(`Fetched ${allMarkets.length} markets...`);
    } while (nextCursor);

    return allMarkets;
  }
}

export const gammaClient = new GammaAPIClient();

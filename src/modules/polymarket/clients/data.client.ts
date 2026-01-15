// src/modules/polymarket/clients/data.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { DataAPILeaderboardEntry, DataAPIPosition, DataAPIMarketActivity } from '../types/data.types';
import { rateLimitManager } from '../utils/rateLimit';

export class DataAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'data_api';

  constructor() {
    this.client = axios.create({
      baseURL: env.polymarket.dataApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.dataApi);
  }

  async getLeaderboard(params?: {
    period?: 'all' | 'daily' | 'weekly' | 'monthly';
    limit?: number;
  }): Promise<DataAPILeaderboardEntry[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<DataAPILeaderboardEntry[]>('/trader-leaderboard', { params });
    return response.data;
  }

  async getCurrentPositions(address: string): Promise<DataAPIPosition[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<DataAPIPosition[]>('/current-positions', {
      params: { address },
    });
    return response.data;
  }

  async getMarketActivity(marketId: string): Promise<DataAPIMarketActivity> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<DataAPIMarketActivity>(`/market-activity/${marketId}`);
    return response.data;
  }

  async getUserActivity(address: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<any> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get('/user-activity', {
      params: { address, ...params },
    });
    return response.data;
  }
}

export const dataClient = new DataAPIClient();

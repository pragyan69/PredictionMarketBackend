// src/modules/polymarket/clients/clob.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { CLOBTrade, CLOBOrderBook, CLOBPrice } from '../types/clob.types';
import { rateLimitManager } from '../utils/rateLimit';

export class CLOBAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'clob_api';

  constructor() {
    this.client = axios.create({
      baseURL: env.polymarket.clobApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.clobApi);
  }

  async getTrades(tokenId: string, params?: {
    startTs?: number;
    endTs?: number;
    limit?: number;
    offset?: number;
  }): Promise<CLOBTrade[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<CLOBTrade[]>('/trades', {
      params: {
        token_id: tokenId,
        ...params,
      },
    });
    return response.data;
  }

  async getOrderBook(tokenId: string): Promise<CLOBOrderBook> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<CLOBOrderBook>('/book', {
      params: { token_id: tokenId },
    });
    return response.data;
  }

  async getPrice(tokenId: string): Promise<CLOBPrice> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<CLOBPrice>('/price', {
      params: { token_id: tokenId },
    });
    return response.data;
  }

  async getPrices(tokenIds: string[]): Promise<CLOBPrice[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    
    const response = await this.client.get<CLOBPrice[]>('/prices', {
      params: { token_ids: tokenIds.join(',') },
    });
    return response.data;
  }

  async getAllTrades(tokenId: string): Promise<CLOBTrade[]> {
    const allTrades: CLOBTrade[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const trades = await this.getTrades(tokenId, { limit, offset });
      
      if (trades.length === 0) break;
      
      allTrades.push(...trades);
      offset += limit;

      console.log(`Fetched ${allTrades.length} trades for token ${tokenId}...`);
    }

    return allTrades;
  }
}

export const clobClient = new CLOBAPIClient();

// src/modules/polymarket/clients/trading.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { rateLimitManager } from '../utils/rateLimit';
import { buildL2Headers } from '../utils/orderSigner';
import { PolymarketCredentials } from '../../auth/types/auth.types';
import {
  SignedOrder,
  OrderType,
  OrderResponse,
  OpenOrder,
  CancelResponse,
  Trade,
  PostOrderRequest,
} from '../types/trading.types';

export class PolymarketTradingClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'poly_trading';
  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.polymarket.clobApiUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Debug interceptors
    this.client.interceptors.request.use((config) => {
      console.log('➡️  POLY TRADING REQUEST', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (res) => {
        console.log('✅ POLY TRADING RESPONSE', {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
        });
        return res;
      },
      (err) => {
        console.error('❌ POLY TRADING ERROR', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, 10);
    console.log(`✅ Polymarket Trading client ready: ${this.baseUrl}`);
  }

  /**
   * Post a signed order to the CLOB
   */
  async postOrder(
    order: SignedOrder,
    orderType: OrderType,
    credentials: PolymarketCredentials
  ): Promise<OrderResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const body: PostOrderRequest = {
      order,
      owner: credentials.apiKey,
      orderType,
    };

    const bodyStr = JSON.stringify(body);
    const headers = buildL2Headers(credentials, 'POST', '/order', bodyStr);

    const response = await this.client.post<OrderResponse>('/order', body, { headers });
    return response.data;
  }

  /**
   * Get a single order by ID
   */
  async getOrder(
    orderId: string,
    credentials: PolymarketCredentials
  ): Promise<OpenOrder | null> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = `/data/order/${orderId}`;
    const headers = buildL2Headers(credentials, 'GET', path);

    try {
      const response = await this.client.get<OpenOrder>(path, { headers });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get open orders with optional filters
   */
  async getOpenOrders(
    credentials: PolymarketCredentials,
    params?: {
      market?: string;
      asset_id?: string;
    }
  ): Promise<OpenOrder[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const queryParams = new URLSearchParams();
    if (params?.market) queryParams.set('market', params.market);
    if (params?.asset_id) queryParams.set('asset_id', params.asset_id);

    const path = `/data/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const headers = buildL2Headers(credentials, 'GET', path);

    const response = await this.client.get<OpenOrder[]>(path, { headers });
    return response.data || [];
  }

  /**
   * Cancel a single order
   */
  async cancelOrder(
    orderId: string,
    credentials: PolymarketCredentials
  ): Promise<CancelResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const body = { orderID: orderId };
    const bodyStr = JSON.stringify(body);
    const headers = buildL2Headers(credentials, 'DELETE', '/order', bodyStr);

    const response = await this.client.delete<CancelResponse>('/order', {
      headers,
      data: body,
    });
    return response.data;
  }

  /**
   * Cancel multiple orders
   */
  async cancelOrders(
    orderIds: string[],
    credentials: PolymarketCredentials
  ): Promise<CancelResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const bodyStr = JSON.stringify(orderIds);
    const headers = buildL2Headers(credentials, 'DELETE', '/orders', bodyStr);

    const response = await this.client.delete<CancelResponse>('/orders', {
      headers,
      data: orderIds,
    });
    return response.data;
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(credentials: PolymarketCredentials): Promise<CancelResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const headers = buildL2Headers(credentials, 'DELETE', '/cancel-all');

    const response = await this.client.delete<CancelResponse>('/cancel-all', { headers });
    return response.data;
  }

  /**
   * Cancel orders for a specific market
   */
  async cancelMarketOrders(
    credentials: PolymarketCredentials,
    params: {
      market?: string;
      asset_id?: string;
    }
  ): Promise<CancelResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const body = params;
    const bodyStr = JSON.stringify(body);
    const headers = buildL2Headers(credentials, 'DELETE', '/cancel-market-orders', bodyStr);

    const response = await this.client.delete<CancelResponse>('/cancel-market-orders', {
      headers,
      data: body,
    });
    return response.data;
  }

  /**
   * Get user trades
   */
  async getTrades(
    credentials: PolymarketCredentials,
    params?: {
      market?: string;
      asset_id?: string;
      before?: string;
      after?: string;
    }
  ): Promise<Trade[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const queryParams = new URLSearchParams();
    if (params?.market) queryParams.set('market', params.market);
    if (params?.asset_id) queryParams.set('asset_id', params.asset_id);
    if (params?.before) queryParams.set('before', params.before);
    if (params?.after) queryParams.set('after', params.after);

    const path = `/data/trades${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const headers = buildL2Headers(credentials, 'GET', path);

    const response = await this.client.get<Trade[]>(path, { headers });
    return response.data || [];
  }

  /**
   * Check if order is scoring (for reward eligibility)
   */
  async isOrderScoring(
    orderId: string,
    credentials: PolymarketCredentials
  ): Promise<boolean> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const body = { orderId };
    const bodyStr = JSON.stringify(body);
    const headers = buildL2Headers(credentials, 'POST', '/is-order-scoring', bodyStr);

    try {
      const response = await this.client.post<{ scoring: boolean }>(
        '/is-order-scoring',
        body,
        { headers }
      );
      return response.data.scoring;
    } catch {
      return false;
    }
  }
}

export const polymarketTradingClient = new PolymarketTradingClient();

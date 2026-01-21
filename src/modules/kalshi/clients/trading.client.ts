// src/modules/kalshi/clients/trading.client.ts

import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { rateLimitManager } from '../../polymarket/utils/rateLimit';
import { buildKalshiAuthHeaders } from '../utils/rsaSigner';
import { KalshiCredentials } from '../../auth/types/auth.types';
import {
  KalshiCreateOrderRequest,
  KalshiCreateOrderResponse,
  KalshiGetOrderResponse,
  KalshiGetOrdersResponse,
  KalshiCancelOrderResponse,
  KalshiBatchCancelResponse,
  KalshiQueuePositionsResponse,
  KalshiBalanceResponse,
  KalshiPositionsResponse,
} from '../types/trading.types';

export class KalshiTradingClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = 'kalshi_trading';
  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.kalshi.apiUrl;

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
      console.log('➡️  KALSHI TRADING REQUEST', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (res) => {
        console.log('✅ KALSHI TRADING RESPONSE', {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
        });
        return res;
      },
      (err) => {
        console.error('❌ KALSHI TRADING ERROR', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, 10);
    console.log(`✅ Kalshi Trading client ready: ${this.baseUrl}`);
  }

  /**
   * Create an order
   * POST /portfolio/orders
   */
  async createOrder(
    request: KalshiCreateOrderRequest,
    credentials: KalshiCredentials
  ): Promise<KalshiCreateOrderResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = '/portfolio/orders';
    const bodyStr = JSON.stringify(request);
    const headers = buildKalshiAuthHeaders(credentials, 'POST', path, bodyStr);

    const response = await this.client.post<KalshiCreateOrderResponse>(path, request, {
      headers,
    });
    return response.data;
  }

  /**
   * Get a single order
   * GET /portfolio/orders/{order_id}
   */
  async getOrder(
    orderId: string,
    credentials: KalshiCredentials
  ): Promise<KalshiGetOrderResponse | null> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = `/portfolio/orders/${orderId}`;
    const headers = buildKalshiAuthHeaders(credentials, 'GET', path);

    try {
      const response = await this.client.get<KalshiGetOrderResponse>(path, { headers });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get orders
   * GET /portfolio/orders
   */
  async getOrders(
    credentials: KalshiCredentials,
    params?: {
      ticker?: string;
      status?: string;
      min_ts?: number;
      max_ts?: number;
      limit?: number;
      cursor?: string;
    }
  ): Promise<KalshiGetOrdersResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const queryParams = new URLSearchParams();
    if (params?.ticker) queryParams.set('ticker', params.ticker);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.min_ts) queryParams.set('min_ts', params.min_ts.toString());
    if (params?.max_ts) queryParams.set('max_ts', params.max_ts.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.cursor) queryParams.set('cursor', params.cursor);

    const path = `/portfolio/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const headers = buildKalshiAuthHeaders(credentials, 'GET', path);

    const response = await this.client.get<KalshiGetOrdersResponse>(path, { headers });
    return response.data;
  }

  /**
   * Cancel an order
   * DELETE /portfolio/orders/{order_id}
   */
  async cancelOrder(
    orderId: string,
    credentials: KalshiCredentials
  ): Promise<KalshiCancelOrderResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = `/portfolio/orders/${orderId}`;
    const headers = buildKalshiAuthHeaders(credentials, 'DELETE', path);

    const response = await this.client.delete<KalshiCancelOrderResponse>(path, { headers });
    return response.data;
  }

  /**
   * Batch cancel orders (up to 20)
   * DELETE /portfolio/orders/batched
   */
  async batchCancelOrders(
    orderIds: string[],
    credentials: KalshiCredentials
  ): Promise<KalshiBatchCancelResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    if (orderIds.length > 20) {
      throw new Error('Cannot cancel more than 20 orders at once');
    }

    const path = '/portfolio/orders/batched';
    const body = { order_ids: orderIds };
    const bodyStr = JSON.stringify(body);
    const headers = buildKalshiAuthHeaders(credentials, 'DELETE', path, bodyStr);

    const response = await this.client.delete<KalshiBatchCancelResponse>(path, {
      headers,
      data: body,
    });
    return response.data;
  }

  /**
   * Get queue positions for resting orders
   * GET /portfolio/orders/queue_position
   */
  async getQueuePositions(
    credentials: KalshiCredentials
  ): Promise<KalshiQueuePositionsResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = '/portfolio/orders/queue_position';
    const headers = buildKalshiAuthHeaders(credentials, 'GET', path);

    const response = await this.client.get<KalshiQueuePositionsResponse>(path, { headers });
    return response.data;
  }

  /**
   * Get account balance
   * GET /portfolio/balance
   */
  async getBalance(credentials: KalshiCredentials): Promise<KalshiBalanceResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const path = '/portfolio/balance';
    const headers = buildKalshiAuthHeaders(credentials, 'GET', path);

    const response = await this.client.get<KalshiBalanceResponse>(path, { headers });
    return response.data;
  }

  /**
   * Get positions
   * GET /portfolio/positions
   */
  async getPositions(
    credentials: KalshiCredentials,
    params?: {
      ticker?: string;
      settlement_status?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<KalshiPositionsResponse> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const queryParams = new URLSearchParams();
    if (params?.ticker) queryParams.set('ticker', params.ticker);
    if (params?.settlement_status) queryParams.set('settlement_status', params.settlement_status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.cursor) queryParams.set('cursor', params.cursor);

    const path = `/portfolio/positions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const headers = buildKalshiAuthHeaders(credentials, 'GET', path);

    const response = await this.client.get<KalshiPositionsResponse>(path, { headers });
    return response.data;
  }
}

export const kalshiTradingClient = new KalshiTradingClient();
